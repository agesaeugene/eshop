import { NextFunction, Response } from "express";
import { NotFoundError, ValidationError } from "@packages/error-handler";
import prisma from "@packages/libs/prisma";
import { DELIVERY_STATUSES, DeliveryStatus, isDeliveryStatus } from "../utils/delivery-status";


// get seller orders
export const getSellerOrders = async (req: any, res: Response, next: NextFunction) => {
    try {
        const shop = await prisma.shops.findUnique({
            where: { sellerId: req.seller.id },
            select: { id: true },
        });
        if (!shop) return res.status(200).json({ success: true, orders: [] });

        const orders = await prisma.orders.findMany({
            where: { shopId: shop.id },
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
        if (req.role === "user" && order.userId !== req.user.id) {
            return next(new NotFoundError("Order not found with the id!"));
        }
        if (req.role === "seller") {
            const shop = await prisma.shops.findUnique({
                where: { sellerId: req.seller.id },
                select: { id: true },
            });
            if (!shop || shop.id !== order.shopId) {
                return next(new NotFoundError("Order not found with the id!"));
            }
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

export const updateDeliveryStatus = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { orderId } = req.params;
        const { deliveryStatus } = req.body as { deliveryStatus?: unknown };

        if (!orderId || !deliveryStatus) {
            return next(new ValidationError("Missing order ID or delivery status."));
        }

        if (!isDeliveryStatus(deliveryStatus)) {
            return next(new ValidationError("Invalid delivery status."));
        }

        const shop = await prisma.shops.findUnique({
            where: { sellerId: req.seller.id },
            select: { id: true },
        });
        const existingOrder = shop ? await prisma.orders.findFirst({
            where: { id: orderId, shopId: shop.id },
        }) : null;

        if (!existingOrder) {
            return next(new NotFoundError("Order not found!"));
        }
        if (existingOrder.status.toLowerCase() !== "paid") {
            return next(new ValidationError("Only confirmed paid orders can be updated."));
        }
        if (deliveryStatus === "cancelled") {
            return next(new ValidationError("Contact support to cancel an order."));
        }
        const currentStatusIndex = DELIVERY_STATUSES.indexOf(existingOrder.deliveryStatus as DeliveryStatus);
        const nextStatusIndex = DELIVERY_STATUSES.indexOf(deliveryStatus);
        if (currentStatusIndex >= 0 && nextStatusIndex < currentStatusIndex) {
            return next(new ValidationError("Delivery progress can only move forward."));
        }

        const updatedOrder = await prisma.$transaction(async (tx) => {
            const updated = await tx.orders.update({
                where: { id: orderId },
                data: { deliveryStatus, updatedAt: new Date() },
            });
            await tx.notifications.create({
                data: {
                    userId: existingOrder.userId,
                    receiverId: existingOrder.userId,
                    title: "Order progress updated",
                    message: `Order #${existingOrder.id.slice(-8).toUpperCase()} is now ${deliveryStatus.replaceAll("_", " ")}.`,
                    redirect_link: `/order/${existingOrder.id}`,
                },
            });
            return updated;
        });

        return res.status(200).json({ success: true, order: updatedOrder });
    } catch (error) {
        next(error);
    }
};

export const adminUpdateDeliveryStatus = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { orderId } = req.params;
        const { deliveryStatus } = req.body as { deliveryStatus?: unknown };
        if (!orderId || !isDeliveryStatus(deliveryStatus) || deliveryStatus === "cancelled") {
            return next(new ValidationError("Choose a valid fulfillment status. Payment status cannot be changed here."));
        }

        const order = await prisma.orders.findUnique({
            where: { id: orderId },
            include: { shop: { select: { sellerId: true, name: true } } },
        });
        if (!order) return next(new NotFoundError("Order not found."));
        if (order.status.toLowerCase() !== "paid") {
            return next(new ValidationError("Only confirmed paid orders can be moved through fulfillment."));
        }
        if (order.deliveryStatus === "cancelled") {
            return next(new ValidationError("Cancelled orders cannot be reopened through fulfillment controls."));
        }
        const currentIndex = DELIVERY_STATUSES.indexOf(order.deliveryStatus as DeliveryStatus);
        const nextIndex = DELIVERY_STATUSES.indexOf(deliveryStatus);
        if (currentIndex >= 0 && nextIndex < currentIndex) {
            return next(new ValidationError("Fulfillment can only move forward. Contact support for a correction."));
        }

        const updatedOrder = await prisma.$transaction(async (tx) => {
            const updated = await tx.orders.update({
                where: { id: order.id },
                data: { deliveryStatus, updatedAt: new Date() },
            });
            const label = deliveryStatus.replaceAll("_", " ");
            await tx.notifications.createMany({
                data: [
                    {
                        userId: order.userId,
                        receiverId: order.userId,
                        title: "Order progress updated",
                        message: `Order #${order.id.slice(-8).toUpperCase()} is now ${label}.`,
                        redirect_link: `/profile?active=Orders`,
                    },
                    {
                        userId: order.userId,
                        receiverId: order.shop.sellerId,
                        title: "Order updated by admin",
                        message: `An administrator updated order #${order.id.slice(-8).toUpperCase()} to ${label}.`,
                        redirect_link: "/dashboard/orders",
                    },
                ],
            });
            return updated;
        });
        return res.status(200).json({ success: true, order: updatedOrder });
    } catch (error) {
        return next(error);
    }
};

export const getDashboardStats = async (req: any, res: Response, next: NextFunction) => {
    try {
        // Find the shop associated with the logged-in seller
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

        // Initialize last 6 months with 0 (setDate(1) avoids month-end rollover,
        // e.g. subtracting a month from Oct 31 landing on "Oct 1" instead of Sep)
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

        // Analytics are recorded per user; count only users whose tracked actions
        // include a product view from this shop.
        const [recentOrders, totalOrders, allPaidOrders, shopVisitors, productStats] = await Promise.all([
            prisma.orders.findMany({
                where: { shopId },
                take: 5,
                orderBy: { createdAt: "desc" },
                include: {
                    user: { select: { name: true } },
                },
            }),
            prisma.orders.count({ where: { shopId } }),
            prisma.orders.findMany({
                where: { shopId, status: "paid" },
                select: { total: true },
            }),
            prisma.uniqueShopVisitors.findMany({ where: { shopId }, select: { userId: true } }),
            prisma.productAnalytics.aggregate({
                where: { shopId },
                _sum: { views: true, purchases: true },
            }),
        ]);
        const analytics = shopVisitors.length
            ? await prisma.userAnalytics.findMany({
                where: { userId: { in: shopVisitors.map((visitor: { userId: string }) => visitor.userId) } },
                select: { country: true, device: true },
            })
            : [];
        const visitors = analytics;
        const deviceCounts = new Map<string, number>();
        const countryCounts = new Map<string, number>();
        visitors.forEach((visitor: any) => {
            const device = visitor.device || "Unknown";
            const country = visitor.country || "Unknown";
            deviceCounts.set(device, (deviceCounts.get(device) ?? 0) + 1);
            countryCounts.set(country, (countryCounts.get(country) ?? 0) + 1);
        });
        const colors = ["#10b981", "#f59e0b", "#3b82f6", "#a855f7", "#06b6d4"];
        const deviceUsage = Array.from(deviceCounts, ([name, value], index) => ({
            name,
            value,
            color: colors[index % colors.length],
        }));
        const visitorsDistribution = Array.from(countryCounts, ([country, visitors], index) => ({
            country,
            visitors,
            color: colors[index % colors.length],
        })).sort((a, b) => b.visitors - a.visitors).slice(0, 6);

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
                totalRevenue: allPaidOrders.reduce(
                    (sum: number, order: { total: number }) => sum + order.total,
                    0
                ),
                totalVisitors: visitors.length,
                conversionRate: productStats._sum.views
                    ? ((productStats._sum.purchases ?? 0) / productStats._sum.views) * 100
                    : 0,
            },
        });
    } catch (error) {
        next(error);
    }
};

// verify coupon code
export const verifyCouponCode = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { couponCode, cart } = req.body;

        if (!couponCode || !cart || cart.length === 0) {
            return next(new ValidationError("Coupon code and cart are required!"));
        }

        // Fetch the discount code
        const discount = await prisma.discount_codes.findUnique({
            where: { discountCode: couponCode },
        });

        if (!discount) {
            return next(new ValidationError("Coupon code isn't valid!"));
        }

        // Find matching product that includes this discount code
        const matchingProduct = cart.find((item: any) =>
            item.discount_codes?.some((d: any) => d === discount.id)
        );

        let discountAmount = 0;
        const price = matchingProduct.sale_price * matchingProduct.quantity;

        if (discount.discountType === "percentage") {
            discountAmount = (price * discount.discountValue) / 100;
        } else if (discount.discountType === "flat") {
            discountAmount = discount.discountValue;
        }

        // Prevent discount from being greater than total price
        discountAmount = Math.min(discountAmount, price);

        res.status(200).json({
            valid: true,
            discount: discount.discountValue,
            discountAmount: discountAmount.toFixed(2),
            discountedProductId: matchingProduct.id,
            discountType: discount.discountType,
            message: "Discount applied to 1 eligible product",
        });

    } catch (error) {
        next(error);

    }
}

type ProductSummary = {
    id: string;
    title: string;
    images: { url: string }[];
};

// get user orders
export const getUserOrders = async (req: any, res: Response, next: NextFunction) => {
    try {
        const orders = await prisma.orders.findMany({
            where: { userId: req.user.id },
            include: {
                items: true,
                shop: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        // orderItems has no relation to products, so enrich in one batched query
        const productIds: string[] = [
            ...new Set<string>(
                orders.flatMap((o: any) => o.items.map((i: any) => i.productId as string))
            ),
        ];

        const products: ProductSummary[] = productIds.length
            ? await prisma.products.findMany({
                where: { id: { in: productIds } },
                select: {
                    id: true,
                    title: true,
                    images: { select: { url: true }, take: 1 },
                },
            })
            : [];

        const productMap = new Map<string, ProductSummary>(
            products.map((p: ProductSummary): [string, ProductSummary] => [p.id, p])
        );

        res.status(200).json({
            success: true,
            orders: orders.map((order: any) => ({
                ...order,
                items: order.items.map((item: any) => ({
                    ...item,
                    product: productMap.get(item.productId) ?? null,
                })),
            })),
        });
    } catch (error) {
        next(error);
    }
};

// get admin orders
export const getAdminOrders = async(req: any, res:Response, next:NextFunction) => {
    try {
        const page = Math.max(Number.parseInt(String(req.query.page ?? "1"), 10) || 1, 1);
        const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit ?? "25"), 10) || 25, 1), 100);
        // Fetch all orders
        const [orders, totalOrders] = await Promise.all([
            prisma.orders.findMany({
            skip: (page - 1) * limit,
            take: limit,
            include: {
                user: { select: { id: true, name: true, email: true, avatar: true } },
                shop: { select: { id: true, name: true, sellerId: true, seller: { select: { id: true, name: true, email: true } } } },
                items: true,
            },
            orderBy: {
                createdAt: "desc",
            },
            }),
            prisma.orders.count(),
        ]);
        const productIds = [...new Set(orders.flatMap((order) => order.items.map((item) => item.productId)))];
        const products = productIds.length
            ? await prisma.products.findMany({
                where: { id: { in: productIds } },
                select: { id: true, title: true, slug: true, sale_price: true, images: { select: { url: true }, take: 1 } },
            })
            : [];
        const productById = new Map(products.map((product) => [product.id, product]));
        return res.status(200).json({
            success: true,
            orders: orders.map((order) => ({
                ...order,
                items: order.items.map((item) => ({ ...item, product: productById.get(item.productId) ?? null })),
            })),
            meta: { page, limit, total: totalOrders, totalPages: Math.ceil(totalOrders / limit) },
        });
    } catch (error) {
        return next(error);
    }
}