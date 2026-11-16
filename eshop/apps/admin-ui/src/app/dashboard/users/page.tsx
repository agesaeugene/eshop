"use client";

import React, { useMemo, useState, useDeferredValue } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Ban, X } from "lucide-react";
import BreadCrumbs from "../../shared/components/breadcrumbs";
import axiosInstance from "../../utils/axiosinstance";
import { DataTable, SearchBar, RoleBadge, Avatar } from "../../shared/components/data-table";
import { downloadCSV, formatDate } from "../../shared/utils/csv";

const LIMIT = 10;

type User = {
    id: string;
    name: string;
    email: string;
    role?: string | null;
    isBanned?: boolean | null;
    createdAt: string;
};

type UsersResponse = {
    success: boolean;
    data: User[];
    meta: { totalUsers: number; currentPage: number; totalPages: number };
};

const UsersPage = () => {
    const queryClient = useQueryClient();

    const [globalFilter, setGlobalFilter] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [page, setPage] = useState(1);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const deferredFilter = useDeferredValue(globalFilter);

    const { data, isLoading, isError, error } = useQuery<UsersResponse, Error>({
        queryKey: ["admin-users", page],
        queryFn: async () => {
            const res = await axiosInstance.get<UsersResponse>(
                `/admin/api/get-all-users?page=${page}&limit=${LIMIT}`
            );
            return res.data;
        },
        placeholderData: (prev) => prev,
        staleTime: 1000 * 60 * 5,
    });

    const banUser = useMutation({
        mutationFn: async (userId: string) => {
            await axiosInstance.put(`/admin/api/ban-user/${userId}`);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
            setSelectedUser(null);
        },
    });

    const allUsers = useMemo(() => data?.data ?? [], [data]);

    // role filter + text search, applied together to the current page
    const filteredUsers = useMemo(() => {
        const q = deferredFilter.trim().toLowerCase();

        return allUsers.filter((u) => {
            const userRole = u.role ?? "user";
            if (roleFilter && userRole !== roleFilter) return false;
            if (!q) return true;
            return [u.name, u.email, userRole]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(q);
        });
    }, [allUsers, deferredFilter, roleFilter]);

    const hasActiveFilters = Boolean(roleFilter || globalFilter.trim());
    const totalPages = data?.meta?.totalPages ?? Math.ceil((data?.meta?.totalUsers ?? 0) / LIMIT);

    const columns = useMemo(
        () => [
            {
                id: "name",
                header: "User",
                cell: ({ row }: any) => (
                    <div className="flex items-center gap-3">
                        <Avatar name={row.original.name} />
                        <span className="font-medium">{row.original.name}</span>
                    </div>
                ),
            },
            {
                accessorKey: "email",
                header: "Email",
                cell: ({ row }: any) => (
                    <span className="text-gray-300">{row.original.email}</span>
                ),
            },
            {
                accessorKey: "role",
                header: "Role",
                cell: ({ row }: any) => <RoleBadge role={row.original.role} />,
            },
            {
                id: "status",
                header: "Status",
                cell: ({ row }: any) =>
                    row.original.isBanned ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-600 text-white">
                            Banned
                        </span>
                    ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-600 text-white">
                            Active
                        </span>
                    ),
            },
            {
                accessorKey: "createdAt",
                header: "Joined",
                cell: ({ row }: any) => formatDate(row.original.createdAt),
            },
            {
                id: "actions",
                header: "Actions",
                cell: ({ row }: any) => {
                    const user: User = row.original;

                    // admins can't be banned, and banned users are already banned
                    if (user.role === "admin") {
                        return <span className="text-gray-500">-</span>;
                    }
                    if (user.isBanned) {
                        return <span className="text-gray-500">Banned</span>;
                    }
                    return (
                        <button
                            onClick={() => {
                                banUser.reset();
                                setSelectedUser(user);
                            }}
                            className="flex items-center gap-2 text-red-400 hover:text-red-300 transition"
                            title={`Ban ${user.name}`}
                        >
                            <Ban size={16} /> Ban
                        </button>
                    );
                },
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    // exports exactly what is shown (current page + search + role filter)
    const exportCSV = () =>
        downloadCSV(
            `users-page-${page}${roleFilter ? `-${roleFilter}` : ""}.csv`,
            ["Name", "Email", "Role", "Status", "Joined"],
            filteredUsers.map((u) => [
                u.name,
                u.email,
                u.role ?? "user",
                u.isBanned ? "Banned" : "Active",
                formatDate(u.createdAt),
            ])
        );

    const clearFilters = () => {
        setGlobalFilter("");
        setRoleFilter("");
    };

    const closeModal = () => {
        if (banUser.isPending) return;
        setSelectedUser(null);
        banUser.reset();
    };

    return (
        <div className="w-full min-h-screen p-8">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl text-white font-semibold">All Users</h2>
                <button
                    onClick={exportCSV}
                    disabled={filteredUsers.length === 0}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-lg"
                >
                    <Download size={16} /> Export CSV
                </button>
            </div>

            <BreadCrumbs title="All Users" />

            {/* Search + role filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                    <SearchBar
                        value={globalFilter}
                        onChange={setGlobalFilter}
                        placeholder="Search by name, email or role..."
                    />
                </div>

                <select
                    aria-label="Filter users by role"
                    className="bg-gray-800 border border-gray-700 rounded px-3 py-2 outline-none text-white"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                >
                    <option value="">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                </select>

                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded"
                    >
                        Clear
                    </button>
                )}
            </div>

            {isError && (
                <div className="mb-4 bg-red-950 border border-red-800 text-red-300 p-4 rounded-md">
                    Failed to load users: {error.message}
                    <button
                        onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-users"] })}
                        className="ml-3 underline"
                    >
                        Retry
                    </button>
                </div>
            )}

            {!isError && (
                <DataTable
                    data={filteredUsers}
                    columns={columns}
                    isLoading={isLoading && !data}
                    emptyText={
                        hasActiveFilters
                            ? "No users match your search or filter on this page."
                            : "No users found."
                    }
                    pagination={{
                        page,
                        totalPages,
                        totalItems: data?.meta?.totalUsers ?? 0,
                        label: "users",
                        onChange: setPage,
                    }}
                />
            )}

            {/* Ban confirmation modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="ban-modal-title"
                        className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl w-full max-w-md p-6 text-white"
                    >
                        <div className="flex justify-between items-center gap-3 mb-4">
                            <div className="flex items-center gap-3">
                                <Ban className="text-red-400" size={22} />
                                <h3 id="ban-modal-title" className="text-lg font-bold">
                                    Ban User
                                </h3>
                            </div>
                            <button
                                onClick={closeModal}
                                disabled={banUser.isPending}
                                className="text-gray-400 hover:text-white"
                                aria-label="Close modal"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <p className="text-gray-300 leading-6 mb-6">
                            Are you sure you want to ban{" "}
                            <span className="font-semibold text-white">{selectedUser.name}</span>{" "}
                            ({selectedUser.email})? This may restrict their access to the platform.
                        </p>

                        {banUser.isError && (
                            <p className="text-red-400 mb-4">
                                {(banUser.error as any)?.response?.data?.message ??
                                    "Failed to ban user. Please try again."}
                            </p>
                        )}

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={closeModal}
                                disabled={banUser.isPending}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => banUser.mutate(selectedUser.id)}
                                disabled={banUser.isPending}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded disabled:opacity-50"
                            >
                                <Ban size={16} />
                                {banUser.isPending ? "Banning..." : "Confirm Ban"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersPage;