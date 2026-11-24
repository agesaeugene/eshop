import { AppError, NotFoundError, ValidationError } from "@packages/error-handler";
import prisma from "@packages/libs/prisma";
import { NextFunction, Response } from "express";
import crypto from "crypto";
import { DELIVERY_FEE_KES } from "@packages/utils/commerce";

const INTASEND_API = "https://api.intasend.com/api/v1";
const PLATFORM_FEE_PERCENT = 10;

const ensureWallet = async (db: any, ownerId: string, ownerType: "user" | "seller") =>
    db.wallets.upsert({
        where: { ownerType_ownerId: { ownerType, ownerId } },
        create: { ownerId, ownerType, currency: "KES" },
        update: {},
    });

const intasendRequest = async (path: string, body: Record<string, unknown>) => {
    const secret = process.env.INTASEND_SECRET_KEY;
    if (!secret) throw new AppError("M-Pesa payments are temporarily unavailable.", 503);
    const response = await fetch(`${INTASEND_API}${path}`, {
        method: "POST",
        signal: AbortSignal.timeout(20_000),
        headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = (data as any)?.detail || (data as any)?.message || "IntaSend request failed";
        const error = new Error(typeof message === "string" ? message : JSON.stringify(message));
        (error as any).statusCode = response.status;
        throw error;
    }
    return data as any;
};

const normalizeKenyanPhone = (value: unknown) => {
    const digits = String(value ?? "").replace(/\D/g, "");
    if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
    if (/^[17]\d{8}$/.test(digits)) return `254${digits}`;
    if (/^254[17]\d{8}$/.test(digits)) return digits;
    return null;
};

const resolveCart = async (cart: any[], couponCode?: string | null) => {
    if (!Array.isArray(cart) || cart.length === 0 || cart.length > 100) {
        throw new ValidationError("Cart is empty or invalid.");
    }
    const requests = cart.map((item) => {
        const quantity = Number(item?.quantity);
        if (typeof item?.id !== "string" || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
            throw new ValidationError("Cart contains an invalid product or quantity.");
        }
        return { id: item.id, quantity, selectedOptions: item.selectedOptions ?? {} };
    });
    if (new Set(requests.map(({ id }) => id)).size !== requests.length) {
        throw new ValidationError("Remove duplicate products from the cart before checking out.");
    }

    const products = await prisma.products.findMany({
        where: { id: { in: requests.map(({ id }) => id) }, isDeleted: false, status: "Active" },
        select: {
            id: true,
            title: true,
            sale_price: true,
            stock: true,
            shopId: true,
            discount_codes: true,
        },
    });
    if (products.length !== requests.length) {
        throw new ValidationError("One or more products are no longer available.");
    }
    const byId = new Map(products.map((product) => [product.id, product]));
    const normalizedCart = requests.map((request) => {
        const product = byId.get(request.id)!;
        if (product.stock < request.quantity) {
            throw new ValidationError(`${product.title} does not have enough stock.`);
        }
        return {
            id: product.id,
            title: product.title,
            quantity: request.quantity,
            sale_price: product.sale_price,
            shopId: product.shopId,
            selectedOptions: request.selectedOptions,
            discount_codes: product.discount_codes,
        };
    });

    let coupon: any = null;
    let discountAmount = 0;
    if (couponCode) {
        const discount = await prisma.discount_codes.findUnique({ where: { discountCode: couponCode } });
        const discountedProduct = discount && normalizedCart.find((item) => item.discount_codes.includes(discount.id));
        if (!discount || !discountedProduct) {
            throw new ValidationError("Coupon code is invalid for products in this cart.");
        }
        if (discount && discountedProduct) {
            const eligibleTotal = discountedProduct.sale_price * discountedProduct.quantity;
            discountAmount = Math.min(
                eligibleTotal,
                discount.discountType.toLowerCase() === "percentage"
                    ? eligibleTotal * discount.discountValue / 100
                    : discount.discountValue
            );
            coupon = {
                code: discount.discountCode,
                discountedProductId: discountedProduct.id,
                discountAmount,
                discountPercent: discount.discountType.toLowerCase() === "percentage" ? discount.discountValue : 0,
            };
        }
    }
    return {
        cart: normalizedCart,
        coupon,
        totalAmount: Math.max(0, normalizedCart.reduce((total, item) => total + item.quantity * item.sale_price, 0) - discountAmount),
    };
};

export const createPaymentSession = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { cart, selectedAddressId, coupon, paymentMethod = "mpesa" } = req.body;
        if (!["mpesa", "wallet"].includes(paymentMethod)) {
            return next(new ValidationError("Choose M-Pesa or wallet payment."));
        }
        if (typeof selectedAddressId !== "string" || !selectedAddressId) {
            return next(new ValidationError("Select a delivery address before checkout."));
        }
        const address = await prisma.address.findFirst({
            where: { id: selectedAddressId, userId: req.user.id },
            select: { id: true },
        });
        if (!address) return next(new ValidationError("Select one of your saved delivery addresses."));
        const resolved = await resolveCart(cart, coupon?.code);
        if (resolved.totalAmount <= 0) return next(new ValidationError("The order total must be greater than zero."));
        const totalAmount = Math.round((resolved.totalAmount + DELIVERY_FEE_KES) * 100) / 100;
        const sessionId = crypto.randomUUID();
        const apiRef = `order-${sessionId}`;
        const paymentAmountMinor = paymentMethod === "mpesa"
            ? Math.ceil(totalAmount) * 100
            : Math.round(totalAmount * 100);
        if (!Number.isSafeInteger(paymentAmountMinor) || paymentAmountMinor > 2_147_483_647) {
            return next(new ValidationError("The checkout total exceeds the supported KES payment limit."));
        }
        const session = await prisma.paymentSessions.create({
            data: {
                sessionId,
                apiRef,
                userId: req.user.id,
                kind: "purchase",
                status: "pending",
                paymentMethod,
                cart: resolved.cart,
                totalAmount,
                deliveryFee: DELIVERY_FEE_KES,
                paymentAmountMinor,
                shippingAddressId: selectedAddressId || null,
                coupon: resolved.coupon ?? undefined,
            },
        });
        return res.status(201).json({
            success: true,
            sessionId: session.sessionId,
            totalAmount: session.totalAmount,
            deliveryFee: session.deliveryFee,
            paymentAmount: session.paymentAmountMinor / 100,
            paymentMethod: session.paymentMethod,
        });
    } catch (error) {
        return next(error);
    }
};

