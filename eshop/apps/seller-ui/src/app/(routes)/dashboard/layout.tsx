"use client";
import React from 'react';
import SidebarBarWrapper from '../../../shared/components/sidebar/sidebar';

const Layout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className='flex h-full bg-black min-h-screen text-slate-200'>
            <aside className='w-[280px] min-w-[250px] max-w-[300px] border-r border-slate-800 bg-[#0a0a0a] p-4'>
                <div className="sticky top-0">
                    <SidebarBarWrapper />
                </div>
            </aside>
            <main className="flex-1 overflow-x-hidden">
                {children}
            </main>
        </div>
    );
};

export default Layout;