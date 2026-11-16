"use client";

import { useQuery } from "@tanstack/react-query";
import { MessageSquareQuote, Star } from "lucide-react";
import axiosInstance from "apps/seller-ui/src/utils/axiosInstance";

type Review = {
    id: string;
    ratting: number;
    reviews: string | null;
    createdAt: string;
    user?: { name?: string } | null;
};

const SellerReviewsPage = () => {
    const { data, isLoading, isError } = useQuery({
        queryKey: ["seller-reviews"],
        queryFn: async () => (await axiosInstance.get("/product/api/get-seller-reviews")).data,
        refetchInterval: 60_000,
    });
    const reviews: Review[] = data?.reviews ?? [];
    const average = Number(data?.averageRating ?? 0);

    return (
        <main className="min-h-screen bg-slate-950 p-5 text-slate-100 md:p-8">
            <div className="mx-auto max-w-5xl">
                <header className="mb-6">
                    <p className="text-sm text-slate-400">Seller dashboard / Shop reputation</p>
                    <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold md:text-3xl"><MessageSquareQuote className="h-7 w-7 text-amber-300" /> Customer reviews</h1>
                    <p className="mt-2 text-sm text-slate-400">Reviews submitted for your shop only.</p>
                </header>

                {isError ? (
                    <p role="alert" className="rounded-xl border border-red-800 bg-red-950 p-4 text-red-200">Could not load your shop reviews. Refresh and try again.</p>
                ) : isLoading ? (
                    <p className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-400">Loading reviews...</p>
                ) : (
                    <>
                        <section className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                            <div><p className="text-sm text-slate-400">Shop</p><p className="mt-1 text-lg font-semibold">{data?.shop?.name || "Your shop"}</p></div>
                            <div className="text-right"><p className="flex items-center justify-end gap-1 text-2xl font-bold"><Star className="h-5 w-5 fill-amber-300 text-amber-300" /> {average.toFixed(1)}</p><p className="mt-1 text-xs text-slate-400">{reviews.length} {reviews.length === 1 ? "review" : "reviews"}</p></div>
                        </section>
                        {reviews.length ? (
                            <div className="space-y-3">
                                {reviews.map((review) => (
                                    <article key={review.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <p className="font-medium">{review.user?.name || "Customer"}</p>
                                                <p className="mt-1 text-xs text-slate-500">{new Date(review.createdAt).toLocaleString()}</p>
                                            </div>
                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-950 px-2.5 py-1 text-xs text-amber-200">
                                                <Star className="h-3.5 w-3.5 fill-current" /> {review.ratting} / 5
                                            </span>
                                        </div>
                                        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-300">{review.reviews || "No written feedback provided."}</p>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-10 text-center text-sm text-slate-400">Customer reviews for your shop will appear here.</div>
                        )}
                    </>
                )}
            </div>
        </main>
    );
};

export default SellerReviewsPage;
