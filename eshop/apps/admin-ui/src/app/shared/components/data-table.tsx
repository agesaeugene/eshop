"use client";

import React from "react";
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    ColumnDef,
} from "@tanstack/react-table";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

type Pagination = {
    page: number;
    totalPages: number;
    totalItems: number;
    label: string;
    onChange: (page: number) => void;
};

type DataTableProps<T> = {
    data: T[];
    columns: ColumnDef<T, any>[];
    isLoading?: boolean;
    emptyText?: string;
    pagination?: Pagination;
};

export function DataTable<T>({
    data,
    columns,
    isLoading,
    emptyText = "No results found.",
    pagination,
}: DataTableProps<T>) {
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <>
            <div className="overflow-x-auto bg-gray-900 rounded-lg p-4">
                {isLoading ? (
                    <p className="text-center text-white py-6">Loading...</p>
                ) : (
                    <table className="w-full text-white text-sm">
                        <thead>
                            {table.getHeaderGroups().map((hg) => (
                                <tr key={hg.id} className="border-b border-gray-800">
                                    {hg.headers.map((header) => (
                                        <th
                                            key={header.id}
                                            className="p-3 text-left text-gray-400 font-medium"
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
                                        {emptyText}
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

            {pagination && (
                <div className="flex items-center justify-between mt-4 text-white">
                    <span className="text-sm text-gray-400">
                        Page {pagination.page} of {pagination.totalPages || 1} (
                        {pagination.totalItems} {pagination.label})
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() =>
                                pagination.onChange(Math.max(pagination.page - 1, 1))
                            }
                            disabled={pagination.page === 1}
                            className="p-2 bg-gray-800 rounded disabled:opacity-40"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            onClick={() =>
                                pagination.onChange(
                                    Math.min(pagination.page + 1, pagination.totalPages)
                                )
                            }
                            disabled={pagination.page >= pagination.totalPages}
                            className="p-2 bg-gray-800 rounded disabled:opacity-40"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

export const SearchBar = ({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
}) => (
    <div className="my-4 flex items-center bg-gray-900 p-2 rounded-md">
        <Search size={18} className="text-gray-400 mr-4" />
        <input
            type="text"
            placeholder={placeholder}
            className="w-full bg-transparent text-white outline-none"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    </div>
);

export const RoleBadge = ({ role }: { role?: string | null }) => {
    const styles: Record<string, string> = {
        admin: "bg-purple-600 text-white",
        seller: "bg-blue-600 text-white",
        user: "bg-gray-600 text-white",
    };
    const key = role ?? "user";
    return (
        <span
            className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                styles[key] ?? styles.user
            }`}
        >
            {key}
        </span>
    );
};

export const Avatar = ({ name, url }: { name?: string; url?: string | null }) =>
    url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name ?? "avatar"} className="w-9 h-9 rounded-full object-cover" />
    ) : (
        <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-sm font-semibold uppercase">
            {name?.[0] ?? "?"}
        </div>
    );