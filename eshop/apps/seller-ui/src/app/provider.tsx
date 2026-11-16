'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState } from 'react'
import useSeller from '../hooks/useSeller';
import { WebSocketProvider } from '../context/web-socket-context';

const Providers = ({children}:{children:React.ReactNode}) => {
    const [queryClient] = useState(() => new QueryClient());
    return (
        <QueryClientProvider client={queryClient}>
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

    if(isloading) return null;

    return (
        <>
        {seller && <WebSocketProvider seller={seller}>
            {children}
            </WebSocketProvider>}
            {!seller && children}
        </>
    )
}

export default Providers