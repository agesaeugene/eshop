import { ValidationError } from "@packages/error-handler";
import { imagekit } from "@packages/libs/imagekit";
import prisma from "@packages/libs/prisma";
import { NextFunction, Request, Response } from "express";

const getSiteConfig = async () => {
    const config = await prisma.site_config.findFirst();
    if (config) return config;
    return prisma.site_config.create({
        data: {
            categories: [],
            subCategories: {},
        },
    });
};

const getSubCategories = (value: unknown): Record<string, string[]> =>
    value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, string[]>
        : {};

export const addCustomizationCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const category = typeof req.body.category === "string" ? req.body.category.trim() : "";
        if (!category || category.length > 80) return next(new ValidationError("Enter a category name (maximum 80 characters)."));
        const config = await getSiteConfig();
        if (config.categories.some((item) => item.toLowerCase() === category.toLowerCase())) {
            return next(new ValidationError("That category already exists."));
        }
        const categories = [...config.categories, category];
        const subCategories = { ...getSubCategories(config.subCategories), [category]: [] };
        await prisma.site_config.update({ where: { id: config.id }, data: { categories, subCategories } });
        return res.status(200).json({ success: true, categories, subCategories });
    } catch (error) {
        return next(error);
    }
};

export const addCustomizationSubCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const category = typeof req.body.category === "string" ? req.body.category.trim() : "";
        const subCategory = typeof req.body.subCategory === "string" ? req.body.subCategory.trim() : "";
        if (!category || !subCategory || subCategory.length > 80) {
            return next(new ValidationError("Choose a category and enter a subcategory (maximum 80 characters)."));
        }
        const config = await getSiteConfig();
        if (!config.categories.includes(category)) return next(new ValidationError("That category no longer exists."));
        const current = getSubCategories(config.subCategories);
        const existing = current[category] ?? [];
        if (existing.some((item) => item.toLowerCase() === subCategory.toLowerCase())) {
            return next(new ValidationError("That subcategory already exists in this category."));
        }
        const subCategories = { ...current, [category]: [...existing, subCategory] };
        await prisma.site_config.update({ where: { id: config.id }, data: { subCategories } });
        return res.status(200).json({ success: true, categories: config.categories, subCategories });
    } catch (error) {
        return next(error);
    }
};

export const uploadSiteCustomization = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const field = req.path.endsWith("logo") ? "logo" : req.path.endsWith("banner") ? "banner" : "";
        if (field !== "logo" && field !== "banner") return next(new ValidationError("Unsupported customization image."));
        const fileName = typeof req.body.fileName === "string" ? req.body.fileName : "";
        if (!/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(fileName) || fileName.length > 12_000_000) {
            return next(new ValidationError("Choose a valid image under 9 MB."));
        }
        const uploaded = await imagekit.upload({
            file: fileName,
            fileName: `site-${field}-${Date.now()}`,
            folder: "/site-customization",
        });
        const config = await getSiteConfig();
        await prisma.site_config.update({
            where: { id: config.id },
            data: { [field]: uploaded.url },
        });
        return res.status(200).json({ success: true, [field]: uploaded.url });
    } catch (error) {
        return next(error);
    }
};