export const verifyCheckoutCoupon = async (req: any, res: Response, next: NextFunction) => {
    try {
        const couponCode = String(req.body.couponCode ?? "").trim();
        if (!couponCode) return next(new ValidationError("Coupon code is required."));
        const { cart } = await resolveCart(req.body.cart);
        const discount = await prisma.discount_codes.findUnique({ where: { discountCode: couponCode } });
        const discountedProduct = discount && cart.find((item) => item.discount_codes.includes(discount.id));
        if (!discount || !discountedProduct) {
            return res.status(200).json({ valid: false, message: "Coupon code is not valid for products in this cart." });
        }
        const eligibleTotal = discountedProduct.sale_price * discountedProduct.quantity;
        const discountAmount = Math.min(
            eligibleTotal,
            discount.discountType.toLowerCase() === "percentage"
                ? eligibleTotal * discount.discountValue / 100
                : discount.discountValue
        );
        return res.status(200).json({
            valid: true,
            discount: discount.discountValue,
            discountType: discount.discountType,
            discountAmount: discountAmount.toFixed(2),
            discountedProductId: discountedProduct.id,
            message: "Coupon applied to an eligible product.",
        });
    } catch (error) {
        return next(error);
    }
};

export const getCheckoutSession = async (req: any, res: Response, next: NextFunction) => {
    try {
        const sessionId = String(req.query.sessionId ?? "");
        const session = await prisma.paymentSessions.findFirst({
            where: { sessionId, userId: req.user.id },
        });
        if (!session) return next(new NotFoundError("Checkout session not found or expired."));
        return res.status(200).json({
            success: true,
            session: {
                sessionId: session.sessionId,
                status: session.status,
                kind: session.kind,
                paymentMethod: session.paymentMethod,
                cart: session.cart,
                totalAmount: session.totalAmount,
                deliveryFee: session.deliveryFee,
                paymentAmount: session.paymentAmountMinor / 100,
                coupon: session.coupon,
            },
        });
    } catch (error) {
        return next(error);
    }
};

