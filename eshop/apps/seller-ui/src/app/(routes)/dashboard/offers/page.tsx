"use client";

import { useQuery } from "@tanstack/react-query";
import { BadgePercent, CalendarDays, Plus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import axiosInstance from "apps/seller-ui/src/utils/axiosInstance";

const SellerOffersPage = () => {
    const { data, isLoading, isError } = useQuery({
        queryKey: ["seller-offers"],
        queryFn: async () => {
            const [discountResponse, eventResponse] = await Promise.all([
                axiosInstance.get("/product/api/get-discount-codes"),
                axiosInstance.get("/product/api/get-seller-events"),
            ]);
            return {
                discountCodes: discountResponse.data.discount_codes ?? [],
                events: eventResponse.data.events ?? [],
            };
        },
        refetchInterval: 60_000,
    });
    const discountCodes = data?.discountCodes ?? [];
    const events = data?.events ?? [];

    return (
        <main className="min-h-screen bg-slate-950 p-5 text-slate-100 md:p-8">
            <div className="mx-auto max-w-6xl">
                <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-sm text-slate-400">Seller dashboard / Promotions</p>
                        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold md:text-3xl"><BadgePercent className="h-7 w-7 text-emerald-300" /> Offers you created</h1>
                        <p className="mt-2 text-sm text-slate-400">Your discount codes and submitted product promotions, loaded from your seller account.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link href="/dashboard/discount-codes" className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-900"><Plus className="h-4 w-4" /> Discount code</Link>
                        <Link href="/dashboard/create-event" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium hover:bg-blue-500"><Plus className="h-4 w-4" /> Product offer</Link>
                    </div>
                </header>

                {isError ? (
                    <p role="alert" className="rounded-xl border border-red-800 bg-red-950 p-4 text-red-200">Could not load your offers. Confirm you are signed in, then refresh.</p>
                ) : isLoading ? (
                    <p className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-400">Loading your offers...</p>
                ) : (
                    <div className="grid gap-5 lg:grid-cols-2">
                        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <div><h2 className="font-semibold">Discount codes</h2><p className="mt-1 text-xs text-slate-400">Codes owned by your seller account</p></div>
                                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs">{discountCodes.length}</span>
                            </div>
                            {discountCodes.length ? (
                                <div className="space-y-3">
                                    {discountCodes.map((offer: any) => (
                                        <article key={offer.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div><h3 className="font-medium">{offer.public_name}</h3><p className="mt-1 font-mono text-sm text-emerald-300">{offer.discountCode}</p></div>
                                                <span className="rounded-full bg-emerald-950 px-2.5 py-1 text-xs text-emerald-200">{offer.discountValue}{offer.discountType === "percentage" || offer.discountType === "percent" ? "%" : " KES"} off</span>
                                            </div>
                                            <p className="mt-3 text-xs text-slate-500">Created {new Date(offer.createdAt).toLocaleDateString()}</p>
                                        </article>
                                    ))}
                                </div>
                            ) : <EmptyState>No discount codes created yet.</EmptyState>}
                        </section>

                        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <div><h2 className="font-semibold">Product promotions</h2><p className="mt-1 text-xs text-slate-400">Events and offers submitted for your products</p></div>
                                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs">{events.length}</span>
                            </div>
                            {events.length ? (
                                <div className="space-y-3">
                                    {events.map((event: any) => (
                                        <article key={event.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0"><h3 className="truncate font-medium">{event.title}</h3><p className="mt-1 text-sm text-slate-400">KES {Number(event.sale_price).toLocaleString()}</p></div>
                                                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${
                                                    event.eventStatus === "Approved" ? "bg-emerald-950 text-emerald-200" :
                                                    event.eventStatus === "Rejected" ? "bg-red-950 text-red-200" :
                                                    "bg-amber-950 text-amber-200"
                                                }`}>{event.eventStatus || "Pending review"}</span>
                                            </div>
                                            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                                                <CalendarDays className="h-3.5 w-3.5" />
                                                {event.starting_date ? new Date(event.starting_date).toLocaleDateString() : "No start date"}
                                                {" – "}
                                                {event.ending_date ? new Date(event.ending_date).toLocaleDateString() : "No end date"}
                                            </p>
                                        </article>
                                    ))}
                                </div>
                            ) : <EmptyState>No product promotions created yet.</EmptyState>}
                        </section>
                    </div>
                )}
            </div>
        </main>
    );
};

const EmptyState = ({ children }: { children: ReactNode }) => (
    <p className="rounded-xl border border-dashed border-slate-700 px-4 py-10 text-center text-sm text-slate-500">{children}</p>
);

export default SellerOffersPage;
