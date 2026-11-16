"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock3 } from "lucide-react";
import axiosInstance from "apps/seller-ui/src/utils/axiosInstance";

const statusStyles: Record<string, string> = {
    Pending: "border-amber-700 bg-amber-950/50 text-amber-200",
    Approved: "border-green-700 bg-green-950/50 text-green-200",
    Rejected: "border-red-700 bg-red-950/50 text-red-200",
};

const formatDate = (date: string | null) =>
    date ? new Date(date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Not set";

const AllEventsPage = () => {
    const { data: events = [], isLoading, isError, error } = useQuery({
        queryKey: ["seller-events"],
        queryFn: async () => {
            const response = await axiosInstance.get("/product/api/get-seller-events");
            return response.data.events;
        },
        refetchInterval: 30_000,
    });

    return (
        <main className="min-h-screen bg-slate-950 p-5 text-slate-100 md:p-8">
            <div className="mx-auto max-w-6xl">
                <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-blue-300">Seller dashboard / Events</p>
                        <h1 className="mt-1 text-2xl font-bold md:text-3xl">All Events</h1>
                        <p className="mt-1 text-sm text-slate-400">Track review status and event dates for your products.</p>
                    </div>
                    <span className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300">
                        {events.length} {events.length === 1 ? "event" : "events"}
                    </span>
                </div>

                {isLoading ? (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-400">
                        Loading your events...
                    </div>
                ) : isError ? (
                    <div role="alert" className="rounded-2xl border border-red-800 bg-red-950/50 p-5 text-red-200">
                        {(error as any)?.response?.data?.message || "Could not load your events. Please refresh and try again."}
                    </div>
                ) : events.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-16 text-center">
                        <CalendarDays className="mx-auto h-10 w-10 text-slate-500" />
                        <h2 className="mt-4 text-lg font-semibold">No events yet</h2>
                        <p className="mt-2 text-sm text-slate-400">Create a product event to submit it for admin review.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 lg:grid-cols-2">
                        {events.map((event: any) => {
                            const status = event.eventStatus || "Approved";
                            return (
                                <article key={event.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                                    <div className="flex gap-4 p-4 md:p-5">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={event.images?.[0]?.url || "/placeholder.png"}
                                            alt={event.title}
                                            className="h-24 w-24 shrink-0 rounded-xl border border-slate-700 bg-slate-950 object-cover"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <h2 className="font-semibold text-white">{event.title}</h2>
                                                <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[status] || statusStyles.Approved}`}>
                                                    {status === "Approved" ? "Approved · live" : status}
                                                </span>
                                            </div>
                                            <p className="mt-2 text-sm text-slate-400">{event.category} · KES {event.sale_price}</p>
                                            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
                                                <span className="flex items-center gap-1.5">
                                                    <CalendarDays className="h-3.5 w-3.5" />
                                                    Starts {formatDate(event.starting_date)}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Clock3 className="h-3.5 w-3.5" />
                                                    Ends {formatDate(event.ending_date)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
};

export default AllEventsPage;
