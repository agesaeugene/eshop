'use client';
import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import useSeller from 'apps/seller-ui/src/hooks/useSeller';
import useSidebar from 'apps/seller-ui/src/hooks/useSidebar';
import Box from 'apps/seller-ui/src/shared/components/box';
import { Sidebar } from './sidebar.styles';
import Link from 'next/link';
import Logo from 'apps/seller-ui/src/assets/svgs/logo';
import SidebarItem from './sidebar.item';
import Home from 'apps/seller-ui/src/assets/icons/home';
import SidebarMenu from './sidebar.menu';
import { BellPlus, BellRing, CalendarPlus, ListOrdered, LogOut, Mail, PackageSearch, SquarePlus, TicketPercent, TicketPercentIcon } from 'lucide-react';
import Payment from 'apps/seller-ui/src/assets/icons/payment';


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
                height: "100vh",
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
                <Box>
                    <Link href={"/"} className="flex items-center gap-2">
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                flexShrink: 0,
                                overflow: 'hidden',
                                borderRadius: 8,
                                position: 'relative',
                            }}
                        >
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%) scale(0.173)',
                                    transformOrigin: 'center center',
                                }}
                            >
                                <Logo />
                            </div>
                        </div>
                        <Box>
                            <h3 className="text-xl font-semibold text-[#ecedee] truncate leading-tight">
                                {seller?.shop?.name ?? 'SokoJamo'}
                            </h3>
                            <h5 className="font-medium text-xs text-[#ecedeecf] whitespace-nowrap overflow-hidden text-ellipsis max-w-[170px]">
                                {seller?.shop?.address}
                            </h5>
                        </Box>
                    </Link>
                </Box>
            </Sidebar.Header>
            <div className='block my-3 h-full'>
                <Sidebar.Body className="body sidebar">
                    <SidebarItem
                        title="Dashboard"
                        icon={<Home fill={getIconColor("/dashboard")} />}
                        isActive={activeSidebar === "/dashboard"}
                        href="/dashboard"
                    />
                    <div className='mt-2 block'>
                        <SidebarMenu title="Main Menu">
                            <SidebarItem
                                isActive={activeSidebar === "/dashboard/orders"}
                                title="Orders"
                                href="/dashboard/orders"
                                icon={
                                    <ListOrdered size={26} color={getIconColor("/dashboard/orders")} />
                                }


                            />
                            <SidebarItem
                                isActive={activeSidebar === "/dashboard/payments"}
                                title="Payments"
                                href="/dashboard/payments"
                                icon={
                                    <Payment size={26} color={getIconColor("/dashboard/payments")} />
                                }


                            />

                        </SidebarMenu>
                        <SidebarMenu title="Products">
                            <SidebarItem
                                isActive={activeSidebar === "/dashboard/create-product"}
                                title="Create Product"
                                href="/dashboard/create-product"
                                icon={
                                    <SquarePlus size={26} color={getIconColor("/dashboard/create-product")} />
                                }


                            />
                            <SidebarItem
                                isActive={activeSidebar === "/dashboard/all-products"}
                                title="All Products"
                                href="/dashboard/all-products"
                                icon={
                                    <PackageSearch size={26} color={getIconColor("/dashboard/all-products")} />
                                }


                            />

                        </SidebarMenu>
                        <SidebarMenu title="Events">
                            <SidebarItem
                                isActive={activeSidebar === "/dashboard/create-event"}
                                title="Create Event"
                                href="/dashboard/create-event"
                                icon={
                                    <CalendarPlus size={26} color={getIconColor("/dashboard/create-event")} />
                                }


                            />
                            <SidebarItem
                                isActive={activeSidebar === "/dashboard/all-event"}
                                title="All Event"
                                href="/dashboard/all-event"
                                icon={
                                    <BellPlus size={26} color={getIconColor("/dashboard/all-event")} />
                                }


                            />


                        </SidebarMenu>
                        <SidebarMenu title="Controllers">

                            <SidebarItem
                                isActive={activeSidebar === "/dashboard/inbox"}
                                title="Inbox"
                                href="/dashboard/inbox"
                                icon={
                                    <Mail size={26} color={getIconColor("/dashboard/inbox")} />
                                }


                            />
                            <SidebarItem
                                isActive={activeSidebar === "/dashboard/settings"}
                                title="Settings"
                                href="/dashboard/settings"
                                icon={
                                    <Mail size={26} color={getIconColor("/dashboard/setting")} />
                                }


                            />
                            <SidebarItem
                                isActive={activeSidebar === "/dashboard/notifications"}
                                title="Notifications"
                                href="/dashboard/notifications"
                                icon={
                                    <BellRing size={26} color={getIconColor("/dashboard/notifications")} />
                                }


                            />

                        </SidebarMenu>
                        <SidebarMenu title="Events">

                            <SidebarItem
                                isActive={activeSidebar === "/dashboard/discount-codes"}
                                title="Discount Codes"
                                href="/dashboard/discount-codes"
                                icon={
                                    <TicketPercent size={26} color={getIconColor("/dashboard/discount-codes")} />
                                }


                            />
                            <SidebarItem
                                isActive={activeSidebar === "/dashboard/logout"}
                                title="Logout"
                                href="/"
                                icon={
                                    <LogOut size={26} color={getIconColor("/")} />
                                }


                            />

                        </SidebarMenu>

                    </div>

                </Sidebar.Body>

            </div>
        </Box>
    );
};

export default SidebarBarWrapper;