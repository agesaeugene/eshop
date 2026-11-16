"use client";

import React, { useMemo, useState, useDeferredValue } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ShieldOff, X } from "lucide-react";
import BreadCrumbs from "../../shared/components/breadcrumbs";
import axiosInstance from "../../utils/axiosinstance";
import { DataTable, SearchBar, RoleBadge, Avatar } from "../../shared/components/data-table";
import { formatDate } from "../../shared/utils/csv";

const AdminsPage = () => {
    const queryClient = useQueryClient();
    const [globalFilter, setGlobalFilter] = useState("");
    const deferredFilter = useDeferredValue(globalFilter);

    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"admin" | "user">("admin");
    const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ["admin-admins"],
        queryFn: async () => {
            const res = await axiosInstance.get("/admin/api/get-all-admins");
            return res.data.admins;
        },
        staleTime: 1000 * 60 * 5,
    });

    const admins = useMemo(() => data ?? [], [data]);

    const { mutate: changeRole, isPending } = useMutation({
        mutationFn: async (payload: { email: string; role: "admin" | "user" }) => {
            const res = await axiosInstance.put("/admin/api/add-new-admin", payload);
            return res.data;
        },
        onSuccess: (_data, vars) => {
            queryClient.invalidateQueries({ queryKey: ["admin-admins"] });
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
            setMessage({
                type: "success",
                text: vars.role === "admin" ? "Admin added successfully." : "Admin access removed.",
            });
            setEmail("");
            setOpen(false);
        },
        onError: (err: any) => {
            setMessage({
                type: "error",
                text: err?.response?.data?.message ?? "Something went wrong. Try again.",
            });
        },
    });

    const filteredAdmins = useMemo(() => {
        const q = deferredFilter.trim().toLowerCase();
        if (!q) return admins;
        return admins.filter((a: any) =>
            [a.name, a.email].filter(Boolean).join(" ").toLowerCase().includes(q)
        );
    }, [admins, deferredFilter]);

    const columns = useMemo(
        () => [
            {
                id: "name",
                header: "Admin",
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
                accessorKey: "createdAt",
                header: "Joined",
                cell: ({ row }: any) => formatDate(row.original.createdAt),
            },
            {
                id: "actions",
                header: "Actions",
                cell: ({ row }: any) => (
                    <button
                        onClick={() => {
                            if (window.confirm(`Remove admin access for ${row.original.email}?`)) {
                                setMessage(null);
                                changeRole({ email: row.original.email, role: "user" });
                            }
                        }}
                        className="flex items-center gap-1 text-red-400 hover:text-red-300 transition"
                        title="Remove admin access"
                    >
                        <ShieldOff size={16} /> Revoke
                    </button>
                ),
            },
        ],
        [changeRole]
    );

    const submit = () => {
        setMessage(null);
        if (!email.trim()) {
            setMessage({ type: "error", text: "Please enter the user's email." });
            return;
        }
        changeRole({ email: email.trim().toLowerCase(), role });
    };

    return (
        <div className="w-full min-h-screen p-8">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl text-white font-semibold">Team Management</h2>
                <button
                    onClick={() => {
                        setMessage(null);
                        setOpen(true);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                    <Plus size={16} /> Add Admin
                </button>
            </div>

            <BreadCrumbs title="Team Management" />

            {message && !open && (
                <div
                    className={`mt-4 p-3 rounded-md text-sm ${
                        message.type === "success"
                            ? "bg-green-900/40 text-green-300"
                            : "bg-red-900/40 text-red-300"
                    }`}
                >
                    {message.text}
                </div>
            )}

            <SearchBar
                value={globalFilter}
                onChange={setGlobalFilter}
                placeholder="Search admins by name or email..."
            />

            <DataTable
                data={filteredAdmins}
                columns={columns}
                isLoading={isLoading}
                emptyText="No admins found."
            />

            {/* Add admin modal */}
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-md bg-gray-900 rounded-lg p-6 text-white">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Add New Admin</h3>
                            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        <p className="text-sm text-gray-400 mb-4">
                            The person must already have a customer account. Enter their email to give them admin access.
                        </p>

                        <label className="block text-sm mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="user@example.com"
                            className="w-full mb-4 bg-gray-800 rounded-md p-2 outline-none text-white"
                        />

                        <label className="block text-sm mb-1">Role</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as "admin" | "user")}
                            className="w-full mb-4 bg-gray-800 rounded-md p-2 outline-none text-white"
                        >
                            <option value="admin">Admin</option>
                            <option value="user">User</option>
                        </select>

                        {message?.type === "error" && (
                            <p className="mb-4 text-sm text-red-400">{message.text}</p>
                        )}

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setOpen(false)}
                                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submit}
                                disabled={isPending}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg"
                            >
                                {isPending ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminsPage;