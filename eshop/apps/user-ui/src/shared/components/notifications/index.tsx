'use client';
import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from 'apps/user-ui/src/utils/axiosInstance';
import { Bell, CheckCheck } from 'lucide-react';

type Notification = {
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    redirect_link?: string | null;
    createdAt: string;
};

const NotificationsSection = ({
    notifications,
    isLoading,
}: {
    notifications: Notification[] | undefined;
    isLoading: boolean;
}) => {
    const queryClient = useQueryClient();

    const { mutate: markRead } = useMutation({
        mutationFn: async (id: string) => {
            await axiosInstance.put(`/api/notifications/${id}/read`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
        },
    });

    const { mutate: markAllRead, isPending: isMarkingAll } = useMutation({
        mutationFn: async () => {
            await axiosInstance.put(`/api/notifications/mark-all-read`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
        },
    });

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
                    onClick={() => !n.isRead && markRead(n.id)}
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