const createOrdersAndCreditSellers = async (tx: any, session: any) => {
    const cart = session.cart as any[];
    const buyer = await tx.users.findUnique({
        where: { id: session.userId },
        select: { name: true },
    });
    const grouped = cart.reduce((result: Record<string, any[]>, item) => {
        (result[item.shopId] ??= []).push(item);
        return result;
    }, {});
    const shopEntries = Object.entries(grouped) as [string, any[]][];
    const coupon = session.coupon as any;
    const totalGoodsAfterDiscount = shopEntries.reduce((sum, [, items]) => {
        const shopSubtotal = items.reduce((itemTotal, item) => itemTotal + item.sale_price * item.quantity, 0);
        const shopDiscount = coupon?.discountedProductId
            ? items.reduce((discountTotal, item) => discountTotal + (item.id === coupon.discountedProductId ? coupon.discountAmount : 0), 0)
            : 0;
        return sum + Math.max(0, shopSubtotal - shopDiscount);
    }, 0);
    let deliveryFeeMinorRemaining = Math.round(Number(session.deliveryFee ?? 0) * 100);
    for (const [index, [shopId, items]] of shopEntries.entries()) {
        const shopTotal = items.reduce((sum, item) => sum + item.sale_price * item.quantity, 0);
        const appliedDiscount = coupon?.discountedProductId
            ? items.reduce((sum, item) => sum + (item.id === coupon.discountedProductId ? coupon.discountAmount : 0), 0)
            : 0;
        const goodsTotal = Math.max(0, shopTotal - appliedDiscount);
        const isLastShop = index === shopEntries.length - 1;
        const deliveryFeeMinor = isLastShop || totalGoodsAfterDiscount <= 0
            ? deliveryFeeMinorRemaining
            : Math.min(
                deliveryFeeMinorRemaining,
                Math.round(Number(session.deliveryFee ?? 0) * 100 * goodsTotal / totalGoodsAfterDiscount)
            );
        deliveryFeeMinorRemaining -= deliveryFeeMinor;
        const deliveryFee = deliveryFeeMinor / 100;
        const orderTotal = goodsTotal + deliveryFee;
        const order = await tx.orders.create({
            data: {
                userId: session.userId,
                shopId,
                total: orderTotal,
                deliveryFee,
                status: "paid",
                paymentMethod: session.paymentMethod,
                paymentReference: session.apiRef,
                shippingAddressId: session.shippingAddressId,
                couponCode: coupon?.code ?? null,
                discountAmount: appliedDiscount,
                items: {
                    create: items.map((item) => ({
                        productId: item.id,
                        quantity: item.quantity,
                        price: item.sale_price,
                        selectedOptions: item.selectedOptions,
                    })),
                },
            },
        });
        for (const item of items) {
            const updated = await tx.products.updateMany({
                where: {
                    id: item.id,
                    stock: { gte: item.quantity },
                    isDeleted: false,
                    status: "Active",
                },
                data: { stock: { decrement: item.quantity }, totalSales: { increment: item.quantity } },
            });
            if (!updated.count) throw new ValidationError(`${item.title} ran out of stock during checkout.`);
            await tx.productAnalytics.upsert({
                where: { productId: item.id },
                update: { purchases: { increment: item.quantity } },
                create: {
                    productId: item.id,
                    shopId,
                    purchases: item.quantity,
                },
            });
        }

        const shop = await tx.shops.findUnique({ where: { id: shopId }, select: { sellerId: true } });
        if (!shop) throw new NotFoundError("Shop not found while settling the order.");
        const wallet = await ensureWallet(tx, shop.sellerId, "seller");
        const sellerAmount = Math.floor(orderTotal * (100 - PLATFORM_FEE_PERCENT));
        const isWalletPayment = session.paymentMethod === "wallet";
        const balanceAfter = wallet.balanceMinor + (isWalletPayment ? sellerAmount : 0);
        const pendingAfter = wallet.pendingBalanceMinor + (isWalletPayment ? 0 : sellerAmount);
        await tx.wallets.update({
            where: { id: wallet.id },
            data: isWalletPayment
                ? { balanceMinor: { increment: sellerAmount } }
                : { pendingBalanceMinor: { increment: sellerAmount } },
        });
        await tx.walletTransactions.create({
            data: {
                walletId: wallet.id,
                ownerId: shop.sellerId,
                ownerType: "seller",
                type: isWalletPayment ? "sale_settled" : "sale_pending",
                amountMinor: sellerAmount,
                balanceAfter,
                pendingAfter,
                reference: `sale:${session.sessionId}:${shopId}`,
                paymentSessionId: session.sessionId,
                description: `Seller proceeds pending settlement for order ${session.sessionId}`,
                metadata: {
                    shopId,
                    orderId: order.id,
                    platformFeePercent: PLATFORM_FEE_PERCENT,
                    buyerName: buyer?.name ?? "Customer",
                    products: items.map((item) => ({
                        title: item.title,
                        quantity: item.quantity,
                        unitPrice: item.sale_price,
                    })),
                },
            },
        });
        const firstItem = items[0];
        await tx.notifications.create({
            data: {
                title: "New Order Received",
                message: `A customer just ordered ${firstItem?.title || "products"} from your shop.`,
                userId: session.userId,
                receiverId: shop.sellerId,
                redirect_link: "/dashboard/orders",
            },
        });
    }
};

const releaseClearedSellerFunds = async (tx: any, sessionId: string) => {
    const pendingEntries = await tx.walletTransactions.findMany({
        where: { paymentSessionId: sessionId, type: "sale_pending" },
    });
    for (const entry of pendingEntries) {
        const reference = `settled:${sessionId}:${entry.ownerId}:${entry.walletId}`;
        if (await tx.walletTransactions.findUnique({ where: { reference }, select: { id: true } })) continue;
        const wallet = await tx.wallets.findUnique({ where: { id: entry.walletId } });
        if (!wallet || wallet.pendingBalanceMinor < entry.amountMinor) {
            throw new Error("Seller pending balance is inconsistent with its ledger.");
        }
        await tx.wallets.update({
            where: { id: wallet.id },
            data: {
                balanceMinor: { increment: entry.amountMinor },
                pendingBalanceMinor: { decrement: entry.amountMinor },
            },
        });
        await tx.walletTransactions.create({
            data: {
                walletId: wallet.id,
                ownerId: entry.ownerId,
                ownerType: "seller",
                type: "sale_settled",
                amountMinor: entry.amountMinor,
                balanceAfter: wallet.balanceMinor + entry.amountMinor,
                pendingAfter: wallet.pendingBalanceMinor - entry.amountMinor,
                reference,
                paymentSessionId: sessionId,
                description: `Seller proceeds settled for order ${sessionId}`,
            },
        });
    }
};

const settlePaidSession = async (tx: any, sessionId: string, providerRef: string | null, clearingStatus: string | null) => {
    const session = await tx.paymentSessions.findUnique({ where: { sessionId } });
    if (!session || session.status === "paid") return;
    const claimed = await tx.paymentSessions.updateMany({
        where: { sessionId, status: { not: "paid" } },
        data: { status: "paid", providerRef, clearingStatus, failureReason: null },
    });
    if (!claimed.count) return;

    if (session.kind === "wallet_topup") {
        const wallet = await ensureWallet(tx, session.userId, "user");
        const newBalance = wallet.balanceMinor + session.paymentAmountMinor;
        await tx.wallets.update({
            where: { id: wallet.id },
            data: { balanceMinor: { increment: session.paymentAmountMinor } },
        });
        await tx.walletTransactions.create({
            data: {
                walletId: wallet.id,
                ownerId: session.userId,
                ownerType: "user",
                type: "topup",
                amountMinor: session.paymentAmountMinor,
                balanceAfter: newBalance,
                reference: `topup:${session.sessionId}`,
                paymentSessionId: session.sessionId,
                description: "Wallet funded via M-Pesa",
                metadata: { providerRef },
            },
        });
        return;
    }
    await createOrdersAndCreditSellers(tx, session);
    if (clearingStatus?.toUpperCase() === "AVAILABLE") {
        await releaseClearedSellerFunds(tx, sessionId);
    }
    const user = await tx.users.findUnique({ where: { id: session.userId }, select: { name: true } });
    await tx.notifications.create({
        data: {
            title: "Order Confirmed",
            message: "Your M-Pesa payment was confirmed and your order has been placed.",
            userId: session.userId,
            receiverId: session.userId,
            redirect_link: "/profile?active=My%20Orders",
        },
    });
    await tx.notifications.create({
        data: {
            title: "Platform Order Alert",
            message: `A new IntaSend order was placed by ${user?.name ?? "a customer"}.`,
            userId: session.userId,
            receiverId: "admin",
            redirect_link: "/dashboard/finance",
        },
    });
};

