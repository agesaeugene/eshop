import { NextFunction, Request, Response } from "express";
import Stripe from "stripe";
import { NotFoundError, ValidationError } from "@packages/error-handler"; 
import { Prisma } from "@prisma/client";
import prisma from "@packages/libs/prisma";
import Redis from "@packages/libs/redis";
import crypto from "crypto"
import { sendEmail } from "../utils/send-email";


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const DELIVERY_STATUSES = ["Ordered", "Packed", "Shipped", "Out for Delivery", "Delivered"];

// create payment intent

export const createPaymentIntent = async (
    req: any,
    res: Response,
    next: NextFunction
) => {
    const { amount, sellerStripeAccount, sessionId } = req.body;

    const customerAmount = Math.round(amount * 100);
    const platformFee = Math.floor(customerAmount * 0.1);

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: customerAmount,
            currency: "kes",
            payment_method_types: ["card"],
            application_fee_amount: platformFee,

            transfer_data: {
                destination: sellerStripeAccount,
            },

            metadata: {
                sessionId,
                userId: req.user.id,
            },
        });

        res.send({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error) {
        next(error);
    }
};

// create payment session
export const createPaymentSession = async (
    req: any,
    res: Response,
    next: NextFunction
) => {
    try {
        const { cart, selectedAddressId, coupon } = req.body;
        const userId = req.user.id;

        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            return next(new ValidationError("Cart is empty or invalid."));
        }

        const normalizedCart = JSON.stringify(
            cart.map((item: any) => ({
                id: item.id,
                quantity: item.quantity,
                sale_price: item.sale_price,
                shopId: item.shopId,
                selectedOptions: item.selectedOptions || {},
            })).sort((a: any, b: any) => a.id.localeCompare(b.id))
        );

        const keys = await Redis.keys("payment-session:*");
        for (const key of keys){
            const data = await Redis.get(key);
            if(data){
                const sessions = JSON.parse(data);
                if(sessions.userId === userId){
                    const existingCart = JSON.stringify(
                        sessions.cart.map((item:any) => ({
                            id: item.id,
                            quantity: item.quantity,
                            sale_price: item.sale_price,
                            shopId: item.shopId,
                            selectedOptions: item.selectedOptions || {},
                        }))
                        .sort((a: any, b: any) => a.id.localeCompare(b.id))
                    );
                    if (existingCart === normalizedCart) {
                        return res.status(200).json({ sessionId: key.split(":")[1] });
                    } else {
                        await Redis.del(key);
                    }
                }
            }
        }

        // fetching sellers and their stripe accounts
        const uniqueShopIds = [...new Set(cart.map((item: any) => item.shopId))] as string[];

        const shops = await prisma.shops.findMany({
            where: {
                id: {in: uniqueShopIds}
            },
            select: {
                id: true,
                sellerId: true,
                seller: {
                    select: {
                        stripeId: true,
                    },
                },
            },
        });

        const sellerData = shops.map((shop) => ({
            shopId: shop.id,
            sellerId: shop.sellerId,
            stripeAccountId: shop.seller?.stripeId,
        }))

        // calculate total
        const totalAmount = cart.reduce((total: number, item: any) => {
            return total + item.quantity * item.sale_price;
        }, 0);

        // create session payload
        const sessionId = crypto.randomUUID();

        const sessionData = {
            userId,
            cart,
            sellers: sellerData,
            totalAmount,
            shippingAddressId: selectedAddressId || null,
            coupon: coupon || null,
        };

        await Redis.setex(
            `payment-session:${sessionId}`,
            600, //10 minutes
            JSON.stringify(sessionData)
        );

        return res.status(201).json({ sessionId });

    } catch (error) {
        next(error);
    }
}

// verify payment session
export const verifyingPaymentSession = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const sessionId = req.query.sessionId as string;
        if (!sessionId) {
            return res.status(400).json({ error: "session ID is required."} );
        }

        // Fetch session from Redis
        const sessionKey = `payment-session:${sessionId}`;
        const sessionData = await Redis.get(sessionKey);

        if (!sessionData) {
            return res.status(404).json({ error: "Session not found or expired."});
        }

        // Parse amd return session
        const session = JSON.parse(sessionData);

        return res.status(200).json({
            success: true,
            session,
        });
    } catch (error) {
        return next(error);

    }

};

