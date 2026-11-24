'use client';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation';
import useSeller from '../hooks/useSeller';
import axiosInstance from '../utils/axiosInstance';
import { WebSocketProvider } from '../context/web-socket-context';

const SELLER_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

const SellerSessionManager = () => {
    const { seller } = useSeller();
    const queryClient = useQueryClient();
    const router = useRouter();
    const lastActivityAt = useRef(Date.now());

    useEffect(() => {
        if (!seller?.id) return;

        let timeoutId: number;
        let isLoggingOut = false;
        lastActivityAt.current = Date.now();

        const checkInactivity = () => {
            window.clearTimeout(timeoutId);
            const remaining = SELLER_IDLE_TIMEOUT_MS - (Date.now() - lastActivityAt.current);
            if (remaining > 0) {
                timeoutId = window.setTimeout(checkInactivity, remaining);
                return;
            }

            if (isLoggingOut) return;
            isLoggingOut = true;
            void axiosInstance.post("/api/logout-seller")
                .catch((error) => {
                    console.error("Could not complete automatic seller logout:", error);
                })
                .finally(() => {
                    queryClient.setQueryData(["seller"], null);
                    router.replace("/login");
                });
        };

        const recordActivity = () => {
            if (isLoggingOut) return;
            lastActivityAt.current = Date.now();
            window.clearTimeout(timeoutId);
            timeoutId = window.setTimeout(checkInactivity, SELLER_IDLE_TIMEOUT_MS);
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") checkInactivity();
        };

        const heartbeat = () => {
            void axiosInstance.post("/api/seller/session-heartbeat").catch((error) => {
                console.error("Could not update seller activity status:", error);
            });
        };

        const activityEvents: Array<keyof WindowEventMap> = [
            "pointerdown",
            "keydown",
            "mousemove",
            "scroll",
            "touchstart",
        ];
        activityEvents.forEach((event) => {
            window.addEventListener(event, recordActivity, { passive: true });
        });
        document.addEventListener("visibilitychange", handleVisibilityChange);
        timeoutId = window.setTimeout(checkInactivity, SELLER_IDLE_TIMEOUT_MS);
        heartbeat();
        const heartbeatId = window.setInterval(heartbeat, 30_000);

        return () => {
            window.clearTimeout(timeoutId);
            window.clearInterval(heartbeatId);
            activityEvents.forEach((event) => {
                window.removeEventListener(event, recordActivity);
            });
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [seller?.id, queryClient, router]);

    return null;
};

const Providers = ({children}:{children:React.ReactNode}) => {
    const [queryClient] = useState(() => new QueryClient());
    return (
        <QueryClientProvider client={queryClient}>
            <SellerSessionManager />
            {children}
        </QueryClientProvider>
    )
}

const ProvidersWithWebSocket = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    const { seller, isloading } = useSeller();

    if (isloading) return null;

    return seller
        ? <WebSocketProvider seller={seller}>{children}</WebSocketProvider>
        : children;
};

export default Providers;