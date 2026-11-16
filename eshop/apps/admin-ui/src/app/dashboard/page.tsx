"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, BadgeDollarSign, Boxes, CalendarDays, ShoppingBag, Store, Users } from "lucide-react";
import {
    Cell,
    CartesianGrid,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import axiosInstance from "../utils/axiosinstance";

type DashboardStats = {
    totalUsers: number;
    totalSellers: number;
    totalProducts: number;
    totalEvents: number;
    totalOrders: number;
    totalRevenue: number;
    revenueData: { name: string; revenue: number }[];
    recentOrders: {
        id: string;
        customer: string;
        shop: string;
        amount: number;
        status: string;
        createdAt: string;
    }[];
    deviceUsage: { name: string; value: number }[];
    pendingWithdrawals: number;
    pendingPayments: number;
};

const DashboardPage = () => {
    const { data, isLoading, isError } = useQuery<DashboardStats>({
        queryKey: ["admin-dashboard-stats"],
        queryFn: async () => (await axiosInstance.get("/admin/api/dashboard-stats")).data.stats,
        refetchInterval: 30_000,
    });

    if (isLoading) {
        return <main className="min-h-screen p-8 text-slate-300">Loading platform overview...</main>;
    }
    if (isError || !data) {
        return (
            <main className="min-h-screen p-8 text-white">
                <p role="alert" className="rounded-xl border border-red-800 bg-red-950 p-5 text-red-200">
                    Dashboard data could not be loaded. Check the admin and order services, then retry.
                </p>
            </main>
        );
    }

    const cards = [
        { label: "Paid revenue", value: money(data.totalRevenue), icon: BadgeDollarSign, accent: "text-emerald-300" },
        { label: "Orders", value: data.totalOrders.toLocaleString(), icon: ShoppingBag, accent: "text-blue-300" },
        { label: "Users", value: data.totalUsers.toLocaleString(), icon: Users, accent: "text-violet-300" },
        { label: "Sellers", value: data.totalSellers.toLocaleString(), icon: Store, accent: "text-amber-300" },
        { label: "Products", value: data.totalProducts.toLocaleString(), icon: Boxes, accent: "text-cyan-300" },
        { label: "Events awaiting review", value: data.totalEvents.toLocaleString(), icon: CalendarDays, accent: "text-orange-300" },
    ];

    return (
        <main className="min-h-screen bg-slate-950 p-5 text-slate-100 md:p-8">
            <div className="mx-auto max-w-7xl">
                <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-sm text-slate-400">Platform operations</p>
                        <h1 className="mt-1 text-2xl font-bold md:text-3xl">Admin dashboard</h1>
                        <p className="mt-2 text-sm text-slate-400">Live marketplace health and financial activity.</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                        <a href="/dashboard/finance" className="rounded-lg border border-amber-800 bg-amber-950/40 px-3 py-2 text-amber-200 hover:bg-amber-950">
                            {data.pendingWithdrawals} withdrawals to review
                        </a>
                        <a href="/dashboard/payments" className="rounded-lg border border-blue-800 bg-blue-950/40 px-3 py-2 text-blue-200 hover:bg-blue-950">
                            {data.pendingPayments} payments processing
                        </a>
                    </div>
                </header>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {cards.map(({ label, value, icon: Icon, accent }) => (
                        <article key={label} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 p-5">
                            <div>
                                <p className="text-sm text-slate-400">{label}</p>
                                <p className="mt-2 text-2xl font-bold text-white">{value}</p>
                            </div>
                            <span className={`rounded-xl bg-slate-800 p-3 ${accent}`}><Icon className="h-5 w-5" /></span>
                        </article>
                    ))}
                </section>

                <section className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
                    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6">
                        <div className="mb-5">
                            <h2 className="font-semibold">Paid revenue</h2>
                            <p className="mt-1 text-xs text-slate-400">Confirmed orders · last six months</p>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data.revenueData}>
                                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" stroke="#64748b" tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" tickLine={false} axisLine={false} tickFormatter={(value) => `KES ${value}`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }}
                                        formatter={(value) => [money(Number(value)), "Revenue"]}
                                    />
                                    <Line type="monotone" dataKey="revenue" stroke="#60a5fa" strokeWidth={3} dot={{ r: 3 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </article>

                    <div className="space-y-5">
                        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6">
                            <h2 className="font-semibold">Platform device usage</h2>
                            <p className="mt-1 text-xs text-slate-400">Tracked user devices across the marketplace</p>
                            {data.deviceUsage.length ? (
                                <div className="h-[210px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={data.deviceUsage} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={3}>
                                                {data.deviceUsage.map((device, index) => (
                                                    <Cell key={device.name} fill={["#60a5fa", "#34d399", "#fbbf24", "#c084fc"][index % 4]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <p className="py-8 text-center text-sm text-slate-500">Device analytics will appear as users browse the platform.</p>
                            )}
                            <div className="flex flex-wrap gap-3">
                                {data.deviceUsage.map((device) => (
                                    <span key={device.name} className="text-xs text-slate-300">{device.name}: {device.value}</span>
                                ))}
                            </div>
                        </article>
                        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6">
                            <div className="mb-5 flex items-center gap-2">
                                <Activity className="h-4 w-4 text-blue-300" />
                                <div>
                                    <h2 className="font-semibold">Recent orders</h2>
                                    <p className="mt-1 text-xs text-slate-400">Latest marketplace orders</p>
                                </div>
                            </div>
                            {data.recentOrders.length ? (
                                <div className="divide-y divide-slate-800">
                                    {data.recentOrders.slice(0, 4).map((order) => (
                                        <div key={order.id} className="py-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium">{order.customer}</p>
                                                    <p className="mt-1 truncate text-xs text-slate-400">{order.shop} · #{order.id.slice(-8).toUpperCase()}</p>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <p className="text-sm font-semibold">{money(order.amount)}</p>
                                                    <p className={`mt-1 text-xs capitalize ${order.status === "paid" ? "text-emerald-300" : "text-amber-300"}`}>{order.status}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="py-10 text-center text-sm text-slate-500">No orders have been placed yet.</p>
                            )}
                        </article>
                    </div>
                </section>

                <p className="mt-4 text-xs text-slate-500">
                    Figures refresh every 30 seconds. Revenue includes only orders confirmed as paid.
                </p>
            </div>
        </main>
    );
};

const money = (amount: number) =>
    `KES ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default DashboardPage;
