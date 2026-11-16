"use client";

import React, { useMemo, useState, useDeferredValue } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
} from "@tanstack/react-table";
import { Search, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import BreadCrumbs from "../../shared/components/breadcrumbs";
import axiosInstance from "../../utils/axiosinstance";
import { Check, X } from "lucide-react";

const LIMIT = 10;

// quote a value and escape inner quotes so commas don't break the CSV
const csvCell = (value: unknown) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString() : "-";

const EventsPage = () => {
    const [globalFilter, setGlobalFilter] = useState("");
    const deferredFilter = useDeferredValue(globalFilter);
    const [page, setPage] = useState(1);
    const queryClient = useQueryClient();
    const [actionError, setActionError] = useState("");

    const reviewEvent = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: "Approved" | "Rejected" }) =>
            axiosInstance.put(`/product/api/admin/events/${id}/status`, { status }),
        onSuccess: async () => {
            setActionError("");
            await queryClient.invalidateQueries({ queryKey: ["event-list"] });
        },
        onError: (error: any) => {
            setActionError(error.response?.data?.message || "Could not update event status.");
        },
    });

    const { data, isLoading } = useQuery({
        queryKey: ["event-list", page],
        queryFn: async () => {
            const res = await axiosInstance.get(
                `/admin/api/get-all-events?page=${page}&limit=${LIMIT}`
            );
            return res.data;
        },
        placeholderData: (prev) => prev,
        staleTime: 1000 * 60 * 5,
    });

    const allEvents = useMemo(() => data?.data ?? [], [data]);
    const totalPages = Math.ceil((data?.meta?.totalEvents ?? 0) / LIMIT);

    // search within the current page (title, category, shop, seller)
    const filteredEvents = useMemo(() => {
        const q = deferredFilter.trim().toLowerCase();
        if (!q) return allEvents;

        return allEvents.filter((event: any) =>
            [
                event.title,
                event.category,
                event.shop?.name,
                event.shop?.seller?.name,
                event.shop?.seller?.email,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(q)
        );
    }, [allEvents, deferredFilter]);

    const columns = useMemo(
        () => [
            {
                id: "image",
                header: "Image",
                cell: ({ row }: any) => (
                    <Image
                        src={row.original.images?.[0]?.url || "/placeholder.png"}
                        alt={row.original.title}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded object-cover"
                    />
                ),
            },
            {
                accessorKey: "title",
                header: "Title",
                cell: ({ row }: any) => (
                    <Link
                        href={`${process.env.NEXT_PUBLIC_USER_UI_LINK}/product/${row.original.slug}`}
                        target="_blank"
                        className="hover:text-blue-500 hover:border-b"
                    >
                        {row.original.title}
                    </Link>
                ),
            },
            {
                accessorKey: "sale_price",
                header: "Price",
                cell: ({ row }: any) => `Kes ${row.original.sale_price}`,
            },
            {
                accessorKey: "stock",
                header: "Stock",
            },
            {
                accessorKey: "starting_date",
                header: "Start",
                cell: ({ row }: any) => formatDate(row.original.starting_date),
            },
            {
                accessorKey: "ending_date",
                header: "End",
                cell: ({ row }: any) => formatDate(row.original.ending_date),
            },
            {
                accessorKey: "eventStatus",
                header: "Review",
                cell: ({ row }: any) => (
                    <span className={`rounded-full px-2 py-1 text-xs ${
                        row.original.eventStatus === "Approved"
                            ? "bg-green-900 text-green-200"
                            : row.original.eventStatus === "Rejected"
                                ? "bg-red-900 text-red-200"
                                : "bg-amber-900 text-amber-200"
                    }`}>
                        {row.original.eventStatus || "Legacy event"}
                    </span>
                ),
            },
            {
                id: "shop",
                header: "Shop",
                cell: ({ row }: any) => row.original.shop?.name || "-",
            },
            {
                id: "seller",
                header: "Seller",
                cell: ({ row }: any) => {
                    const seller = row.original.shop?.seller;
                    return (
                        <div className="flex flex-col">
                            <span>{seller?.name ?? "Unknown"}</span>
                            <span className="text-gray-400 text-xs">
                                {seller?.email}
                            </span>
                        </div>
                    );
                },
            },
        ],
        []
    );

    const table = useReactTable({
        data: filteredEvents,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    // export the events currently shown (current page + search filter)
    const exportToCSV = () => {
        const header = [
            "Title",
            "Price",
            "Stock",
            "Start Date",
            "End Date",
            "Shop",
            "Seller",
            "Seller Email",
        ];

        const rows = filteredEvents.map((event: any) =>
            [
                event.title,
                event.sale_price,
                event.stock,
                formatDate(event.starting_date),
                formatDate(event.ending_date),
                event.shop?.name,
                event.shop?.seller?.name,
                event.shop?.seller?.email,
            ]
                .map(csvCell)
                .join(",")
        );

        const csv = [header.map(csvCell).join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `events-page-${page}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="w-full min-h-screen p-8 text-white text-sm">
            {/* Header */}
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-bold tracking-wide">All Events</h2>
                <button
                    onClick={exportToCSV}
                    disabled={filteredEvents.length === 0}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded"
                >
                    <Download size={16} /> Export CSV
                </button>
            </div>

            {filteredEvents.some((event: any) => event.eventStatus === "Pending") && (
                <div className="mt-4 rounded-lg border border-amber-800 bg-gray-900 p-4">
                    <h3 className="mb-3 font-semibold text-amber-200">Pending review</h3>
                    <div className="flex flex-wrap gap-2">
                        {filteredEvents
                            .filter((event: any) => event.eventStatus === "Pending")
                            .map((event: any) => (
                                <div key={event.id} className="flex items-center gap-3 rounded-md bg-gray-800 px-3 py-2">
                                    <span className="max-w-64 truncate text-sm">{event.title}</span>
                                    <button
                                        onClick={() => reviewEvent.mutate({ id: event.id, status: "Approved" })}
                                        disabled={reviewEvent.isPending}
                                        aria-label={`Approve ${event.title}`}
                                        className="rounded bg-green-700 p-1.5 hover:bg-green-600 disabled:opacity-50"
                                    >
                                        <Check size={16} />
                                    </button>
                                    <button
                                        onClick={() => reviewEvent.mutate({ id: event.id, status: "Rejected" })}
                                        disabled={reviewEvent.isPending}
                                        aria-label={`Reject ${event.title}`}
                                        className="rounded bg-red-800 p-1.5 hover:bg-red-700 disabled:opacity-50"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {/* Breadcrumbs */}
            <div className="mb-4">
                <BreadCrumbs title="All Events" />
            </div>

            {actionError && (
                <p className="mb-4 rounded-md border border-red-800 bg-red-950 p-3 text-red-200" role="alert">
                    {actionError}
                </p>
            )}

            {/* Search */}
            <div className="mb-4 flex items-center bg-gray-900 p-2 rounded-md">
                <Search size={18} className="text-gray-400 mr-2" />
                <input
                    type="text"
                    placeholder="Search by title, category, shop or seller..."
                    className="w-full bg-transparent text-white outline-none"
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                />
            </div>

            {/* Table */}
            <div className="overflow-x-auto bg-gray-900 rounded-lg p-4">
                {isLoading ? (
                    <p className="text-center text-white">Loading events...</p>
                ) : (
                    <table className="w-full text-white">
                        <thead>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr
                                    key={headerGroup.id}
                                    className="border-b border-gray-800"
                                >
                                    {headerGroup.headers.map((header) => (
                                        <th
                                            key={header.id}
                                            className="p-3 text-left"
                                        >
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef.header,
                                                      header.getContext()
                                                  )}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={columns.length}
                                        className="p-6 text-center text-gray-400"
                                    >
                                        No events found.
                                    </td>
                                </tr>
                            ) : (
                                table.getRowModel().rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        className="border-b border-gray-800 hover:bg-gray-800 transition"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <td key={cell.id} className="p-3">
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination (outside the table, a div can't live inside tbody) */}
            <div className="flex items-center justify-between mt-4">
                <span className="text-gray-400">
                    Page {page} of {totalPages || 1} (
                    {data?.meta?.totalEvents ?? 0} events)
                </span>
                <div className="flex gap-2">
                    <button
                        onClick={() => setPage((p) => Math.max(p - 1, 1))}
                        disabled={page === 1}
                        className="p-2 bg-gray-800 rounded disabled:opacity-40"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button
                        onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                        disabled={page >= totalPages}
                        className="p-2 bg-gray-800 rounded disabled:opacity-40"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EventsPage;