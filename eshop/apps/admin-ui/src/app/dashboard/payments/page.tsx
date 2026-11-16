"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import axiosInstance from "../../utils/axiosinstance";

type Payment = {
    id: string;
    sessionId: string;
    apiRef: string;
    status: string;
    paymentMethod: string;
    paymentAmountMinor: number;
    totalAmount: number;
    createdAt: string;
    buyer?: { name?: string; email?: string } | null;
    order?: { id: string; status: string; shop?: { name: string } | null } | null;
};

const formatMoney = (value: number) =>
    `KES ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PaymentsPage = () => {
    const { data, isLoading, isError } = useQuery({
        queryKey: ["admin-finance"],
        queryFn: async () => (await axiosInstance.get("/order/api/admin/finance")).data,
        refetchInterval: 30_000,
    });
    const payments: Payment[] = data?.payments ?? [];

    return (
        <main className="min-h-screen p-5 text-white md:p-8">
            <header className="mb-6">
                <p className="text-sm text-slate-400">Admin / Finance</p>
                <h1 className="mt-1 text-2xl font-bold md:text-3xl">Payments</h1>
                <p className="mt-2 text-sm text-slate-400">
                    IntaSend payment status is verified from provider events. Confirmed payments automatically create orders; do not manually mark unverified payments as paid.
                </p>
            </header>

            {isError ? (
                <p role="alert" className="rounded-xl border border-red-800 bg-red-950 p-4 text-red-200">
                    Could not load payment records. Check the finance service and retry.
                </p>
            ) : isLoading ? (
                <p className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-300">Loading payment records...</p>
            ) : payments.length === 0 ? (
                <p className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-400">No payment sessions have been created yet.</p>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
                    <table className="w-full min-w-[900px] text-left text-sm">
                        <thead className="bg-slate-950 text-xs uppercase text-slate-400">
                            <tr>
                                <th className="p-4">Payment</th>
                                <th className="p-4">Buyer</th>
                                <th className="p-4">Shop / Order</th>
                                <th className="p-4">Amount</th>
                                <th className="p-4">Provider status</th>
                                <th className="p-4">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {payments.map((payment) => (
                                <tr key={payment.id} className="align-top hover:bg-slate-800/40">
                                    <td className="p-4">
                                        <p className="font-medium">{payment.paymentMethod.toUpperCase()}</p>
                                        <p className="mt-1 text-xs text-slate-500">{payment.apiRef}</p>
                                    </td>
                                    <td className="p-4">
                                        <p>{payment.buyer?.name || "Customer"}</p>
                                        <p className="mt-1 text-xs text-slate-500">{payment.buyer?.email || "—"}</p>
                                    </td>
                                    <td className="p-4">
                                        <p>{payment.order?.shop?.name || (payment.order ? "Shop" : "No order created")}</p>
                                        {payment.order && <p className="mt-1 text-xs text-slate-400">#{payment.order.id.slice(-8).toUpperCase()}</p>}
                                    </td>
                                    <td className="p-4 font-medium">{formatMoney(payment.paymentAmountMinor / 100)}</td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs capitalize ${
                                            payment.status === "paid" ? "bg-emerald-950 text-emerald-300" :
                                            ["failed", "cancelled"].includes(payment.status) ? "bg-red-950 text-red-300" :
                                            "bg-amber-950 text-amber-200"
                                        }`}>
                                            {payment.status === "paid" ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                                                ["failed", "cancelled"].includes(payment.status) ? <XCircle className="h-3.5 w-3.5" /> :
                                                <Clock3 className="h-3.5 w-3.5" />}
                                            {payment.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-400">{new Date(payment.createdAt).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </main>
    );
};

export default PaymentsPage;