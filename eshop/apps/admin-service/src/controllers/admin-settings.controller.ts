import { ValidationError } from "@packages/error-handler";
import prisma from "@packages/libs/prisma";
import bcrypt from "bcryptjs";
import { NextFunction, Response } from "express";

const DEFAULT_NOTIFICATION_PREFERENCES = {
    inApp: true,
    securityAlerts: true,
    eventReviews: true,
    platformUpdates: true,
};

const DEFAULT_PLATFORM_SETTINGS = {
    supportEmail: "",
    currency: "KES",
    timezone: "Africa/Nairobi",
    maintenanceMode: false,
    allowSellerRegistration: true,
    allowUserRegistration: true,
};

export const getAdminSettings = async (req: any, res: Response, next: NextFunction) => {
    try {
        const [admin, siteConfig] = await Promise.all([
            prisma.users.findUnique({
                where: { id: req.admin.id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    notificationPreferences: true,
                },
            }),
            prisma.site_config.findFirst(),
        ]);
        if (!admin) return res.status(404).json({ message: "Admin account not found" });

        return res.status(200).json({
            profile: { id: admin.id, name: admin.name, email: admin.email },
            notificationPreferences: {
                ...DEFAULT_NOTIFICATION_PREFERENCES,
                ...(admin.notificationPreferences as Record<string, boolean> | null),
            },
            platform: {
                ...DEFAULT_PLATFORM_SETTINGS,
                supportEmail: siteConfig?.supportEmail ?? DEFAULT_PLATFORM_SETTINGS.supportEmail,
                currency: siteConfig?.currency ?? DEFAULT_PLATFORM_SETTINGS.currency,
                timezone: siteConfig?.timezone ?? DEFAULT_PLATFORM_SETTINGS.timezone,
                maintenanceMode: siteConfig?.maintenanceMode ?? DEFAULT_PLATFORM_SETTINGS.maintenanceMode,
                allowSellerRegistration: siteConfig?.allowSellerRegistration
                    ?? DEFAULT_PLATFORM_SETTINGS.allowSellerRegistration,
                allowUserRegistration: siteConfig?.allowUserRegistration
                    ?? DEFAULT_PLATFORM_SETTINGS.allowUserRegistration,
            },
        });
    } catch (error) {
        return next(error);
    }
};

export const updateAdminSettings = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { profile, notificationPreferences, platform, currentPassword, newPassword } = req.body;
        const adminId = req.admin.id;

        if (profile !== undefined) {
            if (!profile || typeof profile.name !== "string" || typeof profile.email !== "string") {
                return next(new ValidationError("A valid name and email are required"));
            }
            const name = profile.name.trim();
            const email = profile.email.trim().toLowerCase();
            if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return next(new ValidationError("Enter a valid name and email address"));
            }
            const duplicate = await prisma.users.findFirst({
                where: { email, id: { not: adminId } },
                select: { id: true },
            });
            if (duplicate) return next(new ValidationError("That email address is already in use"));

            await prisma.users.update({
                where: { id: adminId },
                data: { name, email },
            });
        }

        if (newPassword !== undefined || currentPassword !== undefined) {
            if (
                typeof currentPassword !== "string" ||
                typeof newPassword !== "string" ||
                newPassword.length < 10
            ) {
                return next(new ValidationError("Enter your current password and a new password of at least 10 characters"));
            }
            const admin = await prisma.users.findUnique({
                where: { id: adminId },
                select: { password: true },
            });
            if (!admin?.password || !(await bcrypt.compare(currentPassword, admin.password))) {
                return next(new ValidationError("Current password is incorrect"));
            }
            await prisma.users.update({
                where: { id: adminId },
                data: { password: await bcrypt.hash(newPassword, 10) },
            });
        }

        if (notificationPreferences !== undefined) {
            if (!notificationPreferences || typeof notificationPreferences !== "object") {
                return next(new ValidationError("Notification preferences are invalid"));
            }
            const preferences = Object.fromEntries(
                Object.keys(DEFAULT_NOTIFICATION_PREFERENCES).map((key) => [
                    key,
                    notificationPreferences[key] === true,
                ])
            );
            await prisma.users.update({
                where: { id: adminId },
                data: { notificationPreferences: preferences },
            });
        }

        if (platform !== undefined) {
            if (!platform || typeof platform !== "object") {
                return next(new ValidationError("Platform settings are invalid"));
            }
            const data: Record<string, string | boolean> = {};
            if (platform.supportEmail !== undefined) {
                const supportEmail = String(platform.supportEmail).trim().toLowerCase();
                if (supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
                    return next(new ValidationError("Enter a valid support email address"));
                }
                data.supportEmail = supportEmail;
            }
            if (platform.currency !== undefined) {
                const currency = String(platform.currency).trim().toUpperCase();
                if (!/^[A-Z]{3}$/.test(currency)) {
                    return next(new ValidationError("Currency must be a three-letter ISO code"));
                }
                data.currency = currency;
            }
            if (platform.timezone !== undefined) {
                const timezone = String(platform.timezone).trim();
                try {
                    new Intl.DateTimeFormat("en", { timeZone: timezone });
                } catch {
                    return next(new ValidationError("Enter a valid time zone"));
                }
                data.timezone = timezone;
            }
            for (const key of [
                "maintenanceMode",
                "allowSellerRegistration",
                "allowUserRegistration",
            ] as const) {
                if (platform[key] !== undefined) {
                    if (typeof platform[key] !== "boolean") {
                        return next(new ValidationError(`${key} must be true or false`));
                    }
                    data[key] = platform[key];
                }
            }

            const config = await prisma.site_config.findFirst({ select: { id: true } });
            if (config) {
                await prisma.site_config.update({ where: { id: config.id }, data });
            } else {
                await prisma.site_config.create({
                    data: {
                        categories: [],
                        subCategories: {},
                        ...data,
                    },
                });
            }
        }

        return res.status(200).json({ success: true, message: "Settings saved" });
    } catch (error) {
        return next(error);
    }
};
