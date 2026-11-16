"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CheckCircle2, KeyRound, Mail, Save, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import axiosInstance from "../../utils/axiosinstance";

type Settings = {
    profile: { id: string; name: string; email: string };
    notificationPreferences: Record<string, boolean>;
    platform: {
        supportEmail: string;
        currency: string;
        timezone: string;
        maintenanceMode: boolean;
        allowSellerRegistration: boolean;
        allowUserRegistration: boolean;
    };
};

const preferenceLabels: Record<string, { title: string; description: string }> = {
    inApp: { title: "In-app notifications", description: "Show operational alerts in the admin notification center." },
    securityAlerts: { title: "Security alerts", description: "Keep account and access-related alerts enabled." },
    eventReviews: { title: "Event review updates", description: "Receive updates when sellers submit events for review." },
    platformUpdates: { title: "Platform updates", description: "Receive important platform and service announcements." },
};

const inputClass = "mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

const AdminSettingsPage = () => {
    const queryClient = useQueryClient();
    const { data, isLoading, isError } = useQuery<Settings>({
        queryKey: ["admin-settings"],
        queryFn: async () => {
            const response = await axiosInstance.get("/admin/api/settings");
            return response.data;
        },
    });

    const [profile, setProfile] = useState({ name: "", email: "" });
    const [preferences, setPreferences] = useState<Record<string, boolean>>({});
    const [platform, setPlatform] = useState({
        supportEmail: "",
        currency: "KES",
        timezone: "Africa/Nairobi",
        maintenanceMode: false,
        allowSellerRegistration: true,
        allowUserRegistration: true,
    });
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        if (!data) return;
        setProfile({ name: data.profile.name, email: data.profile.email });
        setPreferences(data.notificationPreferences);
        setPlatform(data.platform);
    }, [data]);

    const saveSection = async (
        section: "profile" | "platform" | "notificationPreferences",
        values: unknown
    ) => {
        setFeedback(null);
        try {
            await axiosInstance.put("/admin/api/settings", { [section]: values });
            await queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
            if (section === "profile") await queryClient.invalidateQueries({ queryKey: ["admin"] });
            setFeedback({ type: "success", text: "Your settings have been saved." });
        } catch (error: any) {
            console.error(`Could not save admin ${section} settings:`, error);
            setFeedback({
                type: "error",
                text: error.response?.data?.message || "Settings could not be saved. Please try again.",
            });
        }
    };

    const savePassword = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFeedback(null);
        if (newPassword !== confirmPassword) {
            setFeedback({ type: "error", text: "The new password and confirmation do not match." });
            return;
        }
        try {
            await axiosInstance.put("/admin/api/settings", { currentPassword, newPassword });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setFeedback({ type: "success", text: "Your password was changed successfully." });
        } catch (error: any) {
            console.error("Could not change admin password:", error);
            setFeedback({
                type: "error",
                text: error.response?.data?.message || "Password could not be changed. Please try again.",
            });
        }
    };

    if (isLoading) {
        return <main className="min-h-screen p-8 text-slate-300">Loading your settings...</main>;
    }

    if (isError || !data) {
        return (
            <main className="min-h-screen p-8 text-white">
                <p role="alert" className="rounded-xl border border-red-800 bg-red-950 p-5 text-red-200">
                    Admin settings could not be loaded. Refresh the page to try again.
                </p>
            </main>
        );
    }

    return (
        <main className="min-h-screen p-5 text-slate-100 md:p-8">
            <div className="mx-auto max-w-5xl">
                <header className="mb-7">
                    <p className="text-sm text-slate-400">Admin / Workspace</p>
                    <h1 className="mt-1 text-2xl font-bold md:text-3xl">Settings</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                        Manage your administrator identity, sign-in security, alert preferences, and the platform defaults used by the team.
                    </p>
                </header>

                {feedback && (
                    <div
                        role={feedback.type === "error" ? "alert" : "status"}
                        className={`mb-5 flex items-center gap-2 rounded-lg border p-3 text-sm ${
                            feedback.type === "success"
                                ? "border-green-800 bg-green-950/50 text-green-200"
                                : "border-red-800 bg-red-950/50 text-red-200"
                        }`}
                    >
                        {feedback.type === "success" && <CheckCircle2 className="h-4 w-4" />}
                        {feedback.text}
                    </div>
                )}

                <div className="space-y-5">
                    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-7">
                        <div className="mb-6 flex items-start gap-3">
                            <span className="rounded-xl bg-blue-500/10 p-2.5 text-blue-300"><UserRound className="h-5 w-5" /></span>
                            <div>
                                <h2 className="font-semibold">Administrator account</h2>
                                <p className="mt-1 text-sm text-slate-400">Keep your contact details current for account recovery and audit records.</p>
                            </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <label className="text-sm text-slate-300">
                                Full name
                                <input
                                    className={inputClass}
                                    value={profile.name}
                                    onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                                    autoComplete="name"
                                />
                            </label>
                            <label className="text-sm text-slate-300">
                                Email address
                                <input
                                    className={inputClass}
                                    type="email"
                                    value={profile.email}
                                    onChange={(event) => setProfile({ ...profile, email: event.target.value })}
                                    autoComplete="email"
                                />
                            </label>
                        </div>
                        <button
                            onClick={() => saveSection("profile", profile)}
                            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium hover:bg-blue-500"
                        >
                            <Save className="h-4 w-4" /> Save account
                        </button>
                    </section>

                    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-7">
                        <div className="mb-6 flex items-start gap-3">
                            <span className="rounded-xl bg-amber-500/10 p-2.5 text-amber-300"><KeyRound className="h-5 w-5" /></span>
                            <div>
                                <h2 className="font-semibold">Sign-in security</h2>
                                <p className="mt-1 text-sm text-slate-400">Use a unique password with at least 10 characters.</p>
                            </div>
                        </div>
                        <form onSubmit={savePassword} className="grid gap-4 md:grid-cols-3">
                            <label className="text-sm text-slate-300">
                                Current password
                                <input className={inputClass} type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
                            </label>
                            <label className="text-sm text-slate-300">
                                New password
                                <input className={inputClass} type="password" autoComplete="new-password" minLength={10} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
                            </label>
                            <label className="text-sm text-slate-300">
                                Confirm new password
                                <input className={inputClass} type="password" autoComplete="new-password" minLength={10} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                            </label>
                            <button type="submit" className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium hover:bg-slate-800">
                                <ShieldCheck className="h-4 w-4" /> Update password
                            </button>
                        </form>
                    </section>

                    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-7">
                        <div className="mb-6 flex items-start gap-3">
                            <span className="rounded-xl bg-violet-500/10 p-2.5 text-violet-300"><Building2 className="h-5 w-5" /></span>
                            <div>
                                <h2 className="font-semibold">Platform defaults</h2>
                                <p className="mt-1 text-sm text-slate-400">Set support contact information and the default locale for platform operations.</p>
                            </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                            <label className="text-sm text-slate-300">
                                Support email
                                <input className={inputClass} type="email" value={platform.supportEmail} onChange={(event) => setPlatform({ ...platform, supportEmail: event.target.value })} placeholder="support@example.com" />
                            </label>
                            <label className="text-sm text-slate-300">
                                Default currency
                                <select className={inputClass} value={platform.currency} onChange={(event) => setPlatform({ ...platform, currency: event.target.value })}>
                                    <option value="KES">KES — Kenyan Shilling</option>
                                    <option value="USD">USD — US Dollar</option>
                                    <option value="EUR">EUR — Euro</option>
                                    <option value="GBP">GBP — Pound Sterling</option>
                                </select>
                            </label>
                            <label className="text-sm text-slate-300">
                                Time zone
                                <input className={inputClass} value={platform.timezone} onChange={(event) => setPlatform({ ...platform, timezone: event.target.value })} placeholder="Africa/Nairobi" />
                            </label>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                            <div className="flex items-start gap-3">
                                <Mail className="mt-0.5 h-4 w-4 text-slate-400" />
                                <p className="text-sm text-slate-400">Store branding, logos, banners, and catalog categories are managed in Customization.</p>
                            </div>
                            <Link href="/dashboard/customization" className="text-sm font-medium text-blue-300 hover:text-blue-200">
                                Open Customization
                            </Link>
                        </div>
                        <button
                            onClick={() => saveSection("platform", platform)}
                            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium hover:bg-blue-500"
                        >
                            <Save className="h-4 w-4" /> Save platform defaults
                        </button>
                    </section>

                    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-7">
                        <div className="mb-5">
                            <h2 className="font-semibold">Notification preferences</h2>
                            <p className="mt-1 text-sm text-slate-400">Choose which notification categories you want to see in your admin workspace.</p>
                        </div>
                        <div className="divide-y divide-slate-800">
                            {Object.entries(preferenceLabels).map(([key, label]) => (
                                <label key={key} className="flex cursor-pointer items-center justify-between gap-4 py-4">
                                    <span>
                                        <span className="block text-sm font-medium">{label.title}</span>
                                        <span className="mt-1 block text-xs text-slate-400">{label.description}</span>
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={preferences[key] ?? true}
                                        onChange={(event) => setPreferences({ ...preferences, [key]: event.target.checked })}
                                        className="h-4 w-4 accent-blue-500"
                                    />
                                </label>
                            ))}
                        </div>
                        <button
                            onClick={() => saveSection("notificationPreferences", preferences)}
                            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium hover:bg-blue-500"
                        >
                            <Save className="h-4 w-4" /> Save notification preferences
                        </button>
                    </section>
                </div>
            </div>
        </main>
    );
};

export default AdminSettingsPage;