export const startMpesaPayment = async (req: any, res: Response, next: NextFunction) => {
    try {
        const session = await prisma.paymentSessions.findFirst({
            where: { sessionId: String(req.params.sessionId), userId: req.user.id },
        });
        if (!session) return next(new NotFoundError("Checkout session not found."));
        if (session.status === "paid") return res.status(200).json({ success: true, status: "paid" });
        if (session.paymentMethod !== "mpesa" && session.kind === "purchase") {
            return next(new ValidationError("This checkout session is not configured for M-Pesa."));
        }
        if (session.invoiceId && !["failed", "canceled"].includes(session.status)) {
            return res.status(200).json({
                success: true,
                status: session.status,
                invoiceId: session.invoiceId,
                message: "A payment request is already in progress for this checkout.",
            });
        }
        const phoneNumber = normalizeKenyanPhone(req.body.phoneNumber);
        if (!phoneNumber) return next(new ValidationError("Enter a valid Kenyan M-Pesa phone number."));

        const apiRef = session.invoiceId ? `order-${session.sessionId}-${crypto.randomUUID()}` : session.apiRef;
        if (apiRef !== session.apiRef) {
            await prisma.paymentSessions.update({
                where: { id: session.id },
                data: { apiRef, invoiceId: null, status: "pending", failureReason: null },
            });
        }
        if (session.status === "initiating") {
            return res.status(202).json({
                success: true,
                status: "initiating",
                message: session.failureReason || "A payment request is already being checked. Do not start another payment.",
            });
        }
        const claimed = await prisma.paymentSessions.updateMany({
            where: { id: session.id, status: { in: ["pending", "failed", "canceled"] } },
            data: { status: "initiating", failureReason: null },
        });
        if (!claimed.count) {
            const latest = await prisma.paymentSessions.findUnique({ where: { id: session.id } });
            return res.status(202).json({
                success: true,
                status: latest?.status ?? "initiating",
                message: latest?.failureReason || "A payment request is already being checked. Do not start another payment.",
            });
        }
        let response: any;
        try {
            response = await intasendRequest("/payment/mpesa-stk-push/", {
                amount: session.paymentAmountMinor / 100,
                phone_number: phoneNumber,
                api_ref: apiRef,
            });
        } catch (error: any) {
            if ((error.statusCode && error.statusCode < 500) || error.statusCode === 503) {
                await prisma.paymentSessions.updateMany({
                    where: { id: session.id, status: "initiating" },
                    data: { status: "failed", failureReason: error.message },
                });
                return next(error);
            }
            const message = "We could not confirm whether IntaSend received the request. Check your M-Pesa messages and keep this page open; do not start another payment.";
            await prisma.paymentSessions.updateMany({
                where: { id: session.id, status: "initiating" },
                data: { failureReason: message },
            });
            return res.status(202).json({ success: true, status: "initiating", message });
        }
        const invoiceId = response.invoice?.invoice_id;
        if (!invoiceId) {
            const message = "IntaSend did not confirm the payment request. Check your M-Pesa messages and keep this page open; do not start another payment.";
            await prisma.paymentSessions.updateMany({
                where: { id: session.id, status: "initiating" },
                data: { failureReason: message },
            });
            return res.status(202).json({ success: true, status: "initiating", message });
        }
        const status = response.invoice.state?.toLowerCase() ?? "processing";
        const updatedStatus = await prisma.paymentSessions.updateMany({
            where: { id: session.id, status: "initiating" },
            data: { invoiceId, status },
        });
        if (!updatedStatus.count) {
            await prisma.paymentSessions.update({
                where: { id: session.id },
                data: { invoiceId },
            });
        }
        return res.status(200).json({
            success: true,
            status: response.invoice.state?.toLowerCase() ?? "processing",
            invoiceId,
        });
    } catch (error: any) {
        return next(error);
    }
};

