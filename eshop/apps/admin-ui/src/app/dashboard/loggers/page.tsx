"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, CircleUserRound, Store, Users } from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import axiosInstance from "../../utils/axiosinstance";

type AccountActivity = {
    id: string;
    name: string;
    email: string;
    accountType: "user" | "seller";
    status: "active" | "just_logged_out" | "inactive";
    lastLoginAt: string | null;
    lastSeenAt: string | null;
    lastLogoutAt: string | null;
};
type ActivityResponse = {
    accounts: AccountActivity[];
    meta: {
        page: number;
        total: number;
        totalUsers: number;
        totalSellers: number;
        statusCounts: { active: number; justLoggedOut: number; inactive: number };
    };
};

const statusLabel = (status: AccountActivity["status"]) =>
    status === "active" ? "Active" : status === "just_logged_out" ? "Just logged out" : "Inactive";

const AccountActivityPage = () => {
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState<"all" | AccountActivity["status"]>("all");
    const [search, setSearch] = useState("");
    const { data, isLoading, isError } = useQuery<ActivityResponse>({
        queryKey: ["admin-account-activity", page],
        queryFn: async () => (await axiosInstance.get(`/admin/api/account-activity?page=${page}&limit=50`)).data,
        refetchInterval: 30_000,
    });
    const accounts = useMemo(() => (data?.accounts ?? []).filter((account) => {
        const matchesStatus = filter === "all" || account.status === filter;
        const term = search.trim().toLowerCase();
        return matchesStatus && (!term || `${account.name} ${account.email} ${account.accountType}`.toLowerCase().includes(term));
    }), [data?.accounts, filter, search]);
    const activeCount = data?.meta.statusCounts.active ?? 0;
    const loggedOutCount = data?.meta.statusCounts.justLoggedOut ?? 0;
    const inactiveCount = data?.meta.statusCounts.inactive ?? 0;

    return (
        <main className="min-h-screen bg-slate-950 p-5 text-slate-100 md:p-8">
            <div className="mx-auto max-w-7xl">
                <header className="mb-6">
                    <p className="text-sm text-slate-400">Admin / Access monitoring</p>
                    <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold md:text-3xl"><Activity className="h-7 w-7 text-blue-300" /> Account activity</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                        Live session heartbeats identify active accounts. “Just logged out” means a recorded logout within the last five minutes; old or never-seen accounts are inactive.
                    </p>
                </header>

                <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Metric icon={<Users className="h-5 w-5" />} label="Tracked accounts" value={(data?.meta.total ?? 0).toLocaleString()} />
                    <Metric icon={<CircleUserRound className="h-5 w-5 text-emerald-300" />} label="Active" value={activeCount.toLocaleString()} />
                    <Metric icon={<Activity className="h-5 w-5 text-amber-300" />} label="Just logged out" value={loggedOutCount.toLocaleString()} />
                    <Metric icon={<Store className="h-5 w-5 text-slate-400" />} label="Inactive" value={inactiveCount.toLocaleString()} />
                </section>

                {isError ? (
                    <p role="alert" className="rounded-xl border border-red-800 bg-red-950 p-5 text-red-200">
                        Account activity could not be loaded. Verify your admin session and retry.
                    </p>
                ) : (
                    <>
                        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
                            <input
                                aria-label="Search users and sellers"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search name, email or account type"
                                className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-blue-600"
                            />
                            <select
                                aria-label="Filter by activity status"
                                value={filter}
                                onChange={(event) => setFilter(event.target.value as typeof filter)}
                                className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white"
                            >
                                <option value="all">All statuses</option>
                                <option value="active">Active</option>
                                <option value="just_logged_out">Just logged out</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                        <section className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
                            {isLoading ? <p className="p-8 text-center text-slate-400">Loading account activity...</p> : accounts.length ? (
                                <table className="w-full min-w-[760px] text-left text-sm">
                                    <thead className="bg-slate-950 text-xs uppercase text-slate-400">
                                        <tr><th className="p-4">Account</th><th className="p-4">Role</th><th className="p-4">Status</th><th className="p-4">Last login</th><th className="p-4">Last activity</th><th className="p-4">Last logout</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {accounts.map((account) => (
                                            <tr key={`${account.accountType}:${account.id}`} className="hover:bg-slate-800/40">
                                                <td className="p-4"><p className="font-medium">{account.name}</p><p className="mt-1 text-xs text-slate-400">{account.email}</p></td>
                                                <td className="p-4 capitalize">{account.accountType}</td>
                                                <td className="p-4"><Status status={account.status} /></td>
                                                <td className="p-4 text-slate-400">{formatDate(account.lastLoginAt)}</td>
                                                <td className="p-4 text-slate-400">{formatDate(account.lastSeenAt)}</td>
                                                <td className="p-4 text-slate-400">{formatDate(account.lastLogoutAt)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : <p className="p-8 text-center text-slate-400">{data?.accounts.length ? "No accounts match your filters." : "No users or sellers are registered yet."}</p>}
                        </section>
                        <div className="mt-4 flex items-center justify-between text-sm">
                            <span className="text-slate-400">Page {page} · {data?.meta.total.toLocaleString() ?? 0} total</span>
                            <div className="flex gap-2">
                                <button type="button" disabled={page <= 1 || isLoading} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-slate-700 px-3 py-2 disabled:opacity-40">Previous</button>
                                <button type="button" disabled={page * 50 >= (data?.meta.total ?? 0) || isLoading} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-700 px-3 py-2 disabled:opacity-40">Next</button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </main>
    );
};

const formatDate = (date: string | null) => date ? new Date(date).toLocaleString() : "No activity recorded";
const Metric = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
    <article className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <span className="text-blue-300">{icon}</span><p className="mt-3 text-sm text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p>
    </article>
);
const Status = ({ status }: { status: AccountActivity["status"] }) => (
    <span className={`rounded-full px-2.5 py-1 text-xs ${
        status === "active" ? "bg-emerald-950 text-emerald-300"
            : status === "just_logged_out" ? "bg-amber-950 text-amber-200"
                : "bg-slate-800 text-slate-300"
    }`}>{statusLabel(status)}</span>
);

export default AccountActivityPage;
