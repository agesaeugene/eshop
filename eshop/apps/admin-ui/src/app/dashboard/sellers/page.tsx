"use client";

import React, { useMemo, useState, useDeferredValue } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import BreadCrumbs from "../../shared/components/breadcrumbs";
import axiosInstance from "../../utils/axiosinstance";
import { DataTable, SearchBar, Avatar } from "../../shared/components/data-table";
import { downloadCSV, formatDate } from "../../shared/utils/csv";

const LIMIT = 10;

const SellersPage = () => {
    const [globalFilter, setGlobalFilter] = useState("");
    const deferredFilter = useDeferredValue(globalFilter);
    const [page, setPage] = useState(1);

    const { data, isLoading } = useQuery({
        queryKey: ["admin-sellers", page],
        queryFn: async () => {
            const res = await axiosInstance.get(
                `/admin/api/get-all-sellers?page=${page}&limit=${LIMIT}`
            );
            return res.data;
        },
        placeholderData: (prev) => prev,
        staleTime: 1000 * 60 * 5,
    });

    const allSellers = useMemo(() => data?.data ?? [], [data]);

    const filteredSellers = useMemo(() => {
        const q = deferredFilter.trim().toLowerCase();
        if (!q) return allSellers;
        return allSellers.filter((s: any) =>
            [s.name, s.email, s.shop?.name, s.shop?.address]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(q)
        );
    }, [allSellers, deferredFilter]);

    const columns = useMemo(
        () => [
            {
                id: "shop",
                header: "Shop",
                cell: ({ row }: any) => {
                    const shop = row.original.shop;
                    return (
                        <div className="flex items-center gap-3">
                            <Avatar name={shop?.name ?? row.original.name} url={shop?.avatar?.url} />
                            <span className="font-medium text-purple-400">
                                {shop?.name ?? "No shop yet"}
                            </span>
                        </div>
                    );
                },
            },
            {
                id: "seller",
                header: "Seller",
                cell: ({ row }: any) => (
                    <div className="flex flex-col">
                        <span>{row.original.name}</span>
                        <span className="text-gray-400 text-xs">{row.original.email}</span>
                    </div>
                ),
            },
            {
                id: "address",
                header: "Address",
                cell: ({ row }: any) => (
                    <span className="text-gray-300">{row.original.shop?.address ?? "-"}</span>
                ),
            },
            {
                accessorKey: "createdAt",
                header: "Joined",
                cell: ({ row }: any) => formatDate(row.original.createdAt),
            },
        ],
        []
    );

    const exportCSV = () =>
        downloadCSV(
            `sellers-page-${page}.csv`,
            ["Seller", "Email", "Shop", "Address", "Joined"],
            filteredSellers.map((s: any) => [
                s.name,
                s.email,
                s.shop?.name,
                s.shop?.address,
                formatDate(s.createdAt),
            ])
        );

    return (
        <div className="w-full min-h-screen p-8">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl text-white font-semibold">All Sellers</h2>
                <button
                    onClick={exportCSV}
                    disabled={filteredSellers.length === 0}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-lg"
                >
                    <Download size={16} /> Export CSV
                </button>
            </div>

            <BreadCrumbs title="All Sellers" />

            <SearchBar
                value={globalFilter}
                onChange={setGlobalFilter}
                placeholder="Search by seller, email, shop or address..."
            />

            <DataTable
                data={filteredSellers}
                columns={columns}
                isLoading={isLoading}
                emptyText="No sellers found."
                pagination={{
                    page,
                    totalPages: Math.ceil((data?.meta?.totalSellers ?? 0) / LIMIT),
                    totalItems: data?.meta?.totalSellers ?? 0,
                    label: "sellers",
                    onChange: setPage,
                }}
            />
        </div>
    );
};

export default SellersPage;