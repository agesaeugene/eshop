"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Smartphone, Wallet, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import axiosInstance from "apps/user-ui/src/utils/axiosInstance";
import { useStore } from "apps/user-ui/src/store";

const CheckoutPage = () => {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("sessionId");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [paymentStarted, setPaymentStarted] = useState(false);
    const [actionError, setActionError] = useState("");
    const [paymentNotice, setPaymentNotice] = useState("");
    const sessionQuery = useQuery({
        queryKey: ["checkout-session", sessionId],
        queryFn: async () => (await axiosInstance.get(`/order/api/verifying-payment-session?sessionId=${encodeURIComponent(sessionId!)}`)).data.session,
        enabled: !!sessionId,
        retry: 1,
    });
    const statusQuery = useQuery({
        queryKey: ["wallet-payment-status", sessionId],
        queryFn: async () => (await axiosInstance.get(`/order/api/payment-status?sessionId=${encodeURIComponent(sessionId!)}`)).data,
        enabled: !!sessionId && paymentStarted,
        refetchInterval: (query) => ["paid", "failed", "canceled"].includes(query.state.data?.status) ? false : 10000,
    });
    const paymentMutation = useMutation({
        mutationFn: async () => {
            if (!sessionId) throw new Error("Checkout session is missing.");
            if (sessionQuery.data.paymentMethod === "wallet") {
                return axiosInstance.post(`/order/api/checkout/${encodeURIComponent(sessionId)}/wallet`);
            }
            return axiosInstance.post(`/order/api/checkout/${encodeURIComponent(sessionId)}/mpesa`, { phoneNumber });
        },
        onSuccess: async (response) => {
            setActionError("");
            setPaymentNotice(response.data.message || "");
            setPaymentStarted(true);
            if (response.data.status === "paid") {
                useStore.setState({ cart: [] });
            }
            await statusQuery.refetch();
        },
        onError: (error: any) => setActionError(error.response?.data?.message || error.message || "Could not start payment."),
    });

    useEffect(() => {
        if (statusQuery.data?.status === "paid") useStore.setState({ cart: [] });
    }, [statusQuery.data?.status]);

    if (!sessionId) {
        return <MessagePanel error title="Invalid checkout" message="This checkout link is missing its payment session." />;
    }
    if (sessionQuery.isLoading) {
        return <div className="flex min-h-[65vh] items-center justify-center text-slate-600"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Preparing secure checkout...</div>;
    }
    if (sessionQuery.isError || !sessionQuery.data) {
        return <MessagePanel error title="Checkout unavailable" message={(sessionQuery.error as any)?.response?.data?.message || "This checkout session could not be loaded. Return to your cart and try again."} />;
    }

    const session = sessionQuery.data;
    const status = statusQuery.data?.status || session.status;
    const paid = status === "paid";
    const failed = ["failed", "canceled"].includes(status);
    const isWalletPayment = session.paymentMethod === "wallet";
    const displayedAmount = isWalletPayment ? session.totalAmount : session.paymentAmount;

    if (paid) {
        return (
            <main className="mx-auto flex min-h-[65vh] max-w-xl items-center justify-center px-5">
                <div className="w-full rounded-2xl border border-green-200 bg-white p-8 text-center shadow-sm">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
                    <h1 className="mt-4 text-2xl font-bold text-slate-900">Payment confirmed</h1>
                    <p className="mt-2 text-slate-600">Your order is confirmed. Seller proceeds will appear in their wallet after IntaSend settlement.</p>
                    <Link href="/profile?active=My%20Orders" className="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">
                        View your orders
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto min-h-[65vh] max-w-2xl px-5 py-12">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <p className="text-sm font-medium text-blue-700">Secure checkout · M-Pesa / wallet</p>
                <h1 className="mt-2 text-2xl font-bold text-slate-900">Complete your payment</h1>
                <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 p-4">
                    <span className="text-sm text-slate-600">{isWalletPayment ? "Wallet payment" : "M-Pesa amount (KES)"}</span>
                    <strong className="text-xl text-slate-900">KES {Number(displayedAmount).toFixed(2)}</strong>
                </div>
                {session.kind === "purchase" && (
                    <div className="mt-3 flex justify-between text-sm text-slate-600">
                        <span>Delivery fee</span>
                        <span>KES {Number(session.deliveryFee ?? 0).toFixed(2)}</span>
                    </div>
                )}

                {isWalletPayment ? (
                    <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                        <Wallet className="mr-2 inline h-4 w-4" />
                        This will be deducted from your SokoJamo wallet. You can top it up from your <Link href="/wallet" className="font-semibold underline">wallet page</Link>.
                    </div>
                ) : (
                    <label className="mt-6 block text-sm font-medium text-slate-700">
                        M-Pesa phone number
                        <div className="relative mt-2">
                            <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                                placeholder="07XXXXXXXX or 2547XXXXXXXX"
                                value={phoneNumber}
                                onChange={(event) => setPhoneNumber(event.target.value)}
                                className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                        <span className="mt-2 block text-xs font-normal text-slate-500">Enter the number that should receive the M-Pesa PIN prompt. You can change it before sending the request. Your order is created only after payment is confirmed.</span>
                    </label>
                )}

                {actionError && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</p>}
                {statusQuery.isError && <p role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Could not refresh payment status. This page will keep checking; do not pay twice.</p>}
                {statusQuery.data?.statusCheckWarning && <p role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{statusQuery.data.statusCheckWarning}</p>}
                {failed && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{statusQuery.data?.failureReason || "Payment did not complete. You can try again."}</p>}

                {paymentStarted && !failed && (
                    <div role="status" className="mt-5 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                        <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
                        {isWalletPayment
                            ? "Confirming wallet payment..."
                            : paymentNotice || (status === "initiating"
                                ? statusQuery.data?.failureReason || "Checking the payment request. Do not start another payment."
                                : "Payment prompt sent. Enter your M-Pesa PIN and keep this page open while we confirm.")}
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => paymentMutation.mutate()}
                    disabled={paymentMutation.isPending || (!isWalletPayment && !phoneNumber.trim()) || (paymentStarted && !failed)}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {paymentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {paymentMutation.isPending ? "Starting payment..." : failed ? "Try payment again" : isWalletPayment ? "Pay from wallet" : "Send M-Pesa prompt"}
                </button>
                <Link href="/cart" className="mt-4 block text-center text-sm text-slate-500 hover:text-blue-700">Return to cart</Link>
            </div>
        </main>
    );
};

const MessagePanel = ({ error, title, message }: { error?: boolean; title: string; message: string }) => (
    <main className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-5">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center">
            {error ? <XCircle className="mx-auto h-10 w-10 text-red-500" /> : <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />}
            <h1 className="mt-4 text-xl font-bold text-slate-900">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
            <Link href="/cart" className="mt-5 inline-block rounded-lg bg-blue-600 px-4 py-2 text-white">Back to cart</Link>
        </div>
    </main>
);

export default CheckoutPage;
