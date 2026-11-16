"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    BellRing,
    CheckCircle2,
    KeyRound,
    Plus,
    Save,
    ShieldCheck,
    Store,
    Trash2,
    UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import axiosInstance from "apps/seller-ui/src/utils/axiosInstance";

type SocialLink = { type: string; url: string };
type SellerSettings = {
    profile: {
        id: string;
        name: string;
        email: string;
        phone_number: string;
        country: string;
        phone_verified: boolean;
    };
    shop: null | {
        id: string;
        name: string;
        bio: string | null;
        category: string;
        address: string;
        opening_hours: string;
        website: string;
        coverBanner: string | null;
        socialLinks: SocialLink[];
    };
    notificationPreferences: Record<string, boolean>;
};

const DEFAULT_PREFERENCES = {
    orderUpdates: true,
    eventReviews: true,
    productUpdates: true,
    accountAlerts: true,
};

const fieldClass =
    "mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
const labelClass = "block text-sm font-medium text-slate-300";

const SellerSettingsPage = () => {
    const queryClient = useQueryClient();
    const { data, isLoading, isError, error } = useQuery<SellerSettings>({
        queryKey: ["seller-settings"],
        queryFn: async () => {
            const response = await axiosInstance.get("/api/seller-settings");
            return response.data;
        },
    });
    const [profile, setProfile] = useState({
        name: "",
        email: "",
        phone_number: "",
        country: "",
    });
    const [shop, setShop] = useState({
        name: "",
        bio: "",
        category: "",
        address: "",
        opening_hours: "",
        website: "",
        coverBanner: "",
        socialLinks: [] as SocialLink[],
    });
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
    const [password, setPassword] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        otp: "",
    });
    const [passwordOtpSent, setPasswordOtpSent] = useState(false);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

    useEffect(() => {
        if (!data) return;
        setProfile({
            name: data.profile.name,
            email: data.profile.email,
            phone_number: data.profile.phone_number,
            country: data.profile.country,
        });
        if (data.shop) {
            setShop({
                name: data.shop.name,
                bio: data.shop.bio ?? "",
                category: data.shop.category,
                address: data.shop.address,
                opening_hours: data.shop.opening_hours,
                website: data.shop.website,
                coverBanner: data.shop.coverBanner ?? "",
                socialLinks: Array.isArray(data.shop.socialLinks) ? data.shop.socialLinks : [],
            });
        }
        setPreferences({ ...DEFAULT_PREFERENCES, ...data.notificationPreferences });
    }, [data]);

    const saveSettings = useMutation({
        mutationFn: async (section: "profile" | "shop" | "notificationPreferences") => {
            const values = section === "profile" ? profile : section === "shop" ? shop : preferences;
            await axiosInstance.put("/api/seller-settings", { [section]: values });
            return section;
        },
        onSuccess: async (section) => {
            setFeedback({ type: "success", message: "Settings saved successfully." });
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["seller-settings"] }),
                queryClient.invalidateQueries({ queryKey: ["seller"] }),
                queryClient.invalidateQueries({ queryKey: ["seller-notifications"] }),
            ]);
            if (section === "shop") await queryClient.invalidateQueries({ queryKey: ["seller-dashboard"] });
        },
        onError: (saveError: any) => {
            setFeedback({
                type: "error",
                message: saveError.response?.data?.message || "Settings could not be saved. Please try again.",
            });
        },
    });

    const requestPasswordOtp = useMutation({
        mutationFn: () =>
            axiosInstance.post("/api/seller-change-password/send-otp", {
                currentPassword: password.currentPassword,
                newPassword: password.newPassword,
                confirmPassword: password.confirmPassword,
            }),
        onSuccess: (response) => {
            setPasswordOtpSent(true);
            setFeedback({ type: "success", message: response.data.message || "Verification code sent to your email." });
        },
        onError: (requestError: any) => {
            setFeedback({
                type: "error",
                message: requestError.response?.data?.message || "Could not send a verification code.",
            });
        },
    });

    const changePassword = useMutation({
        mutationFn: () => axiosInstance.put("/api/seller-change-password", password),
        onSuccess: (response) => {
            setPassword({ currentPassword: "", newPassword: "", confirmPassword: "", otp: "" });
            setPasswordOtpSent(false);
            setFeedback({ type: "success", message: response.data.message || "Password changed successfully." });
        },
        onError: (changeError: any) => {
            setFeedback({
                type: "error",
                message: changeError.response?.data?.message || "Password could not be changed.",
            });
        },
    });

    const saveCover = useMutation({
        mutationFn: async () => {
            if (!coverFile) throw new Error("Choose a cover image first.");
            if (!coverFile.type.startsWith("image/") || coverFile.size > 8 * 1024 * 1024) {
                throw new Error("Choose an image file under 8 MB.");
            }
            const fileName = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read the selected image."));
                reader.onerror = () => reject(new Error("Could not read the selected image."));
                reader.readAsDataURL(coverFile);
            });
            const upload = await axiosInstance.post("/product/api/upload-product-image", { fileName });
            const coverBanner = upload.data.file_url;
            await axiosInstance.put("/api/seller-settings", { shop: { ...shop, coverBanner } });
            return coverBanner as string;
        },
        onSuccess: async (coverBanner) => {
            setShop((current) => ({ ...current, coverBanner }));
            setCoverFile(null);
            setFeedback({ type: "success", message: "Shop cover image uploaded and saved." });
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["seller-settings"] }),
                queryClient.invalidateQueries({ queryKey: ["seller"] }),
            ]);
        },
        onError: (uploadError: any) => {
            setFeedback({
                type: "error",
                message: uploadError.response?.data?.message || uploadError.message || "Shop cover image could not be saved.",
            });
        },
    });

    const updateSocialLink = (index: number, field: keyof SocialLink, value: string) => {
        setShop((current) => ({
            ...current,
            socialLinks: current.socialLinks.map((link, linkIndex) =>
                linkIndex === index ? { ...link, [field]: value } : link
            ),
        }));
    };

    if (isLoading) {
        return <main className="min-h-screen p-8 text-slate-300">Loading seller settings...</main>;
    }

    if (isError || !data) {
        return (
            <main className="min-h-screen p-5 text-white md:p-8">
                <p role="alert" className="rounded-xl border border-red-800 bg-red-950 p-5 text-red-200">
                    {(error as any)?.response?.data?.message || "Seller settings could not be loaded. Refresh to try again."}
                </p>
            </main>
        );
    }

    const saveButton = (section: "profile" | "shop" | "notificationPreferences", text = "Save changes") => (
        <button
            type="button"
            onClick={() => {
                setFeedback(null);
                saveSettings.mutate(section);
            }}
            disabled={saveSettings.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
            <Save className="h-4 w-4" />
            {saveSettings.isPending ? "Saving..." : text}
        </button>
    );

    return (
        <main className="min-h-screen bg-slate-950 p-5 text-slate-100 md:p-8">
            <div className="mx-auto max-w-5xl">
                <header className="mb-7">
                    <p className="text-sm text-slate-400">Seller dashboard / Account</p>
                    <h1 className="mt-1 text-2xl font-bold md:text-3xl">Settings</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                        Manage your seller profile, public shop details, account security, and the updates you receive.
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
                        {feedback.type === "success" && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                        {feedback.message}
                    </div>
                )}

                <div className="space-y-5">
                    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-7">
                        <div className="mb-6 flex items-start gap-3">
                            <span className="rounded-xl bg-blue-500/10 p-2.5 text-blue-300"><UserRound className="h-5 w-5" /></span>
                            <div>
                                <h2 className="font-semibold">Seller account</h2>
                                <p className="mt-1 text-sm text-slate-400">These details are used for seller sign-in and account communication.</p>
                            </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <label className={labelClass}>Full name
                                <input className={fieldClass} value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} autoComplete="name" required />
                            </label>
                            <label className={labelClass}>Email address
                                <input className={fieldClass} type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} autoComplete="email" required />
                            </label>
                            <label className={labelClass}>Phone number
                                <input className={fieldClass} type="tel" value={profile.phone_number} onChange={(event) => setProfile({ ...profile, phone_number: event.target.value })} autoComplete="tel" required />
                            </label>
                            <label className={labelClass}>Country
                                <input className={fieldClass} value={profile.country} onChange={(event) => setProfile({ ...profile, country: event.target.value })} autoComplete="country-name" required />
                            </label>
                        </div>
                        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                            <ShieldCheck className="h-4 w-4 text-emerald-400" />
                            Phone {data.profile.phone_verified ? "verified" : "not verified"}.
                        </p>
                        <div className="mt-5">{saveButton("profile")}</div>
                    </section>

                    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-7">
                        <div className="mb-6 flex items-start gap-3">
                            <span className="rounded-xl bg-violet-500/10 p-2.5 text-violet-300"><Store className="h-5 w-5" /></span>
                            <div>
                                <h2 className="font-semibold">Public shop profile</h2>
                                <p className="mt-1 text-sm text-slate-400">Customers see these details on your shop page.</p>
                            </div>
                        </div>
                        {!data.shop ? (
                            <p className="rounded-lg border border-amber-800 bg-amber-950/40 p-4 text-sm text-amber-200">
                                Your seller account does not have a shop yet. Complete shop setup before editing these details.
                            </p>
                        ) : (
                            <>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <label className={labelClass}>Shop name
                                        <input className={fieldClass} value={shop.name} onChange={(event) => setShop({ ...shop, name: event.target.value })} required />
                                    </label>
                                    <label className={labelClass}>Category
                                        <input className={fieldClass} value={shop.category} onChange={(event) => setShop({ ...shop, category: event.target.value })} required />
                                    </label>
                                    <label className={`${labelClass} md:col-span-2`}>Shop bio
                                        <textarea className={`${fieldClass} min-h-24 resize-y`} value={shop.bio} onChange={(event) => setShop({ ...shop, bio: event.target.value })} maxLength={1000} />
                                    </label>
                                    <label className={labelClass}>Address
                                        <input className={fieldClass} value={shop.address} onChange={(event) => setShop({ ...shop, address: event.target.value })} required />
                                    </label>
                                    <label className={labelClass}>Opening hours
                                        <input className={fieldClass} placeholder="Mon-Fri, 9 AM - 6 PM" value={shop.opening_hours} onChange={(event) => setShop({ ...shop, opening_hours: event.target.value })} required />
                                    </label>
                                    <label className={`${labelClass} md:col-span-2`}>Website
                                        <input className={fieldClass} type="url" placeholder="https://example.com" value={shop.website} onChange={(event) => setShop({ ...shop, website: event.target.value })} />
                                    </label>
                                </div>
                                <section className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                                    <h3 className="text-sm font-semibold">Shop cover image</h3>
                                    <p className="mt-1 text-xs text-slate-400">This image is shown on your storefront cover. Uploading saves it to your shop profile.</p>
                                    {shop.coverBanner && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={shop.coverBanner} alt="Current shop cover" className="mt-3 h-36 w-full rounded-lg border border-slate-800 object-cover" />
                                    )}
                                    <div className="mt-3 flex flex-wrap items-center gap-3">
                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp,image/gif"
                                            aria-label="Choose shop cover image"
                                            onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)}
                                            className="max-w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-sm file:text-white"
                                        />
                                        <button
                                            type="button"
                                            disabled={!coverFile || saveCover.isPending}
                                            onClick={() => {
                                                setFeedback(null);
                                                saveCover.mutate();
                                            }}
                                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                                        >
                                            {saveCover.isPending ? "Uploading..." : "Upload and save cover"}
                                        </button>
                                    </div>
                                    {coverFile && <p className="mt-2 text-xs text-slate-400">{coverFile.name} · {(coverFile.size / (1024 * 1024)).toFixed(1)} MB</p>}
                                </section>
                                <div className="mt-5">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div>
                                            <h3 className="text-sm font-medium text-slate-300">Social links</h3>
                                            <p className="mt-1 text-xs text-slate-500">Use full links starting with https://.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShop({ ...shop, socialLinks: [...shop.socialLinks, { type: "", url: "" }] })}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs hover:bg-slate-800"
                                        >
                                            <Plus className="h-3.5 w-3.5" /> Add link
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {shop.socialLinks.map((link, index) => (
                                            <div key={`${index}-${link.type}`} className="flex flex-col gap-2 sm:flex-row">
                                                <input className={`${fieldClass} mt-0 sm:w-1/3`} aria-label="Social platform" placeholder="Platform (e.g. Instagram)" value={link.type} onChange={(event) => updateSocialLink(index, "type", event.target.value)} />
                                                <input className={`${fieldClass} mt-0 flex-1`} aria-label="Social URL" type="url" placeholder="https://..." value={link.url} onChange={(event) => updateSocialLink(index, "url", event.target.value)} />
                                                <button
                                                    type="button"
                                                    onClick={() => setShop({ ...shop, socialLinks: shop.socialLinks.filter((_, linkIndex) => linkIndex !== index) })}
                                                    aria-label="Remove social link"
                                                    className="rounded-lg border border-slate-700 px-3 text-slate-400 hover:border-red-800 hover:text-red-300"
                                                >
                                                    <Trash2 className="mx-auto h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-5">{saveButton("shop")}</div>
                            </>
                        )}
                    </section>

                    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-7">
                        <div className="mb-6 flex items-start gap-3">
                            <span className="rounded-xl bg-amber-500/10 p-2.5 text-amber-300"><BellRing className="h-5 w-5" /></span>
                            <div>
                                <h2 className="font-semibold">Notification preferences</h2>
                                <p className="mt-1 text-sm text-slate-400">Choose which seller dashboard updates you want to receive.</p>
                            </div>
                        </div>
                        <div className="divide-y divide-slate-800">
                            {[
                                ["orderUpdates", "Order updates", "New orders and order activity for your shop."],
                                ["eventReviews", "Event review updates", "When an administrator approves or rejects your submitted events."],
                                ["productUpdates", "Product updates", "Important changes to product publication and availability."],
                                ["accountAlerts", "Account alerts", "Security and seller account notices."],
                            ].map(([key, title, description]) => (
                                <label key={key} className="flex cursor-pointer items-center justify-between gap-4 py-4">
                                    <span>
                                        <span className="block text-sm font-medium">{title}</span>
                                        <span className="mt-1 block text-xs text-slate-400">{description}</span>
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={preferences[key]}
                                        onChange={(event) => setPreferences({ ...preferences, [key]: event.target.checked })}
                                        className="h-4 w-4 accent-blue-500"
                                    />
                                </label>
                            ))}
                        </div>
                        <div className="mt-3">{saveButton("notificationPreferences")}</div>
                    </section>

                    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-7">
                        <div className="mb-6 flex items-start gap-3">
                            <span className="rounded-xl bg-rose-500/10 p-2.5 text-rose-300"><KeyRound className="h-5 w-5" /></span>
                            <div>
                                <h2 className="font-semibold">Password and security</h2>
                                <p className="mt-1 text-sm text-slate-400">Confirm your current password and verify the change using a code sent to your seller email.</p>
                            </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <label className={`${labelClass} md:col-span-2`}>Current password
                                <input className={fieldClass} type="password" autoComplete="current-password" value={password.currentPassword} onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })} />
                            </label>
                            <label className={labelClass}>New password
                                <input className={fieldClass} type="password" autoComplete="new-password" minLength={8} value={password.newPassword} onChange={(event) => setPassword({ ...password, newPassword: event.target.value })} />
                            </label>
                            <label className={labelClass}>Confirm new password
                                <input className={fieldClass} type="password" autoComplete="new-password" minLength={8} value={password.confirmPassword} onChange={(event) => setPassword({ ...password, confirmPassword: event.target.value })} />
                            </label>
                            {passwordOtpSent && (
                                <label className={`${labelClass} md:col-span-2`}>Email verification code
                                    <input className={fieldClass} inputMode="numeric" autoComplete="one-time-code" value={password.otp} onChange={(event) => setPassword({ ...password, otp: event.target.value })} />
                                </label>
                            )}
                        </div>
                        <div className="mt-5 flex flex-wrap gap-3">
                            {!passwordOtpSent ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFeedback(null);
                                        requestPasswordOtp.mutate();
                                    }}
                                    disabled={requestPasswordOtp.isPending}
                                    className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
                                >
                                    <KeyRound className="h-4 w-4" />
                                    {requestPasswordOtp.isPending ? "Sending code..." : "Send verification code"}
                                </button>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFeedback(null);
                                            changePassword.mutate();
                                        }}
                                        disabled={changePassword.isPending}
                                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
                                    >
                                        <ShieldCheck className="h-4 w-4" />
                                        {changePassword.isPending ? "Updating password..." : "Verify and change password"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPasswordOtpSent(false);
                                            setPassword((current) => ({ ...current, otp: "" }));
                                        }}
                                        className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm hover:bg-slate-800"
                                    >
                                        Cancel
                                    </button>
                                </>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
};

export default SellerSettingsPage;