// create order
export const createOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const stripeSignature = req.headers["stripe-signature"];
        if (!stripeSignature) {
            return res.status(400).send("Missing Stripe signature")
        }

        const rawBody = (req as any).rawBody;

        let event;
        try {
            event = stripe.webhooks.constructEvent(
                rawBody,
                stripeSignature,
                process.env.STRIPE_WEBHOOK_SECRET!
            );
        } catch (err: any) {
            console.error("webhook signature verification faiiled.", err.message);
            return res.status(400).send(`webhook Error: ${err.message}`);
        }

        if (event.type === "payment_intent.succeeded") {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            const sessionId = paymentIntent.metadata.sessionId;
            const userId = paymentIntent.metadata.userId;

            const sessionKey = `payment-session:${sessionId}`;
            const sessionData = await Redis.get(sessionKey);

            if (!sessionData) {
                console.warn("Session data expired or missing for", sessionId);
                return res.status(200).send("No session found, skipping order creation");
            }
        
        const { cart, totalAmount, shippingAddressId, coupon } = 
        JSON.parse(sessionData);

        const user = await prisma.users.findUnique({ where: { id: userId }});
        const name = user?.name!;
        const email = user?.email!;

        const shopGrouped = cart.reduce((acc: any, item: any) => {
            if (!acc[item.shopId]) acc[item.shopId] = [];
            acc[item.shopId].push(item);
            return acc;
        }, {});

        for (const shopId in  shopGrouped) {
            const orderItems = shopGrouped[shopId];

            let orderTotal = orderItems.reduce(
                (sum: number, p: any) => sum + p.quantity * p.sale_price,
                0
            );
            // Apply discount if applicable
            if (
                coupon &&
                coupon.discountedProductId &&
                orderItems.some((item: any) => item.id === coupon.discountedProductId)
            ) {
                const discountedItem = orderItems.find(
                    (items: any) => items.id === coupon.discountedProductId
                );
                if (discountedItem) {
                    const discount =
                    coupon.discountPercent > 0
                    ? (discountedItem.sale_price * 
                        discountedItem.quantity * 
                        coupon.discountPercent) /
                        100
                        : coupon.discountAmount;

                        orderTotal -= discount;
                }
            }
            // Create order
            await prisma.orders.create({
                data: {
                    userId,
                    shopId,
                    total: orderTotal,
                    status: "paid",
                    shippingAddressId: shippingAddressId || null,
                    couponCode: coupon?.code || null,
                    discountAmount: coupon?.discountAmount || 0,
                    items: {
                        create: orderItems.map((item: any) => ({
                            productId: item.id,
                            quantity: item.quantity,
                            price: item.sale_price,
                            selectedOptions: item.selectedOptions,
                        })),
                    }
                }
            });

            // Update Product & analytics
            for (const item of orderItems) {
                const { id: productId, quantity} = item;

                await prisma.products.update({
                    where: { id: productId },
                    data: {
                        stock: { decrement: quantity },
                        totalSales: { increment: quantity}
                    },
                });

                await prisma.productAnalytics.upsert({
                    where: { productId },
                    create: {
                        productId,
                        shopId,
                        purchases: quantity,
                        lastViewedAt: new Date(),
                    },
                    update: {
                        purchases: { increment: quantity },
                    },
                });

                const existingAnalytics = await prisma.userAnalytics.findUnique({
                    where: { userId },
                });

                const newAction = {
                    productId,
                    shopId,
                    action: "purchase",
                    timeStamp: Date.now(),
                };

                const currentActions = Array.isArray(existingAnalytics?.actions)
                ? (existingAnalytics.actions as Prisma.JsonArray)
                : [];

                if (existingAnalytics) {
                    await prisma.userAnalytics.update({
                        where: { userId },
                        data: {
                            lastVisited: new Date(),
                            actions: [...currentActions, newAction],
                        },
                    })
                } else {
                    await prisma.userAnalytics.create({
                        data: {
                            userId,
                            lastVisited: new Date(),
                            actions: [newAction],
                        },
                    });
                }
            }

            // send email for user
            await sendEmail(
                email,
                "Your Sokojamo Order Confirmtion",
                "order-confirmation",
                {
                    name,
                    cart,
                    totalAmount: coupon?.discountAmount
                    ? totalAmount - coupon?.discountAmount
                    : totalAmount,

                    trackingUrl: `https://jokojamo.com//order/${sessionId}`,
                }
            )

                        // Notify the seller of this shop
            const shop = await prisma.shops.findUnique({
                where: { id: shopId },
                select: { sellerId: true },
            });

            if (shop) {
                const firstProduct = orderItems[0];
                const productTitle = firstProduct?.title || "new item";

                await prisma.notifications.create({
                    data: {
                        title: "New Order Received",
                        message: `A customer just ordered ${productTitle} from your shop.`,
                        userId,
                        receiverId: shop.sellerId,
                        redirect_link: `https://sokojamo.com/order/${sessionId}`,
                    },
                });
            }
        } // end of: for (const shopId in shopGrouped)

        // Notify the admin (once per payment, not once per shop)
        await prisma.notifications.create({
            data: {
                title: "Platform Order Alert",
                message: `A new order was placed by ${name}.`,
                userId,
                receiverId: "admin",
                redirect_link: `https://sokojamo.com/order/${sessionId}`,
            },
        });

        await Redis.del(sessionKey);
        }

        res.status(200).json({ received: true });
    } catch (error) {
        next(error);
    }
};

