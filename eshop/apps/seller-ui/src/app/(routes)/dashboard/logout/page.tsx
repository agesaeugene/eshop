"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "apps/seller-ui/src/utils/axiosInstance";

const SellerLogoutPage = () => {
    const router = useRouter();
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        void axiosInstance.post("/api/logout-seller")
            .then(() => {
                if (active) router.replace("/login");
            })
            .catch((logoutError) => {
                console.error("Could not complete seller logout:", logoutError);
                if (active) setError(logoutError.response?.data?.message || "Seller logout failed. Please retry.");
            });
        return () => {
            active = false;
        };
    }, [router]);

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
            <div className="max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 text-center">
                <p>{error ? "Could not log out" : "Signing out of the seller account..."}</p>
                {error && <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-blue-600 px-4 py-2">Try again</button>}
            </div>
        </main>
    );
};

export default SellerLogoutPage;
