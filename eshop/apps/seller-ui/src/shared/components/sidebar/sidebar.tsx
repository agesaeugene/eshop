'use client';
import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import useSeller from 'apps/seller-ui/src/hooks/useSeller';
import useSidebar from 'apps/seller-ui/src/hooks/useSidebar';
import Box from 'apps/seller-ui/src/shared/components/box';
import { Sidebar } from './sidebar.styles';


const SidebarBarWrapper = () => {
    const { activeSidebar, setActiveSidebar } = useSidebar();
    const pathName = usePathname();
    const { seller } = useSeller();

    useEffect(() => {
        setActiveSidebar(pathName);
    }, [pathName, setActiveSidebar]);

    const getIconColor = (route: string) => activeSidebar === route ? "#0085ff" : "#969696";

    return (
        <Box
        css={{
                height: "100hv",
                zIndex: 202,
                position: "sticky",
                padding: "8px",
                top: "0",
                overflowY: "scroll",
                scrollbarWidth: "none",
            }}
            className="sidebar-wrapper"
            >
                <Sidebar.Header>

                </Sidebar.Header>
            

        </Box>
    );
};

export default SidebarBarWrapper;