// get seller orders
export const getSellerOrders = async (req: any, res: Response, next: NextFunction) => {
    try {
        const shop = await prisma.shops.findUnique({
            where: { sellerId: req.seller.id },
        });

        const orders = await prisma.orders.findMany({
            where: { shopId: shop?.id },
            include: {
                user: {
                    select: { id: true, name: true, email: true, avatar: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        res.status(200).json({ success: true, orders });
    } catch (error) {
        next(error);
    }
};

// get order details
export const getOrderDetails = async (req: any, res: Response, next: NextFunction) => {
    try {
        const orderId = req.params.id;

        const order = await prisma.orders.findUnique({
            where: { id: orderId },
            include: { items: true },
        });

        if (!order) {
            return next(new NotFoundError("Order not found with the id!"));
        }

        const shippingAddress = order.shippingAddressId
            ? await prisma.address.findUnique({ where: { id: order.shippingAddressId } })
            : null;

        const coupon = order.couponCode
            ? await prisma.discount_codes.findUnique({
                  where: { discountCode: order.couponCode },
              })
            : null;

        // fetch all product details in one go
        const productIds = order.items.map((item) => item.productId);

        const products = await prisma.products.findMany({
            where: { id: { in: productIds } },
            select: { id: true, title: true, images: true },
        });

        const productMap = new Map(products.map((p) => [p.id, p]));

        const items = order.items.map((item) => ({
            ...item,
            selectedOptions: item.selectedOptions,
            product: productMap.get(item.productId) || null,
        }));

        res.status(200).json({
            success: true,
            order: {
                ...order,
                items,
                shippingAddress,
                couponCode: coupon, // UI reads discountType / discountValue / public_name
            },
        });
    } catch (error) {
        next(error);
    }
};

// update delivery status
export const updateDeliveryStatus = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { orderId } = req.params;
        const { deliveryStatus } = req.body;

        if (!deliveryStatus || !DELIVERY_STATUSES.includes(deliveryStatus)) {
            return next(new ValidationError("Invalid delivery status."));
        }

        const order = await prisma.orders.findUnique({ where: { id: orderId } });
        if (!order) {
            return next(new NotFoundError("Order not found with the id!"));
        }

        const updatedOrder = await prisma.orders.update({
            where: { id: orderId },
            data: { deliveryStatus },
        });

        res.status(200).json({ success: true, order: updatedOrder });
    } catch (error) {
        next(error);
    }
};
export const getDashboardStats = async (req: any, res: Response, next: NextFunction) => {
    try {
        const shop = await prisma.shops.findUnique({
            where: { sellerId: req.seller.id },
        });

        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        const shopId = shop.id;

        // 1. Revenue Data (Last 6 Months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const orders = await prisma.orders.findMany({
            where: {
                shopId,
                createdAt: { gte: sixMonthsAgo },
                status: "paid",
            },
            select: {
                total: true,
                createdAt: true,
            },
            orderBy: { createdAt: "asc" },
        });

        const revenueByMonth: Record<string, number> = {};
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setDate(1);
            d.setMonth(d.getMonth() - i);
            revenueByMonth[monthNames[d.getMonth()]] = 0;
        }

        orders.forEach((order: { total: number; createdAt: Date }) => {
            const month = monthNames[order.createdAt.getMonth()];
            if (revenueByMonth[month] !== undefined) {
                revenueByMonth[month] += order.total;
            }
        });

        const revenueData = Object.keys(revenueByMonth).map((month) => ({
            name: month,
            revenue: revenueByMonth[month],
        }));

        // 2. Device Usage (static for now)
        const deviceUsage = [
            { name: "Phone", value: 65, color: "#10b981" },
            { name: "Tablet", value: 15, color: "#f59e0b" },
            { name: "Computer", value: 20, color: "#3b82f6" },
        ];

        // 3. Visitors Distribution (static for now)
        const visitorsDistribution = [
            { country: "USA", visitors: 450, color: "#3b82f6" },
            { country: "India", visitors: 300, color: "#10b981" },
            { country: "UK", visitors: 200, color: "#3b82f6" },
            { country: "Kenya", visitors: 150, color: "#10b981" },
        ];

        // 4. Recent Orders + real total order count
        const [recentOrders, totalOrders] = await Promise.all([
            prisma.orders.findMany({
                where: { shopId },
                take: 5,
                orderBy: { createdAt: "desc" },
                include: {
                    user: { select: { name: true } },
                },
            }),
            prisma.orders.count({ where: { shopId } }),
        ]);

        const formattedRecentOrders = recentOrders.map(
            (order: {
                id: string;
                total: number;
                status: string;
                user: { name: string } | null;
            }) => ({
                id: order.id.slice(0, 8).toUpperCase(),
                customer: order.user?.name || "Guest",
                amount: order.total,
                status: order.status,
            })
        );

        res.status(200).json({
            success: true,
            stats: {
                revenueData,
                deviceUsage,
                visitorsDistribution,
                recentOrders: formattedRecentOrders,
                totalOrders,
                totalRevenue: orders.reduce(
                    (sum: number, order: { total: number }) => sum + order.total,
                    0
                ),
            },
        });
    } catch (error) {
        next(error);
    }
};