export const getAdminAccountActivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = Math.max(Number.parseInt(String(req.query.page ?? "1"), 10) || 1, 1);
        const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit ?? "50"), 10) || 50, 1), 100);
        const skip = (page - 1) * limit;
        const [users, sellers, totalUsers, totalSellers] = await Promise.all([
            prisma.users.findMany({
                where: { role: { not: "admin" } },
                skip,
                take: limit,
                orderBy: { updatedAt: "desc" },
                select: { id: true, name: true, email: true, createdAt: true },
            }),
            prisma.sellers.findMany({
                skip,
                take: limit,
                orderBy: { updatedAt: "desc" },
                select: { id: true, name: true, email: true, createdAt: true },
            }),
            prisma.users.count({ where: { role: { not: "admin" } } }),
            prisma.sellers.count(),
        ]);
        const identities = [
            ...users.map((account) => ({ ...account, accountType: "user" as const })),
            ...sellers.map((account) => ({ ...account, accountType: "seller" as const })),
        ];
        const activity = await prisma.accountActivity.findMany({
                where: {
                    role: { in: ["user", "seller"] },
                },
            });
        const activityByAccount = new Map(activity.map((entry) => [`${entry.role}:${entry.ownerId}`, entry]));
        const now = Date.now();
        const activeAccounts = activity.filter((entry) =>
            entry.isOnline && entry.lastSeenAt && now - entry.lastSeenAt.getTime() <= 90_000
        ).length;
        const recentlyLoggedOutAccounts = activity.filter((entry) =>
            !entry.isOnline && entry.lastLogoutAt && now - entry.lastLogoutAt.getTime() <= 5 * 60_000
        ).length;
        const totalAccounts = totalUsers + totalSellers;
        const accounts = identities.map((account) => {
            const entry = activityByAccount.get(`${account.accountType}:${account.id}`);
            const lastSeenAt = entry?.lastSeenAt ?? null;
            const recentlySeen = lastSeenAt ? now - lastSeenAt.getTime() <= 90_000 : false;
            const justLoggedOut = entry?.lastLogoutAt
                ? now - entry.lastLogoutAt.getTime() <= 5 * 60_000
                : false;
            return {
                ...account,
                isOnline: Boolean(entry?.isOnline && recentlySeen),
                status: entry?.isOnline && recentlySeen
                    ? "active"
                    : justLoggedOut
                        ? "just_logged_out"
                        : "inactive",
                lastLoginAt: entry?.lastLoginAt ?? null,
                lastSeenAt,
                lastLogoutAt: entry?.lastLogoutAt ?? null,
            };
        }).sort((a, b) => (b.lastSeenAt?.getTime() ?? 0) - (a.lastSeenAt?.getTime() ?? 0));
        return res.status(200).json({
            success: true,
            accounts,
            meta: {
                page,
                limit,
                total: totalAccounts,
                totalUsers,
                totalSellers,
                statusCounts: {
                    active: activeAccounts,
                    justLoggedOut: recentlyLoggedOutAccounts,
                    inactive: Math.max(totalAccounts - activeAccounts - recentlyLoggedOutAccounts, 0),
                },
            },
        });
    } catch (error) {
        return next(error);
    }
};

export const getAdminDashboardStats = async (
    _req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const [totalUsers, totalSellers, totalProducts, totalEvents, totalOrders, revenueTotal, recentPaidOrders, recentOrders, pendingWithdrawals, pendingPayments, analytics] =
            await Promise.all([
                prisma.users.count(),
                prisma.sellers.count(),
                prisma.products.count({ where: { isDeleted: { not: true } } }),
                prisma.products.count({ where: { isDeleted: { not: true }, starting_date: { not: null }, ending_date: { not: null }, eventStatus: "Pending" } }),
                prisma.orders.count(),
                prisma.orders.aggregate({ where: { status: "paid" }, _sum: { total: true } }),
                prisma.orders.findMany({
                    where: { status: "paid", createdAt: { gte: sixMonthsAgo } },
                    select: { total: true, createdAt: true },
                }),
                prisma.orders.findMany({
                    take: 8,
                    orderBy: { createdAt: "desc" },
                    include: {
                        user: { select: { name: true } },
                        shop: { select: { name: true } },
                    },
                }),
                prisma.withdrawalRequests.count({ where: { status: "pending" } }),
                prisma.paymentSessions.count({ where: { status: { in: ["pending", "processing", "initiating"] } } }),
                prisma.userAnalytics.findMany({ select: { device: true } }),
            ]);

        const monthLabels = Array.from({ length: 6 }, (_, index) => {
            const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
            return { key: `${date.getFullYear()}-${date.getMonth()}`, name: date.toLocaleString("en", { month: "short" }), revenue: 0 };
        });
        const revenueByMonth = new Map(monthLabels.map((month) => [month.key, month]));
        recentPaidOrders.forEach((order) => {
            const key = `${order.createdAt.getFullYear()}-${order.createdAt.getMonth()}`;
            const month = revenueByMonth.get(key);
            if (month) month.revenue += order.total;
        });
        const deviceCounts = new Map<string, number>();
        analytics.forEach((entry) => {
            const device = entry.device || "Unknown";
            deviceCounts.set(device, (deviceCounts.get(device) ?? 0) + 1);
        });

        return res.status(200).json({
            success: true,
            stats: {
                totalUsers,
                totalSellers,
                totalProducts,
                totalEvents,
                totalOrders,
                totalRevenue: revenueTotal._sum.total ?? 0,
                revenueData: monthLabels.map(({ name, revenue }) => ({ name, revenue })),
                deviceUsage: Array.from(deviceCounts, ([name, value]) => ({ name, value })),
                recentOrders: recentOrders.map((order) => ({
                    id: order.id,
                    customer: order.user?.name ?? "Customer",
                    shop: order.shop?.name ?? "Shop",
                    amount: order.total,
                    status: order.status,
                    createdAt: order.createdAt,
                })),
                pendingWithdrawals,
                pendingPayments,
            },
        });
    } catch (error) {
        return next(error);
    }
};

// get all products (every seller), with the shop and seller that created each one
export const getAllProducts = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const page = Math.max(parseInt(req.query.page as string) || 1, 1);
        const limit = Math.max(parseInt(req.query.limit as string) || 20, 1);
        const skip = (page - 1) * limit;

        // only hide soft-deleted products. `not: true` also matches
        // documents where isDeleted is missing
        const where = { isDeleted: { not: true } };

        const [products, totalProducts] = await Promise.all([
            prisma.products.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    sale_price: true,
                    stock: true,
                    createdAt: true,
                    ratings: true,
                    category: true,
                    images: {
                        select: { url: true },
                        take: 1,
                    },
                    shop: {
                        select: {
                            id: true,
                            name: true,
                            seller: {
                                select: { id: true, name: true, email: true },
                            },
                        },
                    },
                },
            }),
            prisma.products.count({ where }),
        ]);

        res.status(200).json({
            success: true,
            data: products,
            meta: {
                totalProducts,
                currentPage: page,
                totalPages: Math.ceil(totalProducts / limit),
            },
        });
    } catch (error) {
        next(error);
    }
};

// get all events
export const getAllEvents = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const page = Math.max(parseInt(req.query.page as string) || 1, 1);
        const limit = Math.max(parseInt(req.query.limit as string) || 20, 1);
        const skip = (page - 1) * limit;

        const where = {
            starting_date: { not: null },
            ending_date: { not: null },
            isDeleted: { not: true },
        };

        const [events, totalEvents] = await Promise.all([
            prisma.products.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    sale_price: true,
                    stock: true,
                    createdAt: true,
                    ratings: true,
                    category: true,
                    starting_date: true,
                    ending_date: true,
                    eventStatus: true,
                    images: {
                        select: { url: true },
                        take: 1,
                    },
                    shop: {
                        select: {
                            id: true,
                            name: true,
                            seller: {
                                select: { id: true, name: true, email: true },
                            },
                        },
                    },
                },
            }),
            prisma.products.count({ where }),
        ]);

        res.status(200).json({
            success: true,
            data: events,
            meta: {
                totalEvents,
                currentPage: page,
                totalPages: Math.ceil(totalEvents / limit),
            },
        });
    } catch (error) {
        next(error);
    }
};

// get all admins
export const getAllAdmins = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const admins = await prisma.users.findMany({
            where: {
                role: "admin",
            },
        });

        res.status(201).json({
            success: true,
            admins,
        });
    } catch (error) {
        next(error);
    }
};

// add new admin
export const addNewAdmin = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { email, role } = req.body;

        const isUser = await prisma.users.findUnique({ where: { email } });
        if (!isUser) {
            return next(new ValidationError("Something went wrong!"));
        }

        const updateRole = await prisma.users.update({
            where: { email },
            data: {
                role,
            },
        });

        res.status(201).json({
            success: true,
            updateRole,
        });
    } catch (error) {
        next(error);
    }
};

// fetch all customizations
export const getAllCustomizations = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const config = await getSiteConfig();

        return res.status(200).json({
            success: true,
            categories: config.categories,
            subCategories: getSubCategories(config.subCategories),
            logo: config.logo,
            banner: config.banner,
        });
    } catch (error) {
        return next(error);
    }
};

// get all users
export const getAllUsers = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const [users, totalUsers] = await Promise.all([
            prisma.users.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true,
                },
            }),
            prisma.users.count(),
        ]);

        const totalPages = Math.ceil(totalUsers / limit);

        res.status(200).json({
            success: true,
            data: users,
            meta: {
                totalUsers,
                currentPage: page,
                totalPages,
            },
        });
    } catch (error) {
        next(error)
    }
};

// ban a user
export const banUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const target = await prisma.users.findUnique({ where: { id } });
        if (!target) return next(new ValidationError("User not found"));
        if (target.role === "admin") {
            return next(new ValidationError("Admins cannot be banned"));
        }

        const user = await prisma.users.update({
            where: { id },
            data: { isBanned: true },
            select: { id: true, name: true, email: true, isBanned: true },
        });

        res.status(200).json({ success: true, user });
    } catch (error) {
        next(error);
    }
};

// get all sellers
export const getAllSellers = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const [sellers, totalSellers] = await Promise.all([
            prisma.sellers.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    createdAt: true,
                    shop: {
                        select: {
                            name: true,
                            avatar: true,
                            address: true,
                        },
                    },                    
                },
            }),
            prisma.sellers.count(),
        ]);
        const totalPages = Math.ceil(totalSellers /  limit);

        res.status(200).json({
            success: true,
            data: sellers,
            meta: {
                totalSellers,
                currentPage: page,
                totalPages,
            },
        });
    } catch (error) {
        next(error);
    }
}