export const payWithWallet = async (req: any, res: Response, next: NextFunction) => {
    try {
        const session = await prisma.paymentSessions.findFirst({
            where: { sessionId: String(req.params.sessionId), userId: req.user.id, kind: "purchase" },
        });
        if (!session) return next(new NotFoundError("Checkout session not found."));
        if (session.status === "paid") return res.status(200).json({ success: true, status: "paid" });
        if (session.paymentMethod !== "wallet") {
            return next(new ValidationError("This checkout session is not configured for wallet payment."));
        }
        const wallet = await ensureWallet(prisma, req.user.id, "user");
        if (wallet.balanceMinor < session.paymentAmountMinor) {
            return next(new ValidationError("Your wallet balance is not enough to pay for this order."));
        }
        await prisma.$transaction(async (tx) => {
            const claimed = await tx.paymentSessions.updateMany({
                where: { sessionId: session.sessionId, status: { not: "paid" } },
                data: { status: "paid", paymentMethod: "wallet" },
            });
            if (!claimed.count) return;
            const debit = await tx.wallets.updateMany({
                where: { id: wallet.id, balanceMinor: { gte: session.paymentAmountMinor } },
                data: { balanceMinor: { decrement: session.paymentAmountMinor } },
            });
            if (!debit.count) throw new ValidationError("Your wallet balance changed; refresh and try again.");
            const debitedWallet = await tx.wallets.findUniqueOrThrow({
                where: { id: wallet.id },
                select: { balanceMinor: true },
            });
            await tx.walletTransactions.create({
                data: {
                    walletId: wallet.id,
                    ownerId: req.user.id,
                    ownerType: "user",
                    type: "purchase",
                    amountMinor: -session.paymentAmountMinor,
                    balanceAfter: debitedWallet.balanceMinor,
                    reference: `purchase:${session.sessionId}`,
                    paymentSessionId: session.sessionId,
                    description: "Wallet payment for order",
                },
            });
            await createOrdersAndCreditSellers(tx, { ...session, paymentMethod: "wallet" });
            const user = await tx.users.findUnique({ where: { id: session.userId }, select: { name: true } });
            await tx.notifications.create({
                data: {
                    title: "Order Confirmed",
                    message: "Your wallet payment was confirmed and your order has been placed.",
                    userId: session.userId,
                    receiverId: session.userId,
                    redirect_link: "/profile?active=My%20Orders",
                },
            });
            await tx.notifications.create({
                data: {
                    title: "Platform Order Alert",
                    message: `A new wallet order was placed by ${user?.name ?? "a customer"}.`,
                    userId: session.userId,
                    receiverId: "admin",
                    redirect_link: "/dashboard/finance",
                },
            });
        });
        return res.status(200).json({ success: true, status: "paid" });
    } catch (error) {
        return next(error);
    }
};

export const intasendWebhook = async (req: any, res: Response, next: NextFunction) => {
    try {
        const expected = process.env.INTASEND_WEBHOOK_CHALLENGE;
        const supplied = req.body?.challenge;
        if (!expected || typeof supplied !== "string") {
            return res.status(401).json({ message: "Webhook challenge is not configured or missing." });
        }
        const expectedBuffer = Buffer.from(expected);
        const suppliedBuffer = Buffer.from(supplied);
        if (expectedBuffer.length !== suppliedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)) {
            return res.status(401).json({ message: "Invalid webhook challenge." });
        }
        const payload = req.body;
        if (payload.topic === "collection_event") {
            if (!payload.api_ref || !payload.invoice_id) return res.status(200).json({ received: true });
            const session = await prisma.paymentSessions.findUnique({ where: { apiRef: payload.api_ref } });
            if (!session || (session.invoiceId && session.invoiceId !== payload.invoice_id)) {
                return res.status(200).json({ received: true });
            }
            const receivedAmountMinor = Math.round(Number(payload.value) * 100);
            if (String(payload.currency || "KES").toUpperCase() !== "KES" || receivedAmountMinor < session.paymentAmountMinor) {
                await prisma.paymentSessions.updateMany({
                    where: { id: session.id, status: { not: "paid" } },
                    data: { status: "failed", failureReason: "Payment amount or currency did not match checkout." },
                });
                return res.status(200).json({ received: true });
            }
            const state = String(payload.state ?? "").toUpperCase();
            if (state === "COMPLETE") {
                await prisma.$transaction(async (tx) => {
                    await settlePaidSession(
                        tx,
                        session.sessionId,
                        payload.mpesa_reference || payload.provider_ref || null,
                        payload.clearing_status || null
                    );
                    if (payload.clearing_status?.toUpperCase() === "AVAILABLE") {
                        await releaseClearedSellerFunds(tx, session.sessionId);
                    }
                    await tx.paymentSessions.updateMany({
                        where: { sessionId: session.sessionId, status: "paid" },
                        data: {
                            clearingStatus: payload.clearing_status || session.clearingStatus,
                            providerRef: payload.mpesa_reference || payload.provider_ref || session.providerRef,
                        },
                    });
                });
            } else if (["FAILED", "CANCELED"].includes(state) && session.status !== "paid") {
                await prisma.paymentSessions.updateMany({
                    where: { id: session.id, status: { not: "paid" } },
                    data: { status: state.toLowerCase(), failureReason: payload.failed_reason || `Payment ${state.toLowerCase()}` },
                });
            } else if (["PENDING", "PROCESSING", "RETRY", "PARTIAL"].includes(state) && session.status !== "paid") {
                await prisma.paymentSessions.updateMany({
                    where: { id: session.id, status: { not: "paid" } },
                    data: { status: state.toLowerCase() },
                });
            }
        } else if (payload.topic === "send_money_event") {
            const reference = payload.batch_reference || payload.reference;
            if (reference) await processPayoutWebhook(reference, payload);
        }
        return res.status(200).json({ received: true });
    } catch (error) {
        return next(error);
    }
};

