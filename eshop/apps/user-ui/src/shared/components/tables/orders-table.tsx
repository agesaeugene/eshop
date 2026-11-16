"use client";

import React from "react";
import {
    ColumnDef,
    useReactTable,
    getCoreRowModel,
    flexRender,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import axiosInstance from "apps/user-ui/src/utils/axiosInstance";
import { ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";

type Order = {
    id: string;
    status: string;
    total: number;
    createdAt: string;
};

const OrdersTable = () => {
    const router = useRouter();

    const { data, isLoading } = useQuery<Order[]>({
        queryKey: ["user-orders"],
        queryFn: async () => {
            const res = await axiosInstance.get(`/order/api/get-user-orders`);
            return res.data.orders;
        },
    });

    const columns: ColumnDef<Order>[] = [
        {
            accessorKey: "id",
            header: "Order Id",
            cell: (info) => info.getValue<string>()?.slice(-6).toUpperCase(),
        },
        {
            accessorKey: "status",
            header: "Status",
        },
        {
            accessorKey: "total",
            header: "Total ($)",
            cell: (info) => `$${info.getValue<number>()?.toFixed(2)}`,
        },
        {
            accessorKey: "createdAt",
            header: "Date",
            cell: (info) =>
                new Date(info.getValue<string>()).toLocaleDateString(),
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
                <button
                    onClick={() => router.push(`/order/${row.original.id}`)}
                    className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                >
                    Track Order <ArrowUpRight className="w-3 h-3" />
                </button>
            ),
        },
    ];

    const table = useReactTable({
        data: data ?? [],
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    if (isLoading) {
        return <p className="text-sm text-gray-600">Loading Orders ...</p>;
    }

    if (!data || data.length === 0) {
        return (
            <p className="flex items-center justify-center text-center h-[30vh] text-gray-500">
                No Orders available yet
            </p>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
                <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <tr
                            key={headerGroup.id}
                            className="border-b border-b-gray-200 text-left"
                        >
                            {headerGroup.headers.map((header) => (
                                <th
                                    key={header.id}
                                    className="py-2 px-3 font-semibold text-gray-700"
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
                    {table.getRowModel().rows.map((row) => (
                        <tr
                            key={row.id}
                            className="border-b border-b-gray-200 hover:bg-gray-50"
                        >
                            {row.getVisibleCells().map((cell) => (
                                <td key={cell.id} className="py-2 px-3 text-gray-700">
                                    {flexRender(
                                        cell.column.columnDef.cell,
                                        cell.getContext()
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default OrdersTable;