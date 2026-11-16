"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Loader2, Wallet } from "lucide-react";
import { useState } from "react";
import axiosInstance from "apps/seller-ui/src/utils/axiosInstance";

const SellerWalletPage = () => {
    const queryClient = useQueryClient();
    const [amount, setAmount] = useState("");
    const [message, setMessage] = useState("");
    const walletQuery = useQuery({
        queryKey: ["seller-wallet"],
        queryFn: async () => (await axiosInstance.get("/order/api/wallet")).data,
        refetchInterval: 30_000,
    });
    const withdrawal = useMutation({
        mutationFn: async () => axiosInstance.post("/order/api/wallet/withdrawals", { amount: Number(amount) }),
        onSuccess: async () => {
            setMessage("Withdrawal request submitted. An administrator must review it before payout.");
            setAmount("");
            await queryClient.invalidateQueries({ queryKey: ["seller-wallet"] });
        },
        onError: (error: any) => setMessage(error.response?.data?.message || "Could not create withdrawal request."),
    });
    const wallet = walletQuery.data?.wallet;

    return (
        <main className="min-h-screen bg-slate-950 p-5 text-slate-100 md:p-8">
            <div className="mx-auto max-w-5xl">
                <header className="mb-7 flex items-center gap-3">
                    <span className="rounded-xl bg-blue-500/10 p-3 text-blue-300"><Wallet className="h-6 w-6" /></span>
                    <div><p className="text-sm text-slate-400">Seller dashboard / Finance</p><h1 className="text-2xl font-bold md:text-3xl">Wallet</h1></div>
                </header>
                {walletQuery.isError && <p role="alert" className="mb-4 rounded-lg border border-red-800 bg-red-950 p-3 text-red-200">Could not load wallet details.</p>}
                <div className="grid gap-4 sm:grid-cols-2">
                    <BalanceCard label="Available to withdraw" amount={wallet?.balance} />
                    <BalanceCard label="Pending IntaSend settlement" amount={wallet?.pendingBalance} />
                </div>
                <div className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
                    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6">
                        <h2 className="font-semibold">Request M-Pesa withdrawal</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-400">Available balance is reserved while your request awaits admin review. Approved withdrawals are sent to the M-Pesa number saved at seller registration. Minimum withdrawal: KES 10.</p>
                        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-300">
                            Payout number: <span className="font-medium text-white">{wallet?.payoutPhoneNumber || "Not set — contact support to add one"}</span>
                        </div>
                        <label className="mt-5 block text-sm text-slate-300">Amount (KES)
                            <input type="number" min="10" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white" />
                        </label>
                        <button
                            type="button"
                            disabled={withdrawal.isPending || Number(amount) < 10 || !wallet?.payoutPhoneNumber}
                            onClick={() => { setMessage(""); withdrawal.mutate(); }}
                            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                        >
                            {withdrawal.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
                            {withdrawal.isPending ? "Submitting..." : "Request withdrawal"}
                        </button>
                        {message && <p role={withdrawal.isError ? "alert" : "status"} className={`mt-3 text-sm ${withdrawal.isError ? "text-red-300" : "text-emerald-300"}`}>{message}</p>}
                    </section>
                    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6">
                        <h2 className="font-semibold">Withdrawal history</h2>
                        {walletQuery.isLoading ? <p className="py-8 text-sm text-slate-400">Loading wallet activity...</p>
                            : walletQuery.data?.withdrawals?.length ? <div className="mt-4 space-y-3">
                                {walletQuery.data.withdrawals.map((request: any) => (
                                    <article key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4">
                                        <div><p className="font-medium">KES {request.amount.toFixed(2)}</p><p className="mt-1 text-xs text-slate-400">To {request.phoneNumber} · {new Date(request.createdAt).toLocaleString()}</p></div>
                                        <span className={`rounded-full px-2.5 py-1 text-xs capitalize ${request.status === "paid" ? "bg-emerald-950 text-emerald-300" : request.status === "rejected" || request.status === "failed" ? "bg-red-950 text-red-300" : "bg-amber-950 text-amber-200"}`}>{request.status}</span>
                                        {request.failureReason && <p className="basis-full text-xs text-red-300">{request.failureReason}</p>}
                                    </article>
                                ))}
                            </div> : <p className="py-8 text-sm text-slate-400">No withdrawal requests yet.</p>}
                    </section>
                </div>
                <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6">
                    <h2 className="font-semibold">Wallet ledger</h2>
                    {walletQuery.data?.transactions?.length ? <div className="mt-3 divide-y divide-slate-800">
                        {walletQuery.data.transactions.map((transaction: any) => (
                            <div key={transaction.id} className="flex items-center justify-between gap-4 py-3">
                                <div>
                                    <p className="text-sm font-medium capitalize">{transaction.type.replaceAll("_", " ")}</p>
                                    <p className="mt-1 text-xs text-slate-500">{transaction.description} · {new Date(transaction.createdAt).toLocaleString()}</p>
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
                                            Platform fee: {transaction.metadata.platformFeePercent}% · Seller proceeds: 90%
                                        </p>
                                    )}
                                </div>
                                <span className="shrink-0 text-sm font-semibold">KES {Math.abs(transaction.amount).toFixed(2)}</span>
                            </div>
                        ))}
                    </div> : <p className="py-6 text-sm text-slate-400">Sales credited after IntaSend settlement will appear here.</p>}
                </section>
            </div>
        </main>
    );
};

const BalanceCard = ({ label, amount }: { label: string; amount?: number }) => (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-sm text-slate-400">{label}</p>
        <p className="mt-2 text-3xl font-bold text-white">KES {Number(amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
    </section>
);

export default SellerWalletPage;