export const getWallet = async (req: any, res: Response, next: NextFunction) => {
    try {
        const ownerType = req.role === "seller" ? "seller" : "user";
        const wallet = await ensureWallet(prisma, req.user.id, ownerType);
        const seller = ownerType === "seller"
            ? await prisma.sellers.findUnique({
                where: { id: req.user.id },
                select: { mpesa_number: true },
            })
            : null;
        const transactions = await prisma.walletTransactions.findMany({
            where: { walletId: wallet.id },
            orderBy: { createdAt: "desc" },
            take: 100,
        });
        const withdrawals = ownerType === "seller"
            ? await prisma.withdrawalRequests.findMany({
                where: { sellerId: req.user.id },
                orderBy: { createdAt: "desc" },
                take: 50,
            })
            : [];
        return res.status(200).json({
            success: true,
            wallet: {
                id: wallet.id,
                currency: wallet.currency,
                balance: wallet.balanceMinor / 100,
                pendingBalance: wallet.pendingBalanceMinor / 100,
                payoutPhoneNumber: seller?.mpesa_number ?? null,
            },
            transactions: transactions.map((item: any) => ({ ...item, amount: item.amountMinor / 100, balance: item.balanceAfter / 100, pendingBalance: item.pendingAfter / 100 })),
            withdrawals: withdrawals.map((item: any) => ({ ...item, amount: item.amountMinor / 100 })),
        });
    } catch (error) {
        return next(error);
    }
};

export const startWalletTopup = async (req: any, res: Response, next: NextFunction) => {
    try {
        const amount = Number(req.body.amount);
        const amountMinor = Math.round(amount * 100);
        if (!Number.isInteger(amount) || amountMinor < 100 || amountMinor > 10_000_000) {
            return next(new ValidationError("Top up must be a whole amount between KES 1 and KES 100,000."));
        }
        const phoneNumber = normalizeKenyanPhone(req.body.phoneNumber);
        if (!phoneNumber) return next(new ValidationError("Enter a valid Kenyan M-Pesa phone number."));
        const sessionId = crypto.randomUUID();
        const session = await prisma.paymentSessions.create({
            data: {
                sessionId,
                apiRef: `topup-${sessionId}`,
                userId: req.user.id,
                kind: "wallet_topup",
                status: "initiating",
                paymentMethod: "mpesa",
                cart: [],
                totalAmount: amount,
                paymentAmountMinor: Math.ceil(amount) * 100,
            },
        });
        let response: any;
        try {
            response = await intasendRequest("/payment/mpesa-stk-push/", {
                amount: session.paymentAmountMinor / 100,
                phone_number: phoneNumber,
                api_ref: session.apiRef,
            });
        } catch (error: any) {
            if (error.statusCode && error.statusCode < 500) {
                await prisma.paymentSessions.update({
                    where: { id: session.id },
                    data: { status: "failed", failureReason: error.message },
                });
                return next(error);
            }
            return res.status(202).json({
                success: true,
                sessionId,
                status: "initiating",
                amount: session.paymentAmountMinor / 100,
            });
        }
        const invoiceId = response.invoice?.invoice_id;
        if (!invoiceId) throw new Error("IntaSend did not return a payment invoice ID.");
        const status = response.invoice.state?.toLowerCase() ?? "processing";
        const updatedStatus = await prisma.paymentSessions.updateMany({
            where: { id: session.id, status: "initiating" },
            data: { invoiceId, status },
        });
        if (!updatedStatus.count) {
            await prisma.paymentSessions.update({
                where: { id: session.id },
                data: { invoiceId },
            });
        }
        return res.status(201).json({
            success: true,
            sessionId,
            invoiceId,
            status: response.invoice.state?.toLowerCase() ?? "processing",
            amount: session.paymentAmountMinor / 100,
        });
    } catch (error) {
        return next(error);
    }
};

export const createSellerWithdrawal = async (req: any, res: Response, next: NextFunction) => {
    try {
        const amount = Number(req.body.amount);
        const amountMinor = Math.round(amount * 100);
        if (!Number.isInteger(amount) || !Number.isSafeInteger(amountMinor) || amountMinor < 1000 || amountMinor > 2_147_483_647) {
            return next(new ValidationError("M-Pesa withdrawals must be a whole amount of at least KES 10."));
        }
        const phoneNumber = normalizeKenyanPhone(req.seller.mpesa_number);
        if (!phoneNumber) {
            return next(new ValidationError("Add a valid M-Pesa payout number in your seller account settings before requesting a withdrawal."));
        }

        const created = await prisma.$transaction(async (tx) => {
            const wallet = await ensureWallet(tx, req.seller.id, "seller");
            const debit = await tx.wallets.updateMany({
                where: { id: wallet.id, balanceMinor: { gte: amountMinor } },
                data: { balanceMinor: { decrement: amountMinor } },
            });
            if (!debit.count) throw new ValidationError("Available seller balance is too low for this withdrawal.");
            const reference = `withdraw-${crypto.randomUUID()}`;
            const request = await tx.withdrawalRequests.create({
                data: {
                    sellerId: req.seller.id,
                    walletId: wallet.id,
                    amountMinor,
                    phoneNumber,
                    reference,
                },
            });
            await tx.walletTransactions.create({
                data: {
                    walletId: wallet.id,
                    ownerId: req.seller.id,
                    ownerType: "seller",
                    type: "withdrawal_hold",
                    amountMinor: -amountMinor,
                    balanceAfter: wallet.balanceMinor - amountMinor,
                    pendingAfter: wallet.pendingBalanceMinor,
                    status: "pending",
                    reference: `withdrawal-hold:${reference}`,
                    description: "Funds reserved for administrator-reviewed withdrawal",
                    metadata: { withdrawalId: request.id },
                },
            });
            return request;
        });
        return res.status(201).json({ success: true, request: { ...created, amount: created.amountMinor / 100 } });
    } catch (error) {
        return next(error);
    }
};

