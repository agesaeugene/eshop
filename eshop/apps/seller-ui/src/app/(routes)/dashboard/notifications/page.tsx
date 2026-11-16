"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import axiosInstance from "apps/seller-ui/src/utils/axiosInstance";

const SellerNotificationsPage = () => {
    const queryClient = useQueryClient();
    const [actionError, setActionError] = useState("");
    const { data: notifications = [], isLoading, isError } = useQuery({
        queryKey: ["seller-notifications"],
        queryFn: async () => {
            const response = await axiosInstance.get("/order/api/notifications");
            return response.data.notifications;
        },
        refetchInterval: 30_000,
    });

    const refresh = () => queryClient.invalidateQueries({ queryKey: ["seller-notifications"] });
    const markRead = useMutation({
        mutationFn: (id: string) => axiosInstance.put(`/order/api/notifications/${id}/read`),
        onSuccess: async () => {
            setActionError("");
            await refresh();
        },
        onError: (error: any) => setActionError(error.response?.data?.message || "Could not update this notification."),
    });
    const markAllRead = useMutation({
        mutationFn: () => axiosInstance.put("/order/api/notifications/mark-all-read"),
        onSuccess: async () => {
            setActionError("");
            await refresh();
        },
        onError: (error: any) => setActionError(error.response?.data?.message || "Could not mark notifications as read."),
    });
    const unreadCount = notifications.filter((notification: any) => !notification.isRead).length;

    return (
        <main className="min-h-screen bg-slate-950 p-5 text-slate-100 md:p-8">
            <div className="mx-auto max-w-5xl">
                <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="rounded-xl bg-blue-500/10 p-3 text-blue-300"><Bell className="h-6 w-6" /></span>
                        <div>
                            <p className="text-sm text-slate-400">Seller dashboard / Activity</p>
                            <h1 className="text-2xl font-bold md:text-3xl">Notifications</h1>
                        </div>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={() => markAllRead.mutate()}
                            disabled={markAllRead.isPending}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
                        >
                            <CheckCheck className="h-4 w-4" /> Mark all read ({unreadCount})
                        </button>
                    )}
                </header>

                {actionError && (
                    <p role="alert" className="mb-4 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-200">
                        {actionError}
                    </p>
                )}

                {isLoading ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">Loading notifications...</div>
                ) : isError ? (
                    <p role="alert" className="rounded-xl border border-red-800 bg-red-950 p-5 text-red-200">
                        Could not load notifications. Please refresh to try again.
                    </p>
                ) : notifications.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-16 text-center">
                        <Bell className="mx-auto h-10 w-10 text-slate-500" />
                        <h2 className="mt-4 font-semibold">You are all caught up</h2>
                        <p className="mt-2 text-sm text-slate-400">Orders and event review updates will appear here.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {notifications.map((notification: any) => (
                            <article
                                key={notification.id}
                                className={`rounded-xl border p-4 md:p-5 ${
                                    notification.isRead ? "border-slate-800 bg-slate-900/70" : "border-blue-800/80 bg-blue-950/30"
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <Bell className={`mt-1 h-4 w-4 shrink-0 ${notification.isRead ? "text-slate-500" : "text-blue-300"}`} />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <h2 className="font-semibold">{notification.title}</h2>
                                            <time className="text-xs text-slate-500">{new Date(notification.createdAt).toLocaleString()}</time>
                                        </div>
                                        <p className="mt-1 text-sm leading-6 text-slate-300">{notification.message}</p>
                                        <div className="mt-3 flex flex-wrap gap-4">
                                            {!notification.isRead && (
                                                <button
                                                    onClick={() => markRead.mutate(notification.id)}
                                                    disabled={markRead.isPending}
                                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-300 hover:text-blue-200"
                                                >
                                                    <Check className="h-3.5 w-3.5" /> Mark read
                                                </button>
                                            )}
                                            {notification.redirect_link?.startsWith("/") && (
                                                <Link href={notification.redirect_link} className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white">
                                                    Open related page <ExternalLink className="h-3.5 w-3.5" />
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
};

export default SellerNotificationsPage;
