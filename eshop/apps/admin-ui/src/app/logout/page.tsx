"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "../utils/axiosinstance";

const AdminLogoutPage = () => {
    const router = useRouter();
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        void axiosInstance.post("/api/logout-admin")
            .then(() => {
                if (active) router.replace("/");
            })
            .catch((logoutError) => {
                console.error("Could not complete admin logout:", logoutError);
                if (active) setError(logoutError.response?.data?.message || "Admin logout failed. Please retry.");
            });
        return () => {
            active = false;
        };
    }, [router]);

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
            <div className="max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 text-center">
                <p>{error ? "Could not log out" : "Signing out of the admin account..."}</p>
                {error && <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-blue-600 px-4 py-2">Try again</button>}
            </div>
        </main>
    );
};

export default AdminLogoutPage;