const processPayoutWebhook = async (reference: string, payload: any) => {
    const request = await prisma.withdrawalRequests.findUnique({ where: { reference } });
    const payoutState = String(payload.status ?? payload.state ?? "").toLowerCase();
    if (!request || !["complete", "completed", "success", "failed", "rejected"].includes(payoutState)) return;
    const completed = ["complete", "completed", "success"].includes(payoutState);
    await prisma.$transaction(async (tx) => {
        const changed = await tx.withdrawalRequests.updateMany({
            where: { id: request.id, status: "processing" },
            data: {
                status: completed ? "paid" : "failed",
                providerTransactionId: payload.transactions?.[0]?.transaction_id || payload.transactions?.[0]?.transaction_code || null,
                failureReason: completed ? null : payload.failed_reason || "IntaSend payout failed",
            },
        });
        if (!changed.count || completed) return;
        const wallet = await tx.wallets.findUnique({ where: { id: request.walletId } });
        if (!wallet) throw new Error("Wallet for failed withdrawal not found.");
        const newBalance = wallet.balanceMinor + request.amountMinor;
        await tx.wallets.update({ where: { id: wallet.id }, data: { balanceMinor: { increment: request.amountMinor } } });
        await tx.walletTransactions.create({
            data: {
                walletId: wallet.id,
                ownerId: request.sellerId,
                ownerType: "seller",
                type: "withdrawal_refund",
                amountMinor: request.amountMinor,
                balanceAfter: newBalance,
                pendingAfter: wallet.pendingBalanceMinor,
                reference: `withdrawal-refund:${request.reference}`,
                description: "Withdrawal refunded after IntaSend payout failure",
                metadata: { withdrawalId: request.id },
            },
        });
    });
};

export const getAdminFinance = async (_req: any, res: Response, next: NextFunction) => {
    try {
        const [transactions, withdrawals, payments] = await Promise.all([
            prisma.walletTransactions.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
            prisma.withdrawalRequests.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
            prisma.paymentSessions.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
        ]);
        const sellerIds = [...new Set([
            ...transactions.filter((entry) => entry.ownerType === "seller").map((entry) => entry.ownerId),
            ...withdrawals.map((entry) => entry.sellerId),
        ])];
        const userIds = [...new Set([
            ...transactions.filter((entry) => entry.ownerType === "user").map((entry) => entry.ownerId),
            ...payments.map((payment) => payment.userId),
        ])];
        const [sellers, users, orders] = await Promise.all([
            prisma.sellers.findMany({ where: { id: { in: sellerIds } }, select: { id: true, name: true, email: true } }),
            prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }),
            prisma.orders.findMany({
                where: { paymentReference: { in: payments.map((payment) => payment.apiRef) } },
                select: {
                    id: true,
                    paymentReference: true,
                    status: true,
                    shop: { select: { name: true } },
                },
            }),
        ]);
        const owners = new Map([...sellers, ...users].map((owner: any) => [owner.id, owner]));
        const ordersByPayment = new Map(orders.map((order) => [order.paymentReference, order]));
        return res.status(200).json({
            success: true,
            transactions: transactions.map((entry) => ({
                ...entry,
                amount: entry.amountMinor / 100,
                balance: entry.balanceAfter / 100,
                owner: owners.get(entry.ownerId) ?? null,
            })),
            withdrawals: withdrawals.map((request) => ({
                ...request,
                amount: request.amountMinor / 100,
                seller: owners.get(request.sellerId) ?? null,
            })),
            payments: payments.map((payment) => ({
                ...payment,
                amount: payment.paymentAmountMinor / 100,
                totalAmount: payment.totalAmount,
                buyer: owners.get(payment.userId) ?? null,
                order: ordersByPayment.get(payment.apiRef) ?? null,
            })),
        });
    } catch (error) {
        return next(error);
    }
};

