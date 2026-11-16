"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CalendarPlus, Package } from "lucide-react";
import { useState } from "react";
import axiosInstance from "apps/seller-ui/src/utils/axiosInstance";

const CreateEventPage = () => {
    const queryClient = useQueryClient();
    const [productId, setProductId] = useState("");
    const [startingDate, setStartingDate] = useState("");
    const [endingDate, setEndingDate] = useState("");
    const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const { data: products = [], isLoading, isError } = useQuery({
        queryKey: ["shop-products"],
        queryFn: async () => {
            const response = await axiosInstance.get("/product/api/get-shop-products");
            return response.data.products;
        },
    });

    const mutation = useMutation({
        mutationFn: async () => axiosInstance.post("/product/api/create-event", {
            productId,
            startingDate,
            endingDate,
        }),
        onSuccess: async () => {
            setNotice({ type: "success", text: "Event submitted. It will appear in the storefront after admin approval." });
            setProductId("");
            setStartingDate("");
            setEndingDate("");
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["seller-events"] }),
                queryClient.invalidateQueries({ queryKey: ["shop-products"] }),
            ]);
        },
        onError: (error: any) => {
            setNotice({
                type: "error",
                text: error.response?.data?.message || "Could not submit the event. Please try again.",
            });
        },
    });

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setNotice(null);
        mutation.mutate();
    };

    const availableProducts = products.filter((product: any) => !product.isDeleted);

    return (
        <main className="min-h-screen bg-slate-950 p-5 text-slate-100 md:p-8">
            <div className="mx-auto max-w-4xl">
                <div className="mb-7 flex items-center gap-4">
                    <span className="rounded-xl bg-blue-500/10 p-3 text-blue-300">
                        <CalendarPlus className="h-7 w-7" />
                    </span>
                    <div>
                        <p className="text-sm font-medium text-blue-300">Seller dashboard / Events</p>
                        <h1 className="text-2xl font-bold md:text-3xl">Create a product event</h1>
                        <p className="mt-1 text-sm text-slate-400">
                            Submit a product promotion for admin review before it is published.
                        </p>
                    </div>
                </div>

                <div className="grid gap-5 md:grid-cols-[1.4fr_0.8fr]">
                    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-7">
                        <label className="block space-y-2">
                            <span className="flex items-center gap-2 text-sm font-medium">
                                <Package className="h-4 w-4 text-slate-400" /> Product
                            </span>
                            <select
                                required
                                value={productId}
                                onChange={(event) => setProductId(event.target.value)}
                                disabled={isLoading || availableProducts.length === 0}
                                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-blue-500"
                            >
                                <option value="">
                                    {isLoading ? "Loading products..." : "Select a product"}
                                </option>
                                {availableProducts.map((product: any) => (
                                    <option key={product.id} value={product.id}>
                                        {product.title} — KES {product.sale_price}
                                    </option>
                                ))}
                            </select>
                            {isError && <span className="text-xs text-red-300">Could not load your products.</span>}
                            {!isLoading && !isError && availableProducts.length === 0 && (
                                <span className="text-xs text-amber-300">Create a product before submitting an event.</span>
                            )}
                        </label>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="block space-y-2">
                                <span className="text-sm font-medium">Event starts</span>
                                <input
                                    required
                                    type="datetime-local"
                                    value={startingDate}
                                    onChange={(event) => setStartingDate(event.target.value)}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-blue-500"
                                />
                            </label>
                            <label className="block space-y-2">
                                <span className="text-sm font-medium">Event ends</span>
                                <input
                                    required
                                    type="datetime-local"
                                    min={startingDate || undefined}
                                    value={endingDate}
                                    onChange={(event) => setEndingDate(event.target.value)}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-blue-500"
                                />
                            </label>
                        </div>

                        {notice && (
                            <p
                                role={notice.type === "error" ? "alert" : "status"}
                                className={`rounded-lg border p-3 text-sm ${
                                    notice.type === "success"
                                        ? "border-green-800 bg-green-950/50 text-green-200"
                                        : "border-red-800 bg-red-950/50 text-red-200"
                                }`}
                            >
                                {notice.text}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={mutation.isPending || !productId}
                            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <CalendarPlus className="h-4 w-4" />
                            {mutation.isPending ? "Submitting..." : "Submit for review"}
                        </button>
                    </form>

                    <aside className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-5">
                        <CalendarClock className="mb-4 h-6 w-6 text-blue-300" />
                        <h2 className="font-semibold">How event review works</h2>
                        <ol className="mt-4 space-y-4 text-sm text-slate-400">
                            <li><span className="mr-2 font-semibold text-blue-300">01</span>Choose an active product and set its event window.</li>
                            <li><span className="mr-2 font-semibold text-blue-300">02</span>An admin reviews your dates and event details.</li>
                            <li><span className="mr-2 font-semibold text-blue-300">03</span>Approved events appear in All Events and the storefront.</li>
                        </ol>
                    </aside>
                </div>
            </div>
        </main>
    );
};

export default CreateEventPage;
