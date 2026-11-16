'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from 'apps/user-ui/src/utils/axiosInstance';
import { Bell, CheckCheck } from 'lucide-react';
import { AppNotification } from 'apps/user-ui/src/types/order';
import { USER_NOTIFICATIONS_KEY } from 'apps/user-ui/src/hooks/useUserNotifications';

const NotificationsSection = ({
    notifications,
    isLoading,
}: {
    notifications: AppNotification[] | undefined;
    isLoading: boolean;
}) => {
    const router = useRouter();
    const queryClient = useQueryClient();
    const refresh = () => queryClient.invalidateQueries({ queryKey: USER_NOTIFICATIONS_KEY });

    const { mutate: markRead } = useMutation({
        mutationFn: (id: string) => axiosInstance.put(`/order/api/notifications/${id}/read`),
        onSuccess: refresh,
    });

    const { mutate: markAllRead, isPending: isMarkingAll } = useMutation({
        mutationFn: () => axiosInstance.put("/order/api/notifications/mark-all-read"),
        onSuccess: refresh,
    });

    const openNotification = (n: AppNotification) => {
        if (!n.isRead) markRead(n.id);
        if (!n.redirect_link) return;
        if (n.redirect_link.startsWith("/")) router.push(n.redirect_link);
        else window.location.href = n.redirect_link; // older absolute links
    };

    if (isLoading) {
        return <p className="text-sm text-gray-500">Loading notifications...</p>;
    }

    if (!notifications || notifications.length === 0) {
        return (
            <div className="text-center py-10 text-gray-500">
                <Bell className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">You're all caught up — no notifications.</p>
            </div>
        );
    }

    const hasUnread = notifications.some((n) => !n.isRead);

    return (
        <div className="space-y-3">
            {hasUnread && (
                <div className="flex justify-end">
                    <button
                        onClick={() => markAllRead()}
                        disabled={isMarkingAll}
                        className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline disabled:opacity-50"
                    >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark all as read
                    </button>
                </div>
            )}

            {notifications.map((n) => (
                <button
                    key={n.id}
                    onClick={() => openNotification(n)}
                    className={`w-full text-left border rounded-md p-4 transition ${
                        n.isRead
                            ? "border-gray-100 bg-white"
                            : "border-blue-100 bg-blue-50/50"
                    }`}
                >
                    <div className="flex items-start justify-between gap-2">
                        <p
                            className={`text-sm ${
                                n.isRead ? "font-medium text-gray-700" : "font-semibold text-gray-900"
                            }`}
                        >
                            {n.title}
                        </p>
                        {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{n.message}</p>
                    <p className="text-[11px] text-gray-400 mt-2">
                        {new Date(n.createdAt).toLocaleString()}
                    </p>
                </button>
            ))}
        </div>
    );
};

export default NotificationsSection;