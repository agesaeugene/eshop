"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldCheck } from "lucide-react";
import { useState } from "react";
import axiosInstance from "../../utils/axiosinstance";

const DELIVERY_STATUSES = ["ordered", "packed", "shipped", "out_for_delivery", "delivered"] as const;
type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];
type OrderItem = {
    id: string;
    quantity: number;
    price: number;
    product?: { title: string; images?: { url: string }[] } | null;
};
type AdminOrder = {
    id: string;
    total: number;
    status: string;
    deliveryStatus: string;
    paymentMethod: string;
    createdAt: string;
    user?: { name?: string; email?: string } | null;
    shop?: { name?: string; seller?: { name?: string; email?: string } } | null;
    items: OrderItem[];
};
type OrdersResponse = {
    orders: AdminOrder[];
    meta: { page: number; total: number; totalPages: number };
};

const formatMoney = (value: number) =>
    `KES ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const humanize = (value: string) => value.replaceAll("_", " ");

const OrdersPage = () => {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [actionError, setActionError] = useState("");
    const { data, isLoading, isError } = useQuery<OrdersResponse>({
        queryKey: ["admin-orders", page],
        queryFn: async () => (await axiosInstance.get(`/order/api/get-admin-orders?page=${page}&limit=25`)).data,
        refetchInterval: 30_000,
    });
    const updateFulfillment = useMutation({
        mutationFn: ({ orderId, deliveryStatus }: { orderId: string; deliveryStatus: DeliveryStatus }) =>
            axiosInstance.put(`/order/api/admin/orders/${orderId}/delivery-status`, { deliveryStatus }),
        onSuccess: async () => {
            setActionError("");
            await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
        },
        onError: (error: any) => {
            setActionError(error.response?.data?.message || "Could not update order fulfillment.");
        },
    });
    const query = search.trim().toLowerCase();
    const orders = (data?.orders ?? []).filter((order) =>
        [
            order.id,
            order.user?.name,
            order.user?.email,
            order.shop?.name,
            order.shop?.seller?.name,
            order.shop?.seller?.email,
            ...order.items.map((item) => item.product?.title),
        ].filter(Boolean).join(" ").toLowerCase().includes(query)
    );

    return (
        <main className="min-h-screen bg-slate-950 p-5 text-slate-100 md:p-8">
            <div className="mx-auto max-w-7xl">
                <header className="mb-6">
                    <p className="text-sm text-slate-400">Admin / Marketplace operations</p>
                    <h1 className="mt-1 text-2xl font-bold md:text-3xl">All orders</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                        Inspect each purchased item, buyer and seller. Admins can advance fulfillment for paid orders; payment status is provider-controlled and cannot be changed here.
                    </p>
                </header>

                <div className="mb-4 grid gap-3 sm:grid-cols-3">
                    <Summary label="Orders on this page" value={(data?.orders.length ?? 0).toString()} />
                    <Summary label="All orders" value={(data?.meta.total ?? 0).toLocaleString()} />
                    <Summary label="Paid orders on this page" value={(data?.orders ?? []).filter((order) => order.status.toLowerCase() === "paid").length.toString()} />
                </div>

                {actionError && <p role="alert" className="mb-4 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-200">{actionError}</p>}
                {isError ? (
                    <p role="alert" className="rounded-xl border border-red-800 bg-red-950 p-5 text-red-200">
                        Orders could not be loaded. Verify the admin session and order service, then retry.
                    </p>
                ) : (
                    <>
                        <label className="mb-4 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
                            <Search className="h-4 w-4 shrink-0 text-slate-400" />
                            <input
                                aria-label="Search current orders"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search buyer, seller, shop, item or order ID on this page"
                                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                            />
                        </label>

                        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                            {isLoading ? <p className="p-8 text-center text-slate-400">Loading individual orders...</p> : orders.length === 0 ? (
                                <p className="p-8 text-center text-slate-400">{data?.orders.length ? "No current-page orders match the search." : "No orders have been placed yet."}</p>
                            ) : (
                                <div className="divide-y divide-slate-800">
                                    {orders.map((order) => (
                                        <article key={order.id} className="p-4 md:p-5">
                                            <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr_1.2fr_auto] xl:items-center">
                                                <div>
                                                    <p className="font-semibold">#{order.id.slice(-8).toUpperCase()}</p>
                                                    <p className="mt-1 text-xs text-slate-400">{new Date(order.createdAt).toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{order.user?.name || "Customer"}</p>
                                                    <p className="text-xs text-slate-400">{order.user?.email || "—"}</p>
                                                    <p className="mt-1 text-xs text-slate-300">{order.shop?.name || "Shop"} · Seller: {order.shop?.seller?.name || "Unknown"}</p>
                                                </div>
                                                <div className="text-sm">
                                                    <p className="font-semibold">{formatMoney(order.total)} <span className="ml-1 text-xs font-normal uppercase text-slate-400">{order.paymentMethod}</span></p>
                                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                                        <span className={`rounded-full px-2 py-1 ${order.status.toLowerCase() === "paid" ? "bg-emerald-950 text-emerald-300" : "bg-amber-950 text-amber-200"}`}>Payment: {order.status}</span>
                                                        <span className="rounded-full bg-slate-800 px-2 py-1 capitalize text-slate-200">Fulfillment: {humanize(order.deliveryStatus)}</span>
                                                    </div>
                                                </div>
                                                <FulfillmentControl order={order} busy={updateFulfillment.isPending} onUpdate={(deliveryStatus) => updateFulfillment.mutate({ orderId: order.id, deliveryStatus })} />
                                            </div>
                                            <details className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60">
                                                <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-blue-200">
                                                    Purchased items ({order.items.length})
                                                </summary>
                                                <div className="divide-y divide-slate-800 px-4">
                                                    {order.items.map((item) => (
                                                        <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                                                            <div>
                                                                <p className="font-medium">{item.product?.title || "Unavailable product"}</p>
                                                                <p className="mt-1 text-xs text-slate-400">Quantity {item.quantity} · {formatMoney(item.price)} each</p>
                                                            </div>
                                                            <p className="font-medium">{formatMoney(item.price * item.quantity)}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </details>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>

                        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                            <span className="text-slate-400">Page {data?.meta.page ?? page} of {Math.max(data?.meta.totalPages ?? 1, 1)}</span>
                            <div className="flex gap-2">
                                <button type="button" disabled={page <= 1 || isLoading} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-slate-700 px-3 py-2 disabled:opacity-40">Previous</button>
                                <button type="button" disabled={page >= (data?.meta.totalPages ?? 1) || isLoading} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-700 px-3 py-2 disabled:opacity-40">Next</button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </main>
    );
};

const FulfillmentControl = ({
    order,
    busy,
    onUpdate,
}: {
    order: AdminOrder;
    busy: boolean;
    onUpdate: (status: DeliveryStatus) => void;
}) => {
    const currentIndex = DELIVERY_STATUSES.indexOf(order.deliveryStatus as DeliveryStatus);
    const canManage = order.status.toLowerCase() === "paid" && currentIndex >= 0 && currentIndex < DELIVERY_STATUSES.length - 1;
    if (!canManage) {
        return <span className="inline-flex items-center gap-1 text-xs text-slate-500"><ShieldCheck className="h-4 w-4" /> {order.status.toLowerCase() === "paid" ? "Fulfillment complete" : "Awaiting confirmed payment"}</span>;
    }
    return (
        <label className="text-xs text-slate-400">
            Admin fulfillment control
            <select
                aria-label={`Update fulfillment for order ${order.id}`}
                value=""
                disabled={busy}
                onChange={(event) => {
                    if (event.target.value) onUpdate(event.target.value as DeliveryStatus);
                }}
                className="mt-1 block w-full rounded-lg border border-blue-900 bg-slate-950 px-3 py-2 text-sm text-blue-100 disabled:opacity-50"
            >
                <option value="">Advance order…</option>
                {DELIVERY_STATUSES.slice(currentIndex + 1).map((status) => (
                    <option key={status} value={status}>{humanize(status)}</option>
                ))}
            </select>
        </label>
    );
};

const Summary = ({ label, value }: { label: string; value: string }) => (
    <article className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-sm text-slate-400">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
    </article>
);

export default OrdersPage;
