"use client";

import React, { useEffect } from "react";
import useSidebar from "../../../../hooks/useSidebar";
import { usePathname } from "next/navigation";
import useAdmin from "apps/admin-ui/src/hooks/useAdmin";
import Box from "../box";
import { Sidebar } from "./sidebar.styles";
import Link from "next/link";
import Logo from "../../../assets/svgs/logo";
import SidebarItem from "./sidebar.item";
import Home from "../../../assets/svgs/home";
import SidebarMenu from "./sidebar.menu";
import { BellPlus, BellRing, FileClock, ListOrdered, LogOut, MessageSquare, PackageSearch, PencilRuler, Settings, Store, Users } from "lucide-react";
import Payment from "../../../assets/svgs/payment";



const SidebarWrapper = () => {
    const { activeSidebar, setActiveSidebar } = useSidebar();
    const pathName = usePathname();
    const { admin } = useAdmin();

    useEffect(() => {
        setActiveSidebar(pathName);
    }, [pathName, setActiveSidebar])

    const getIconColor = (route: string) =>
        activeSidebar === route ? "#0085ff" : "#969696";

    return <div>
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
                    <Link href={"/"} className="flex items-center justify-center text-center gap-2">
                        <div className="relative w-9 h-9 shrink-0">
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
                            <h3 className="text-xl font-medium text-[#ecedee]">
                                {admin?.name}
                            </h3>
                            <h5 className="font-medium pl-2 text-xs text-[#ecedeecf]">
                                {admin?.email}
                            </h5>
                        </Box>
                    </Link>
                </Box>

            </Sidebar.Header>
            <div className="block my-3 h-full">
                <Sidebar.Body className="body sidebar">
                    <SidebarItem
                        title="Dashboard"
                        icon={<Home fill={getIconColor("/dashboard")} />}
                        isActive={activeSidebar === "/dashboard"}
                        href="/dashboard"
                    />

                    <div className="mt-2 block">
                        <SidebarMenu title="menu">
                            <SidebarItem
                                isActive={activeSidebar === "/dashboard/orders"}
                                title="Orders"
                                href="/dashboard/orders"
                                icon={
                                    <ListOrdered
                                        size={24}
                                        color={getIconColor("/dashboard/orders")}
                                    />
                                }

                            />

                            <SidebarItem
                                isActive={activeSidebar === "/dashboard/finance"}
                                title="Transactions & Payouts"
                                href="/dashboard/finance"
                                icon={
                                    <Payment
                                        size={26}
                                        color={getIconColor("/dashboard/finance")}
                                    />
                                }

                            />

                            <SidebarItem
                                isActive={activeSidebar === "/dashboard/products"}
                                title="Products"
                                href="/dashboard/products"
                                icon={
                                    <PackageSearch
                                        size={22}
                                        color={getIconColor("/dashboard/products")}
                                    />
                                }

                            />

                            <SidebarItem
                                isActive={activeSidebar === "/dashboard/events"}
                                title="Events"
                                href="/dashboard/events"
                                icon={
                                    <BellPlus
                                        size={24}
                                        color={getIconColor("/dashboard/events")}
                                    />
                                }

                            />

                            <SidebarItem
                                isActive={activeSidebar === "/dashboard/users"}
                                title="Users"
                                href="/dashboard/users"
                                icon={
                                    <Users
                                        size={24}
                                        color={getIconColor("/dashboard/users")}
                                    />
                                }

                            />

                            <SidebarItem
                                isActive={activeSidebar === "/dashboard/sellers"}
                                title="Sellers"
                                href="/dashboard/sellers"
                                icon={
                                    <Store
                                        size={22}
                                        color={getIconColor("/dashboard/sellers")}
                                    />
                                }

                            />

                            <SidebarItem
                                isActive={activeSidebar === "/dashboard/messages"}
                                title="Messages"
                                href="/dashboard/messages"
                                icon={
                                    <MessageSquare
                                        size={22}
                                        color={getIconColor("/dashboard/messages")}
                                    />
                                }
                            />


                        </SidebarMenu>
                        <SidebarMenu title="Controllers">
                            <SidebarItem
                                isActive={activeSidebar === "/dashboard/loggers"}
                                title="Loggers"
                                href="/dashboard/loggers"
                                icon={
                                    <FileClock
                                        size={22}
                                        color={getIconColor("/dashboard/orders")}
                                    />
                                }

                            />

                            <SidebarItem
                                isActive={activeSidebar === "/dashboard/settings"}
                                title="Settings"
                                href="/dashboard/settings"
                                icon={
                                    <Settings
                                        size={22}
                                        color={getIconColor("/dashboard/settings")}
                                    />
                                }
                            />

                            <SidebarItem
                                isActive={activeSidebar === "/dashboard/management"}
                                title="Management"
                                href="/dashboard/management"
                                icon={
                                    <Settings
                                        size={22}
                                        color={getIconColor("/dashboard/management")}
                                    />
                                }
                            />

                            <SidebarItem
                                isActive={activeSidebar === "/dashboard/notifications"}
                                title="Notifications"
                                href="/dashboard/notifications"
                                icon={
                                    <BellRing
                                        size={24}
                                        color={getIconColor("/dashboard/notifications")}
                                    />
                                }

                            />



                        </SidebarMenu>

                        <SidebarMenu title="Customization">
                            <SidebarItem
                                isActive={activeSidebar === "/dashboard/customization"}
                                title="All Customization"
                                href="/dashboard/customization"
                                icon={
                                    <PencilRuler
                                        size={22}
                                        color={getIconColor("/dashboard/orders")}
                                    />
                                }

                            />

                        </SidebarMenu>

                        <SidebarMenu title="<Extras>">
                            <SidebarItem
                                isActive={activeSidebar === "/logout"}
                                title="Logout"
                                href="/logout"
                                icon={
                                    <LogOut
                                        size={22}
                                        color={getIconColor("/logout")}
                                    />
                                }

                            />

                        </SidebarMenu>

                    </div>

                </Sidebar.Body>

            </div>


        </Box>
    </div>;
};

export default SidebarWrapper;