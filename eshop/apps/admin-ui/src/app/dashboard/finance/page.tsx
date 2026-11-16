"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, CircleDollarSign, RefreshCw, Wallet } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import axiosInstance from "../../utils/axiosinstance";

type FinanceData = {
    transactions: any[];
    withdrawals: any[];
    payments: any[];
};

const FinancePage = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<"withdrawals" | "transactions" | "payments">("withdrawals");
    const [errorMessage, setErrorMessage] = useState("");
    const { data, isLoading, isError } = useQuery<FinanceData>({
        queryKey: ["admin-finance"],
        queryFn: async () => (await axiosInstance.get("/order/api/admin/finance")).data,
        refetchInterval: 30_000,
    });
    const reviewWithdrawal = useMutation({
        mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" }) =>
            axiosInstance.put(`/order/api/admin/withdrawals/${id}/review`, { action }),
        onSuccess: async (response) => {
            setErrorMessage("");
            await queryClient.invalidateQueries({ queryKey: ["admin-finance"] });
            if (response.data.status === "processing") {
                setErrorMessage("Withdrawal approved and sent to IntaSend for M-Pesa payout.");
            }
        },
        onError: (error: any) => setErrorMessage(error.response?.data?.message || "Could not review the withdrawal."),
    });
    const withdrawals = data?.withdrawals ?? [];
    const transactions = data?.transactions ?? [];
    const payments = data?.payments ?? [];
    const pendingWithdrawals = withdrawals.filter((request) => request.status === "pending").length;

    return (
        <main className="min-h-screen p-5 text-slate-100 md:p-8">
            <div className="mx-auto max-w-7xl">
                <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-sm text-slate-400">Admin / Financial operations</p>
                        <h1 className="mt-1 text-2xl font-bold md:text-3xl">Transactions & withdrawals</h1>
                        <p className="mt-2 text-sm text-slate-400">Review seller payouts, inspect wallet ledger entries, and monitor IntaSend payment sessions.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-finance"] })}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
                    >
                        <RefreshCw className="h-4 w-4" /> Refresh
                    </button>
                </header>

                <div className="mb-6 grid gap-3 sm:grid-cols-3">
                    <SummaryCard icon={<ArrowDownLeft className="h-5 w-5" />} label="Wallet transactions" value={transactions.length} />
                    <SummaryCard icon={<ArrowUpRight className="h-5 w-5" />} label="Pending withdrawals" value={pendingWithdrawals} />
                    <SummaryCard icon={<CircleDollarSign className="h-5 w-5" />} label="Payment sessions" value={payments.length} />
                </div>

                {errorMessage && (
                    <p role="status" className={`mb-4 rounded-lg border p-3 text-sm ${errorMessage.startsWith("Withdrawal approved") ? "border-green-800 bg-green-950 text-green-200" : "border-red-800 bg-red-950 text-red-200"}`}>
                        {errorMessage}
                    </p>
                )}
                {isError && <p role="alert" className="mb-4 rounded-lg border border-red-800 bg-red-950 p-4 text-red-200">Could not load finance records. Check the order service and refresh.</p>}

                <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-800">
                    {([
                        ["withdrawals", `Withdrawal requests${pendingWithdrawals ? ` (${pendingWithdrawals})` : ""}`],
                        ["transactions", "Wallet transactions"],
                        ["payments", "Payment sessions"],
                    ] as const).map(([key, title]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setActiveTab(key)}
                            className={`border-b-2 px-4 py-3 text-sm font-medium ${activeTab === key ? "border-blue-500 text-blue-300" : "border-transparent text-slate-400 hover:text-white"}`}
                        >
                            {title}
                        </button>
                    ))}
                </div>

                <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                    {isLoading ? <p className="p-8 text-center text-slate-400">Loading finance records...</p>
                        : activeTab === "withdrawals" ? (
                            withdrawals.length ? <div className="divide-y divide-slate-800">
                                {withdrawals.map((request) => (
                                    <article key={request.id} className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-5">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="font-semibold">{request.seller?.name ?? "Seller"}</h2>
                                                <StatusBadge status={request.status} />
                                            </div>
                                            <p className="mt-1 text-sm text-slate-400">{request.seller?.email ?? request.sellerId} · {request.phoneNumber}</p>
                                            <p className="mt-1 text-xs text-slate-500">Ref {request.reference} · {new Date(request.createdAt).toLocaleString()}</p>
                                            {request.failureReason && <p className="mt-2 text-xs text-red-300">{request.failureReason}</p>}
                                            {request.providerTrackingId && <p className="mt-1 text-xs text-slate-500">IntaSend tracking: {request.providerTrackingId}</p>}
                                        </div>
                                        <div className="flex items-center justify-between gap-4 md:justify-end">
                                            <strong className="whitespace-nowrap text-lg">KES {request.amount.toFixed(2)}</strong>
                                            {request.status === "pending" && (
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={reviewWithdrawal.isPending}
                                                        onClick={() => reviewWithdrawal.mutate({ id: request.id, action: "reject" })}
                                                        className="rounded-lg border border-red-800 px-3 py-2 text-sm text-red-300 hover:bg-red-950 disabled:opacity-50"
                                                    >Reject</button>
                                                    <button
                                                        type="button"
                                                        disabled={reviewWithdrawal.isPending}
                                                        onClick={() => reviewWithdrawal.mutate({ id: request.id, action: "approve" })}
                                                        className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                                                    >{reviewWithdrawal.isPending ? "Processing..." : "Approve & pay"}</button>
                                                </div>
                                            )}
                                        </div>
                                    </article>
                                ))}
                            </div> : <EmptyState text="No withdrawal requests yet." />
                        ) : activeTab === "transactions" ? (
                            transactions.length ? <div className="overflow-x-auto">
                                <table className="w-full min-w-[760px] text-left text-sm">
                                    <thead className="bg-slate-950 text-xs uppercase text-slate-400"><tr>
                                        <th className="p-4">Date</th><th className="p-4">Wallet owner</th><th className="p-4">Type / sale details</th><th className="p-4">Reference</th><th className="p-4 text-right">Amount</th><th className="p-4">Status</th>
                                    </tr></thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {transactions.map((transaction) => (
                                            <tr key={transaction.id}>
                                                <td className="p-4 text-slate-400">{new Date(transaction.createdAt).toLocaleString()}</td>
                                                <td className="p-4"><span className="block">{transaction.owner?.name ?? "Account"}</span><span className="text-xs text-slate-500">{transaction.ownerType} · {transaction.owner?.email ?? transaction.ownerId}</span></td>
                                                <td className="p-4">
                                                    <p className="capitalize">{transaction.type.replaceAll("_", " ")}</p>
                                                    {transaction.metadata?.buyerName && (
                                                        <p className="mt-1 text-xs text-slate-400">
                                                            Buyer: {transaction.metadata.buyerName}
                                                            {transaction.metadata.products?.length
                                                                ? ` · ${transaction.metadata.products.map((item: any) => `${item.title} × ${item.quantity}`).join(", ")}`
                                                                : ""}
                                                        </p>
                                                    )}
                                                    {transaction.metadata?.platformFeePercent != null && (
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {transaction.metadata.platformFeePercent}% service fee deducted
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="max-w-44 truncate p-4 text-xs text-slate-400">{transaction.reference}</td>
                                                <td className={`p-4 text-right font-semibold ${transaction.amount < 0 ? "text-slate-200" : "text-emerald-300"}`}>KES {Math.abs(transaction.amount).toFixed(2)}</td>
                                                <td className="p-4"><StatusBadge status={transaction.status} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div> : <EmptyState text="No wallet transactions yet." />
                        ) : payments.length ? <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead className="bg-slate-950 text-xs uppercase text-slate-400"><tr>
                                    <th className="p-4">Created</th><th className="p-4">Reference</th><th className="p-4">Type</th><th className="p-4">Payment</th><th className="p-4 text-right">Amount</th><th className="p-4">Status</th>
                                </tr></thead>
                                <tbody className="divide-y divide-slate-800">
                                    {payments.map((payment) => (
                                        <tr key={payment.id}>
                                            <td className="p-4 text-slate-400">{new Date(payment.createdAt).toLocaleString()}</td>
                                            <td className="p-4 text-xs">{payment.apiRef}</td>
                                            <td className="p-4 capitalize">{payment.kind.replaceAll("_", " ")}</td>
                                            <td className="p-4 uppercase">{payment.paymentMethod}</td>
                                            <td className="p-4 text-right">KES {payment.amount.toFixed(2)}</td>
                                            <td className="p-4"><StatusBadge status={payment.status} />{payment.failureReason && <p className="mt-1 max-w-44 text-xs text-red-300">{payment.failureReason}</p>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div> : <EmptyState text="No IntaSend payment sessions yet." />}
                </section>
                <p className="mt-4 text-xs leading-5 text-slate-500">Approving a request submits an IntaSend MPESA-B2C payout. Ensure the platform IntaSend wallet is funded and disbursements are enabled.</p>
            </div>
        </main>
    );
};

const SummaryCard = ({ icon, label, value }: { icon: ReactNode; label: string; value: number }) => (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <span className="text-blue-300">{icon}</span><p className="mt-3 text-sm text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
);

const StatusBadge = ({ status }: { status: string }) => {
    const theme = ["paid", "complete", "completed"].includes(status.toLowerCase())
        ? "bg-emerald-950 text-emerald-300"
        : ["failed", "rejected", "canceled"].includes(status.toLowerCase())
            ? "bg-red-950 text-red-300"
            : ["pending", "processing", "clearing"].includes(status.toLowerCase())
                ? "bg-amber-950 text-amber-200"
                : "bg-slate-800 text-slate-300";
    return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs capitalize ${theme}`}>{status}</span>;
};

const EmptyState = ({ text }: { text: string }) => (
    <div className="p-12 text-center text-sm text-slate-400"><Wallet className="mx-auto mb-3 h-8 w-8 text-slate-600" />{text}</div>
);

export default FinancePage;
