import prisma from "@packages/libs/prisma";
import { NextFunction, Response } from "express";

export const getAdminNotifications = async (req: any, res: Response, next: NextFunction) => {
    try {
        const [notifications, admin] = await Promise.all([
            prisma.notifications.findMany({
                where: {
                    OR: [
                        { receiverId: "admin" },
                        { receiverId: req.admin.id },
                    ],
                },
                orderBy: { createdAt: "desc" },
                take: 100,
            }),
            prisma.users.findUnique({
                where: { id: req.admin.id },
                select: { notificationPreferences: true },
            }),
        ]);
        const preferences = admin?.notificationPreferences as Record<string, boolean> | null;
        const visibleNotifications = notifications.filter((notification) => {
            if (preferences?.inApp === false) return false;
            const title = notification.title.toLowerCase();
            if (title.includes("event") && preferences?.eventReviews === false) return false;
            if (title.includes("security") && preferences?.securityAlerts === false) return false;
            if (
                title.includes("platform") &&
                preferences?.platformUpdates === false
            ) return false;
            return true;
        });
        return res.status(200).json({
            success: true,
            notifications: visibleNotifications,
            unreadCount: visibleNotifications.filter((notification) => !notification.isRead).length,
        });
    } catch (error) {
        return next(error);
    }
};

export const markAdminNotificationRead = async (
    req: any,
    res: Response,
    next: NextFunction
) => {
    try {
        const result = await prisma.notifications.updateMany({
            where: {
                id: req.params.id,
                receiverId: { in: ["admin", req.admin.id] },
            },
            data: { isRead: true },
        });
        if (result.count === 0) {
            return res.status(404).json({ message: "Notification not found" });
        }
        return res.status(200).json({ success: true });
    } catch (error) {
        return next(error);
    }
};

export const markAllAdminNotificationsRead = async (
    req: any,
    res: Response,
    next: NextFunction
) => {
    try {
        await prisma.notifications.updateMany({
            where: {
                OR: [
                    { receiverId: "admin" },
                    { receiverId: req.admin.id },
                ],
                isRead: false,
            },
            data: { isRead: true },
        });
        return res.status(200).json({ success: true });
    } catch (error) {
        return next(error);
    }
};
