"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine, Loader2, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import axiosInstance from "apps/user-ui/src/utils/axiosInstance";

const WalletPage = () => {
    const queryClient = useQueryClient();
    const [amount, setAmount] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [paymentSessionId, setPaymentSessionId] = useState("");
    const [feedback, setFeedback] = useState("");
    const walletQuery = useQuery({
        queryKey: ["customer-wallet"],
        queryFn: async () => (await axiosInstance.get("/order/api/wallet")).data,
    });
    const statusQuery = useQuery({
        queryKey: ["wallet-payment-status", paymentSessionId],
        queryFn: async () => (await axiosInstance.get(`/order/api/payment-status?sessionId=${encodeURIComponent(paymentSessionId)}`)).data,
        enabled: !!paymentSessionId,
        refetchInterval: (query) => ["paid", "failed", "canceled"].includes(query.state.data?.status) ? false : 3000,
    });
    const topup = useMutation({
        mutationFn: async () => (await axiosInstance.post("/order/api/wallet/topup", { amount: Number(amount), phoneNumber })).data,
        onSuccess: (result) => {
            setPaymentSessionId(result.sessionId);
            setFeedback("M-Pesa prompt sent. Approve it on your phone to add funds.");
        },
        onError: (error: any) => setFeedback(error.response?.data?.message || "Could not start wallet top-up."),
    });

    const paymentStatus = statusQuery.data?.status;
    useEffect(() => {
        if (paymentStatus !== "paid") return;
        setFeedback("Wallet funded successfully.");
        void queryClient.invalidateQueries({ queryKey: ["customer-wallet"] });
    }, [paymentStatus, queryClient]);

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-10 md:px-8">
            <div className="mx-auto max-w-5xl">
                <header className="mb-7 flex items-center gap-3">
                    <span className="rounded-xl bg-blue-100 p-3 text-blue-700"><Wallet className="h-6 w-6" /></span>
                    <div>
                        <p className="text-sm text-slate-500">My account</p>
                        <h1 className="text-2xl font-bold text-slate-900">Wallet</h1>
                    </div>
                </header>
                <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="text-sm text-slate-500">Available balance</p>
                        <p className="mt-2 text-4xl font-bold text-slate-900">
                            KES {Number(walletQuery.data?.wallet?.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">Use your wallet at checkout or add funds securely using M-Pesa.</p>
                        <div className="mt-7 border-t border-slate-100 pt-5">
                            <h2 className="font-semibold text-slate-900">Add money with M-Pesa</h2>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <label className="text-sm text-slate-600">Amount (KES)
                                    <input type="number" min="1" max="100000" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900" />
                                </label>
                                <label className="text-sm text-slate-600">M-Pesa phone
                                    <input type="tel" placeholder="07XXXXXXXX" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900" />
                                </label>
                            </div>
                            <button
                                type="button"
                                disabled={topup.isPending || !amount || !phoneNumber || (paymentSessionId && !["failed", "canceled"].includes(paymentStatus))}
                                onClick={() => {
                                    setFeedback("");
                                    setPaymentSessionId("");
                                    topup.mutate();
                                }}
                                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {topup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />}
                                {topup.isPending ? "Sending prompt..." : "Top up wallet"}
                            </button>
                            {feedback && <p role={paymentStatus === "failed" ? "alert" : "status"} className={`mt-3 text-sm ${paymentStatus === "failed" ? "text-red-600" : "text-slate-600"}`}>{paymentStatus === "failed" ? statusQuery.data?.failureReason || feedback : feedback}</p>}
                            {paymentSessionId && !["paid", "failed", "canceled"].includes(paymentStatus) && (
                                <p className="mt-3 flex items-center gap-2 text-sm text-blue-700"><Loader2 className="h-4 w-4 animate-spin" /> Waiting for IntaSend to confirm your payment...</p>
                            )}
                        </div>
                    </section>
                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-slate-900">Recent activity</h2>
                            <Link href="/profile" className="text-sm text-blue-700 hover:underline">Profile</Link>
                        </div>
                        {walletQuery.isLoading ? <p className="py-8 text-sm text-slate-500">Loading wallet activity...</p>
                            : walletQuery.isError ? <p role="alert" className="py-8 text-sm text-red-600">Could not load wallet activity. Refresh to try again.</p>
                            : walletQuery.data?.transactions?.length ? (
                                <ul className="mt-4 divide-y divide-slate-100">
                                    {walletQuery.data.transactions.map((transaction: any) => (
                                        <li key={transaction.id} className="flex items-center justify-between gap-3 py-3">
                                            <div>
                                                <p className="text-sm font-medium capitalize text-slate-800">{transaction.type.replaceAll("_", " ")}</p>
                                                <p className="mt-1 text-xs text-slate-500">{new Date(transaction.createdAt).toLocaleString()}</p>
                                            </div>
                                            <span className={`text-sm font-semibold ${transaction.amount < 0 ? "text-slate-800" : "text-emerald-700"}`}>
                                                {transaction.amount < 0 ? "−" : "+"} KES {Math.abs(transaction.amount).toFixed(2)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : <p className="py-8 text-sm text-slate-500">No wallet transactions yet.</p>}
                    </section>
                </div>
            </div>
        </main>
    );
};

export default WalletPage;