export const reviewSellerWithdrawal = async (req: any, res: Response, next: NextFunction) => {
    try {
        const request = await prisma.withdrawalRequests.findUnique({ where: { id: req.params.id } });
        if (!request) return next(new NotFoundError("Withdrawal request not found."));
        if (request.status !== "pending") return next(new ValidationError("This withdrawal request has already been reviewed."));
        const action = req.body.action;
        if (!["approve", "reject"].includes(action)) return next(new ValidationError("Choose approve or reject."));

        if (action === "reject") {
            await prisma.$transaction(async (tx) => {
                const changed = await tx.withdrawalRequests.updateMany({
                    where: { id: request.id, status: "pending" },
                    data: { status: "rejected", approvedBy: req.admin.id, failureReason: String(req.body.reason || "Rejected by administrator") },
                });
                if (!changed.count) throw new ValidationError("This withdrawal request has already been reviewed.");
                const wallet = await tx.wallets.findUnique({ where: { id: request.walletId } });
                if (!wallet) throw new Error("Wallet for withdrawal request not found.");
                const balance = wallet.balanceMinor + request.amountMinor;
                await tx.wallets.update({ where: { id: wallet.id }, data: { balanceMinor: { increment: request.amountMinor } } });
                await tx.walletTransactions.create({
                    data: {
                        walletId: wallet.id,
                        ownerId: request.sellerId,
                        ownerType: "seller",
                        type: "withdrawal_refund",
                        amountMinor: request.amountMinor,
                        balanceAfter: balance,
                        pendingAfter: wallet.pendingBalanceMinor,
                        reference: `withdrawal-refund:${request.reference}`,
                        description: "Withdrawal request rejected and funds returned",
                        metadata: { withdrawalId: request.id },
                    },
                });
            });
            return res.status(200).json({ success: true, status: "rejected" });
        }

        const claimed = await prisma.withdrawalRequests.updateMany({
            where: { id: request.id, status: "pending" },
            data: { status: "processing", approvedBy: req.admin.id },
        });
        if (!claimed.count) return next(new ValidationError("This withdrawal request has already been reviewed."));
        try {
            const response = await intasendRequest("/send-money/initiate/", {
                currency: "KES",
                provider: "MPESA-B2C",
                requires_approval: "NO",
                batch_reference: request.reference,
                transactions: [{
                    name: "Seller withdrawal",
                    account: request.phoneNumber,
                    amount: String(request.amountMinor / 100),
                    narrative: `Seller withdrawal ${request.reference}`.slice(0, 20),
                    idempotency_key: request.reference,
                }],
            });
            await prisma.withdrawalRequests.update({
                where: { id: request.id },
                data: { providerTrackingId: response.tracking_id || null },
            });
            return res.status(200).json({ success: true, status: "processing", trackingId: response.tracking_id });
        } catch (error: any) {
            if (error.statusCode && error.statusCode < 500) {
                await prisma.withdrawalRequests.updateMany({
                    where: { id: request.id, status: "processing" },
                    data: {
                        status: "pending",
                        approvedBy: null,
                        failureReason: error.message || "IntaSend rejected payout initiation",
                    },
                });
            } else {
                await prisma.withdrawalRequests.updateMany({
                    where: { id: request.id, status: "processing" },
                    data: { failureReason: error.message || "Payout initiation status is unknown; reconcile with IntaSend before retrying." },
                });
            }
            return next(error);
        }
    } catch (error) {
        return next(error);
    }
};

export const getWalletPaymentStatus = async (req: any, res: Response, next: NextFunction) => {
    try {
        let session = await prisma.paymentSessions.findFirst({
            where: { sessionId: String(req.query.sessionId), userId: req.user.id },
            select: {
                id: true,
                sessionId: true,
                apiRef: true,
                invoiceId: true,
                kind: true,
                status: true,
                failureReason: true,
                paymentAmountMinor: true,
                paymentMethod: true,
                providerRef: true,
                clearingStatus: true,
            },
        });
        if (!session) return next(new NotFoundError("Payment session not found."));
        let statusCheckWarning: string | undefined;
        if (
            session.paymentMethod === "mpesa" &&
            session.invoiceId &&
            !["paid", "failed", "canceled"].includes(session.status)
        ) {
            try {
                const response = await intasendRequest("/payment/status/", { invoice_id: session.invoiceId });
                const invoice = response.invoice ?? response;
                const state = String(invoice.state ?? invoice.status ?? "").toUpperCase();
                if (
                    invoice.invoice_id &&
                    invoice.invoice_id !== session.invoiceId
                ) {
                    throw new Error("IntaSend returned a status for a different payment invoice.");
                }
                if (invoice.api_ref && invoice.api_ref !== session.apiRef) {
                    throw new Error("IntaSend returned a status for a different checkout reference.");
                }
                if (state === "COMPLETE") {
                    const receivedAmountMinor = Math.round(Number(invoice.value) * 100);
                    if (
                        !Number.isFinite(receivedAmountMinor) ||
                        receivedAmountMinor < session.paymentAmountMinor ||
                        String(invoice.currency ?? "KES").toUpperCase() !== "KES"
                    ) {
                        throw new Error("IntaSend payment amount or currency did not match checkout.");
                    }
                    const providerRef = invoice.mpesa_reference || invoice.provider_ref || session.providerRef;
                    const clearingStatus = invoice.clearing_status || session.clearingStatus;
                    await prisma.$transaction(async (tx) => {
                        await settlePaidSession(tx, session!.sessionId, providerRef, clearingStatus);
                    });
                } else if (["FAILED", "CANCELED"].includes(state)) {
                    await prisma.paymentSessions.updateMany({
                        where: { id: session.id, status: { not: "paid" } },
                        data: {
                            status: state.toLowerCase(),
                            failureReason: invoice.failed_reason || `Payment ${state.toLowerCase()}`,
                        },
                    });
                } else if (["PENDING", "PROCESSING", "RETRY", "PARTIAL"].includes(state)) {
                    await prisma.paymentSessions.updateMany({
                        where: { id: session.id, status: { not: "paid" } },
                        data: { status: state.toLowerCase() },
                    });
                }
                session = await prisma.paymentSessions.findUniqueOrThrow({
                    where: { id: session.id },
                    select: {
                        id: true,
                        sessionId: true,
                        apiRef: true,
                        invoiceId: true,
                        kind: true,
                        status: true,
                        failureReason: true,
                        paymentAmountMinor: true,
                        paymentMethod: true,
                        providerRef: true,
                        clearingStatus: true,
                    },
                });
            } catch (error) {
                statusCheckWarning = "Payment status could not be refreshed from IntaSend. We will continue checking for confirmation.";
                console.error("Could not reconcile IntaSend payment status:", error);
            }
        }
        return res.status(200).json({
            success: true,
            sessionId: session.sessionId,
            kind: session.kind,
            status: session.status,
            failureReason: session.failureReason,
            amount: session.paymentAmountMinor / 100,
            statusCheckWarning,
        });
    } catch (error) {
        return next(error);
    }
};
