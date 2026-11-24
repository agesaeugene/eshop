'use client';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import { WebSocketProvider } from '../context/web-socket-context';
import useUser from 'apps/user-ui/src/hooks/useUser';
import axiosInstance from 'apps/user-ui/src/utils/axiosInstance';
import { useAuthStore } from '../store/authStore';
import { setActiveStoreUser } from '../store';

const USER_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

const Providers = ({ children }: { children: React.ReactNode }) => {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                refetchOnWindowFocus: false,
                staleTime: 1000 * 60 * 5,
            }
        }
    }));
    return (
        <QueryClientProvider client={queryClient}>
            <ProvidersWithWebSocket>
            {children}
            </ProvidersWithWebSocket>
            <Toaster />
        </QueryClientProvider>
    )
}

const ProvidersWithWebSocket = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    const { user, isloading } = useUser();
    const queryClient = useQueryClient();
    const router = useRouter();
    const setLoggedIn = useAuthStore((state) => state.setLoggedIn);
    const lastActivityAt = useRef(Date.now());

    useEffect(() => {
        if (!user?.id) return;

        let timeoutId: number;
        let isLoggingOut = false;
        lastActivityAt.current = Date.now();

        const checkInactivity = () => {
            window.clearTimeout(timeoutId);
            const remaining = USER_IDLE_TIMEOUT_MS - (Date.now() - lastActivityAt.current);
            if (remaining > 0) {
                timeoutId = window.setTimeout(checkInactivity, remaining);
                return;
            }
            if (isLoggingOut) return;

            isLoggingOut = true;
            void axiosInstance.get("/api/logout-user")
                .catch((error) => {
                    console.error("Could not complete automatic user logout:", error);
                })
                .finally(() => {
                    setLoggedIn(false);
                    setActiveStoreUser(null);
                    queryClient.setQueryData(["User"], null);
                    router.replace("/login");
                });
        };

        const recordActivity = () => {
            if (isLoggingOut) return;
            lastActivityAt.current = Date.now();
            window.clearTimeout(timeoutId);
            timeoutId = window.setTimeout(checkInactivity, USER_IDLE_TIMEOUT_MS);
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") checkInactivity();
        };

        const heartbeat = () => {
            void axiosInstance.post("/api/session-heartbeat").catch((error) => {
                console.error("Could not update user activity status:", error);
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
        timeoutId = window.setTimeout(checkInactivity, USER_IDLE_TIMEOUT_MS);
        heartbeat();
        const heartbeatId = window.setInterval(heartbeat, 30_000);

        return () => {
            window.clearTimeout(timeoutId);
            window.clearInterval(heartbeatId);
            activityEvents.forEach((event) => window.removeEventListener(event, recordActivity));
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [user?.id, queryClient, router, setLoggedIn]);

    if(isloading) return null;

    return (
        <>
        {user && <WebSocketProvider user={user}>
            {children}
            </WebSocketProvider>}
            {!user && children}
        </>
    )
}

export default Providers