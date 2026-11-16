import { NextFunction, Response } from "express";
import { NotFoundError } from "@packages/error-handler";
import prisma from "@packages/libs/prisma";

export const getUserNotifications = async (req: any, res: Response, next: NextFunction) => {
    try {
        const [notifications, seller] = await Promise.all([
            prisma.notifications.findMany({
                where: { receiverId: req.user.id },
                orderBy: { createdAt: "desc" },
            }),
            req.role === "seller"
                ? prisma.sellers.findUnique({
                    where: { id: req.user.id },
                    select: { notificationPreferences: true },
                })
                : Promise.resolve(null),
        ]);
        const preferences = seller?.notificationPreferences as Record<string, boolean> | null;
        const visibleNotifications = req.role !== "seller" || !preferences
            ? notifications
            : notifications.filter((notification) => {
                const title = notification.title.toLowerCase();
                if (title.includes("order")) return preferences.orderUpdates !== false;
                if (title.includes("event")) return preferences.eventReviews !== false;
                if (title.includes("product")) return preferences.productUpdates !== false;
                return preferences.accountAlerts !== false;
            });
        res.status(200).json({ success: true, notifications: visibleNotifications });
    } catch (error) {
        next(error);
    }
};

export const markNotificationRead = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const { count } = await prisma.notifications.updateMany({
            where: { id, receiverId: req.user.id },
            data: { isRead: true },
        });
        if (count === 0) return next(new NotFoundError("Notification not found"));

        res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
};

export const markAllNotificationsRead = async (req: any, res: Response, next: NextFunction) => {
    try {
        await prisma.notifications.updateMany({
            where: { receiverId: req.user.id, isRead: false },
            data: { isRead: true },
        });
        res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
};