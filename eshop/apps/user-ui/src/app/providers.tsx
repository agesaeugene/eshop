'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState } from 'react'
import { Toaster } from 'react-hot-toast';
import { WebSocketProvider } from '../context/web-socket-context';
import useUser from 'apps/user-ui/src/hooks/useUser';

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