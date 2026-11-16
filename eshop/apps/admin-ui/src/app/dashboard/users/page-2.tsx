
"use client";

import React, { useMemo, useState, useDeferredValue } from "react";
import {
    useQuery,
    useMutation,
    useQueryClient,
    UseQueryResult,
} from "@tanstack/react-query";
import { Search, Download, Ban, X } from "lucide-react";
import BreadCrumbs from "../../shared/components/breadcrumbs";
import axiosInstance from "../../utils/axiosinstance";
import { downloadCSV, formatDate } from "../../shared/utils/csv";

type User = {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
};

type UsersResponse = {
    success: boolean;
    data: User[];
    meta: {
        totalUsers: number;
        currentPage: number;
        totalPages: number;
    };
};

const UsersPage = () => {
    const [globalFilter, setGlobalFilter] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [page, setPage] = useState(1);

    const deferredFilter = useDeferredValue(globalFilter);
    const limit = 10;
    const queryClient = useQueryClient();

    const {
        data,
        isLoading,
        isError,
        error,
    }: UseQueryResult<UsersResponse, Error> = useQuery({
        queryKey: ["users-list", page],
        queryFn: async () => {
            const res = await axiosInstance.get<UsersResponse>(
                `/admin/api/get-all-users?page=${page}&limit=${limit}`
            );
            return res.data;
        },
        placeholderData: (previousData) => previousData,
        staleTime: 1000 * 60 * 5,
    });

    const banUserMutation = useMutation({
        mutationFn: async (userId: string) => {
            await axiosInstance.put(`/admin/api/ban-user/${userId}`);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ["users-list"],
            });
            setIsModalOpen(false);
            setSelectedUser(null);
        },
    });

    const allUsers = data?.data ?? [];

    const filteredUsers = useMemo(() => {
        return allUsers.filter((user) => {
            const matchesRole = roleFilter
                ? user.role.toLowerCase() === roleFilter.toLowerCase()
                : true;

            const search = deferredFilter.trim().toLowerCase();

            const matchesSearch = search
                ? [user.name, user.email, user.role]
                    .some((value) =>
                        value.toLowerCase().includes(search)
                    )
                : true;

            return matchesRole && matchesSearch;
        });
    }, [allUsers, roleFilter, deferredFilter]);

    const totalPages = data?.meta?.totalPages ??
        Math.ceil((data?.meta?.totalUsers ?? 0) / limit);

    const exportCSV = () => {
        downloadCSV(
            `users-page-${page}.csv`,
            ["Name", "Email", "Role", "Joined"],
            filteredUsers.map((user) => [
                user.name,
                user.email,
                user.role,
                formatDate(user.createdAt),
            ])
        );
    };

    const openBanModal = (user: User) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const confirmBanUser = () => {
        if (selectedUser) {
            banUserMutation.mutate(selectedUser.id);
        }
    };

    return (
        <div className="w-full min-h-screen p-4 md:p-8 bg-black text-white text-sm">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
                <h2 className="text-xl font-bold tracking-wide">
                    All Users
                </h2>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={exportCSV}
                        disabled={filteredUsers.length === 0}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded"
                    >
                        <Download size={16} />
                        Export CSV
                    </button>

                    <select
                        aria-label="Filter users by role"
                        className="bg-gray-800 border border-gray-700 rounded px-3 py-2 outline-none text-white"
                        value={roleFilter}
                        onChange={(e) => {
                            setRoleFilter(e.target.value);
                        }}
                    >
                        <option value="">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="user">User</option>
                    </select>
                </div>
            </div>

            {/* Breadcrumbs */}
            <div className="mb-4">
                <BreadCrumbs title="All Users" />
            </div>

            {/* Search */}
            <div className="mb-4 flex items-center bg-gray-900 border border-gray-800 p-3 rounded-md">
                <Search size={18} className="text-gray-400 mr-2" />

                <input
                    type="text"
                    placeholder="Search users by name, email or role..."
                    className="w-full bg-transparent text-white outline-none"
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                />
            </div>

            {/* Loading and error states */}
            {isLoading && !data && (
                <p className="text-gray-400 py-8 text-center">
                    Loading users...
                </p>
            )}

            {isError && (
                <div className="bg-red-950 border border-red-800 text-red-300 p-4 rounded-md">
                    Failed to load users: {error.message}
                    <button
                        onClick={() =>
                            queryClient.invalidateQueries({
                                queryKey: ["users-list"],
                            })
                        }
                        className="ml-3 underline"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Users table */}
            {!isError && (
                <>
                    <div className="overflow-x-auto rounded-lg border border-gray-800">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900 text-gray-300">
                                <tr>
                                    <th className="p-4">Name</th>
                                    <th className="p-4">Email</th>
                                    <th className="p-4">Role</th>
                                    <th className="p-4">Joined</th>
                                    <th className="p-4">Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredUsers.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="border-t border-gray-800 hover:bg-gray-900/60"
                                    >
                                        <td className="p-4 font-medium">
                                            {user.name}
                                        </td>

                                        <td className="p-4 text-gray-300">
                                            {user.email}
                                        </td>

                                        <td className="p-4">
                                            <span className="uppercase font-semibold text-blue-400">
                                                {user.role}
                                            </span>
                                        </td>

                                        <td className="p-4 text-gray-400 whitespace-nowrap">
                                            {formatDate(user.createdAt)}
                                        </td>

                                        <td className="p-4">
                                            <button
                                                onClick={() => openBanModal(user)}
                                                className="flex items-center gap-2 text-red-400 hover:text-red-300"
                                                title={`Ban ${user.name}`}
                                            >
                                                <Ban size={16} />
                                                Ban
                                            </button>
                                        </td>
                                    </tr>
                                ))}

                                {filteredUsers.length === 0 && !isLoading && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="p-8 text-center text-gray-400"
                                        >
                                            No users found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-5">
                        <p className="text-gray-400">
                            Total users: {data?.meta?.totalUsers ?? 0}
                        </p>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                disabled={page <= 1}
                                className="px-4 py-2 bg-gray-800 rounded disabled:opacity-40 hover:bg-gray-700"
                            >
                                Previous
                            </button>

                            <span className="text-gray-300">
                                Page {page} of {Math.max(1, totalPages)}
                            </span>

                            <button
                                onClick={() =>
                                    setPage((prev) =>
                                        Math.min(totalPages, prev + 1)
                                    )
                                }
                                disabled={page >= totalPages || totalPages === 0}
                                className="px-4 py-2 bg-gray-800 rounded disabled:opacity-40 hover:bg-gray-700"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Ban confirmation modal */}
            {isModalOpen && selectedUser && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="ban-modal-title"
                        className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl w-full max-w-md p-6"
                    >
                        <div className="flex justify-between items-center gap-3 mb-4">
                            <div className="flex items-center gap-3">
                                <Ban className="text-red-400" size={22} />
                                <h3
                                    id="ban-modal-title"
                                    className="text-lg font-bold"
                                >
                                    Ban User
                                </h3>
                            </div>

                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setSelectedUser(null);
                                }}
                                disabled={banUserMutation.isPending}
                                className="text-gray-400 hover:text-white"
                                aria-label="Close modal"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <p className="text-gray-300 leading-6 mb-6">
                            Are you sure you want to ban{" "}
                            <span className="font-semibold text-white">
                                {selectedUser.name}
                            </span>{" "}
                            ({selectedUser.email})? This action may restrict
                            their access to the platform.
                        </p>

                        {banUserMutation.isError && (
                            <p className="text-red-400 mb-4">
                                Failed to ban user. Please try again.
                            </p>
                        )}

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setSelectedUser(null);
                                    banUserMutation.reset();
                                }}
                                disabled={banUserMutation.isPending}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={confirmBanUser}
                                disabled={banUserMutation.isPending}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded disabled:opacity-50"
                            >
                                <Ban size={16} />
                                {banUserMutation.isPending
                                    ? "Banning..."
                                    : "Confirm Ban"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersPage;
