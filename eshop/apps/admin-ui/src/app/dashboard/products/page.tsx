"use client";

import React, { useState, useMemo, useDeferredValue } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
} from "@tanstack/react-table";
import { Search, Eye, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import BreadCrumbs from "../../shared/components/breadcrumbs";
import axiosInstance from "../../utils/axiosinstance";

const LIMIT = 10;

// wrap a value in quotes and escape inner quotes so commas don't break the CSV
const csvCell = (value: unknown) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

const AllProductsPage = () => {
    const [globalFilter, setGlobalFilter] = useState("");
    const deferredFilter = useDeferredValue(globalFilter);
    const [page, setPage] = useState(1);

    const { data, isLoading, isError, error } = useQuery({
    queryKey: ["all-products", page],
    queryFn: async () => {
        const res = await axiosInstance.get(
            `/admin/api/get-all-products?page=${page}&limit=${LIMIT}`
        );
        return res.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60 * 5,
});

    const allProducts = useMemo(() => data?.data ?? [], [data]);

    // search within the current page (title, category, shop, seller)
    const filteredProducts = useMemo(() => {
        const q = deferredFilter.trim().toLowerCase();
        if (!q) return allProducts;

        return allProducts.filter((product: any) =>
            [
                product.title,
                product.category,
                product.shop?.name,
                product.shop?.seller?.name,
                product.shop?.seller?.email,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(q)
        );
    }, [allProducts, deferredFilter]);

    const totalPages = Math.ceil((data?.meta?.totalProducts ?? 0) / LIMIT);

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
                        className="text-blue-400 hover:underline"
                    >
                        {row.original.title}
                    </Link>
                ),
            },
            {
                accessorKey: "sale_price",
                header: "Price",
                cell: ({ row }: any) => `$${row.original.sale_price}`,
            },
            {
                accessorKey: "stock",
                header: "Stock",
                cell: ({ row }: any) => (
                    <span
                        className={
                            row.original.stock < 10 ? "text-red-400" : "text-white"
                        }
                    >
                        {row.original.stock} left
                    </span>
                ),
            },
            {
                accessorKey: "category",
                header: "Category",
            },
            {
                accessorKey: "ratings",
                header: "Ratings",
            },
            {
                id: "shop",
                header: "Shop",
                cell: ({ row }: any) => (
                    <span className="text-purple-400">
                        {row.original.shop?.name ?? "Unknown Shop"}
                    </span>
                ),
            },
            {
                id: "seller",
                header: "Seller",
                cell: ({ row }: any) => {
                    const seller = row.original.shop?.seller;
                    return (
                        <div className="flex flex-col">
                            <span className="text-white">
                                {seller?.name ?? "Unknown"}
                            </span>
                            <span className="text-gray-400 text-xs">
                                {seller?.email}
                            </span>
                        </div>
                    );
                },
            },
            {
                accessorKey: "createdAt",
                header: "Created",
                cell: ({ row }: any) =>
                    new Date(row.original.createdAt).toLocaleDateString(),
            },
            {
                id: "actions",
                header: "Actions",
                cell: ({ row }: any) => (
                    <Link
                        href={`${process.env.NEXT_PUBLIC_USER_UI_LINK}/product/${row.original.slug}`}
                        target="_blank"
                        className="text-blue-400 hover:text-blue-300 transition"
                    >
                        <Eye size={16} />
                    </Link>
                ),
            },
        ],
        []
    );

    const table = useReactTable({
        data: filteredProducts,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    // export the products currently shown (current page + search filter)
    const exportCSV = () => {
        const header = [
            "Title",
            "Price",
            "Stock",
            "Category",
            "Rating",
            "Shop",
            "Seller",
            "Seller Email",
            "Created",
        ];

        const rows = filteredProducts.map((p: any) =>
            [
                p.title,
                p.sale_price,
                p.stock,
                p.category,
                p.ratings,
                p.shop?.name,
                p.shop?.seller?.name,
                p.shop?.seller?.email,
                new Date(p.createdAt).toLocaleDateString(),
            ]
                .map(csvCell)
                .join(",")
        );

        const csv = [header.map(csvCell).join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `products-page-${page}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="w-full min-h-screen p-8">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl text-white font-semibold">
                    All Products
                </h2>
                <button
                    onClick={exportCSV}
                    disabled={filteredProducts.length === 0}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-lg"
                >
                    <Download size={16} /> Export CSV
                </button>
            </div>

            <BreadCrumbs title="All Products" />

            {/* Search */}
            <div className="my-4 flex items-center bg-gray-900 p-2 rounded-md">
                <Search size={18} className="text-gray-400 mr-4" />
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
                    <p className="text-center text-white">Loading products...</p>
                ) : (
                    <table className="w-full text-white text-sm">
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
                                            {flexRender(
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
                                        No products found.
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

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 text-white">
                <span className="text-sm text-gray-400">
                    Page {page} of {totalPages || 1} (
                    {data?.meta?.totalProducts ?? 0} products)
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

export default AllProductsPage;