"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleDollarSign } from "lucide-react";
import Link from "next/link";
import axiosInstance from "apps/seller-ui/src/utils/axiosInstance";
import BreadCrumbs from "apps/seller-ui/src/shared/components/breadcrumbs";

type SellerOrder = {
    id: string;
    total: number;
    status: string;
    paymentMethod: string;
    createdAt: string;
    user?: { name?: string; email?: string } | null;
};

const money = (amount: number) =>
    `KES ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const sellerProceeds = (total: number) => Math.floor(total * 90) / 100;

const SellerPayments = () => {
    const { data: orders = [], isLoading, isError } = useQuery<SellerOrder[]>({
        queryKey: ["seller-orders"],
        queryFn: async () => (await axiosInstance.get("/order/api/get-seller-orders")).data.orders,
        refetchInterval: 30_000,
    });
    const paidOrders = orders.filter((order) => order.status.toLowerCase() === "paid");

    return (
        <main className="min-h-screen bg-slate-950 p-5 text-slate-100 md:p-8">
            <div className="mx-auto max-w-6xl">
                <header className="mb-6">
                    <p className="text-sm text-slate-400">Seller dashboard / Finance</p>
                    <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold md:text-3xl">
                        <CircleDollarSign className="h-7 w-7 text-emerald-300" /> Payments
                    </h1>
                    <p className="mt-2 text-sm text-slate-400">
                        Orders appear here after payment is confirmed. Seller proceeds are 90% after the platform service fee and settle to your wallet.
                    </p>
                    <BreadCrumbs title="Payments" />
                </header>

                {isError ? (
                    <p role="alert" className="rounded-xl border border-red-800 bg-red-950 p-4 text-red-200">
                        Could not load confirmed payments. Refresh the page to retry.
                    </p>
                ) : isLoading ? (
                    <p className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-300">Loading payments...</p>
                ) : paidOrders.length === 0 ? (
                    <p className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
                        No confirmed payments yet. Successfully confirmed purchases will appear here with their orders.
                    </p>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
                        <table className="w-full min-w-[800px] text-left text-sm">
                            <thead className="bg-slate-950 text-xs uppercase text-slate-400">
                                <tr>
                                    <th className="p-4">Order</th>
                                    <th className="p-4">Buyer</th>
                                    <th className="p-4">Paid total</th>
                                    <th className="p-4">Service fee (10%)</th>
                                    <th className="p-4">Seller proceeds (90%)</th>
                                    <th className="p-4">Payment</th>
                                    <th className="p-4">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {paidOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-slate-800/40">
                                        <td className="p-4">
                                            <Link href={`/dashboard/orders`} className="font-medium text-blue-300 hover:text-blue-200">
                                                #{order.id.slice(-8).toUpperCase()}
                                            </Link>
                                        </td>
                                        <td className="p-4">
                                            <p>{order.user?.name || "Customer"}</p>
                                            <p className="mt-1 text-xs text-slate-500">{order.user?.email || "—"}</p>
                                        </td>
                                        <td className="p-4">{money(order.total)}</td>
                                        <td className="p-4 text-amber-200">{money(order.total - sellerProceeds(order.total))}</td>
                                        <td className="p-4 font-semibold text-emerald-300">{money(sellerProceeds(order.total))}</td>
                                        <td className="p-4 capitalize">{order.paymentMethod}</td>
                                        <td className="p-4 text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </main>
    );
};

export default SellerPayments;
