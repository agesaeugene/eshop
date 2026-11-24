'use client'
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
    BadgeCheck, Bell, CheckCircle, Clock, Gift, Inbox, Loader2, Lock,
    LogOut, MapPin, Pencil, PhoneCall, Receipt, Settings, ShoppingBag, Truck, User, Wallet,
} from 'lucide-react';
import useRequireAuth from 'apps/user-ui/src/hooks/useRequiredAuth';
import useUserOrders, { USER_ORDERS_KEY } from 'apps/user-ui/src/hooks/useUserOrders';
import useUserNotifications, { USER_NOTIFICATIONS_KEY } from 'apps/user-ui/src/hooks/useUserNotifications';
import QuickActionCard from 'apps/user-ui/src/shared/components/cards/quick-action.card';
import StatCard from 'apps/user-ui/src/shared/components/cards/stat.card';
import ShippingAddressSection from 'apps/user-ui/src/shared/components/shippingAddress';
import OrdersSection from 'apps/user-ui/src/shared/components/orders';
import NotificationsSection from 'apps/user-ui/src/shared/components/notifications';
import ChangePasswordSection from 'apps/user-ui/src/shared/components/changePassword';
import axiosInstance from 'apps/user-ui/src/utils/axiosInstance';
import { normalizeStatus } from 'apps/user-ui/src/utils/delivery-status';
import { setActiveStoreUser } from 'apps/user-ui/src/store';

const TABS = ["Profile", "My Orders", "Notifications", "Shipping Address", "Change Password"] as const;
type Tab = (typeof TABS)[number];

const isTab = (value: string | null): value is Tab =>
    !!value && (TABS as readonly string[]).includes(value);

const Page = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const queryClient = useQueryClient();

    const { user, isloading } = useRequireAuth();

    const { data: orders = [], isLoading: ordersLoading } = useUserOrders(!!user);
    const { data: notifications = [], isLoading: notificationsLoading } = useUserNotifications(!!user);

    const totalOrders = orders.length;
    const completedOrders = orders.filter(
        (o) => normalizeStatus(o.deliveryStatus) === "delivered"
    ).length;
    const processingOrders = orders.filter(
        (o) => !["delivered", "cancelled"].includes(normalizeStatus(o.deliveryStatus))
    ).length;
    const unreadNotifications = notifications.filter((n) => !n.isRead).length;

    const queryTab = searchParams.get("active");
    const [activeTab, setActiveTab] = useState<Tab>(isTab(queryTab) ? queryTab : "Profile");

    // keep the URL in sync with the selected tab
    useEffect(() => {
        if (searchParams.get("active") === activeTab) return;
        const params = new URLSearchParams(searchParams.toString());
        params.set("active", activeTab);
        router.replace(`/profile?${params.toString()}`);
    }, [activeTab, router, searchParams]);

    const logoutHandler = async () => {
        try {
            await axiosInstance.get("/api/logout-user");
        } catch (error) {
            // even if the request fails, still clear the local session below
            console.error("Logout request failed:", error);
        } finally {
            // clear this user's cached data so the next login never sees it
            queryClient.setQueryData(["User"], null);
            queryClient.removeQueries({ queryKey: USER_ORDERS_KEY });
            queryClient.removeQueries({ queryKey: USER_NOTIFICATIONS_KEY });
            // empty the in-memory cart/wishlist (the saved copy stays under this user's id)
            setActiveStoreUser(null);
            router.push("/login");
        }
    };



    const renderContent = () => {
        switch (activeTab) {
            case "Profile":
                return !isloading && user ? (
                    <div className="space-y-4 text-sm text-gray-700">
                        <div className="flex items-center gap-3">
                            <Image
                                src={user.avatar || "https://ik.imagekit.io/eugenesokojamo/products/profile-image-9.jpeg"}
                                alt="Profile"
                                width={64}
                                height={64}
                                className="w-16 h-16 rounded-full border border-gray-200"
                            />
                            <button className="flex items-center gap-1 text-blue-500 text-xs font-medium">
                                <Pencil className="w-4 h-4" /> Change Photo
                            </button>
                        </div>
                        <p><span className="font-semibold">Name:</span> {user.name}</p>
                        <p><span className="font-semibold">Email:</span> {user.email}</p>
                        <p>
                            <span className="font-semibold">Joined:</span>{" "}
                            {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                        <p><span className="font-semibold">Earned Points:</span> {user.points || 0}</p>
                    </div>
                ) : (
                    <p className="text-sm text-gray-500">Loading profile...</p>
                );
            case "My Orders":
                return <OrdersSection orders={orders} isLoading={ordersLoading} />;
            case "Notifications":
                return <NotificationsSection notifications={notifications} isLoading={notificationsLoading} />;
            case "Shipping Address":
                return <ShippingAddressSection />;
            case "Change Password":
                return <ChangePasswordSection />;
        }
    };

    return (
        <div className="bg-gray-50 p-6 pb-14">
            <div className="md:max-w-7xl mx-auto">
                {/* Greetings */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-gray-800">
                        Welcome back{" "}
                        <span className="text-blue-600">
                            {isloading ? (
                                <Loader2 className="inline animate-spin w-5 h-5" />
                            ) : (
                                user?.name || "User"
                            )}
                        </span>{" "}
                        👋
                    </h1>
                </div>

                {/* Profile Overview Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    <StatCard title="Total Orders" count={totalOrders} Icon={Clock} />
                    <StatCard title="Processing Orders" count={processingOrders} Icon={Truck} />
                    <StatCard title="Completed Orders" count={completedOrders} Icon={CheckCircle} />
                </div>

                {/* Sidebar and content layout */}
                <div className="mt-10 flex flex-col md:flex-row gap-6">
                    {/* Left Navigation */}
                    <div className="bg-white p-4 rounded-md shadow-sm border border-gray-100 w-full md:w-1/5">
                        <nav className="space-y-2">
                            <NavItem label="Profile" Icon={User} active={activeTab === "Profile"} onClick={() => setActiveTab("Profile")} />
                            <NavItem label="My Orders" Icon={ShoppingBag} active={activeTab === "My Orders"} onClick={() => setActiveTab("My Orders")} />
                            <NavItem label="Wallet" Icon={Wallet} onClick={() => router.push("/wallet")} />
                            <NavItem label="Inbox" Icon={Inbox} onClick={() => router.push("/inbox")} />
                            <NavItem
                                label="Notifications"
                                Icon={Bell}
                                active={activeTab === "Notifications"}
                                onClick={() => setActiveTab("Notifications")}
                                badgeCount={unreadNotifications}
                            />
                            <NavItem label="Shipping Address" Icon={MapPin} active={activeTab === "Shipping Address"} onClick={() => setActiveTab("Shipping Address")} />
                            <NavItem label="Change Password" Icon={Lock} active={activeTab === "Change Password"} onClick={() => setActiveTab("Change Password")} />
                            <NavItem label="Logout" Icon={LogOut} danger onClick={logoutHandler} />
                        </nav>
                    </div>

                    {/* Main Content */}
                    <div className="bg-white p-6 rounded-md shadow-sm border border-gray-100 w-full md:w-[55%]">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">{activeTab}</h2>
                        {renderContent()}
                    </div>

                    {/* Right Quick Panel */}
                    <div className="w-full md:w-1/4 space-y-4">
                        <QuickActionCard Icon={Gift} title="Referral Program" description="Invite friends and earn rewards." />
                        <QuickActionCard Icon={BadgeCheck} title="Your Badges" description="View your earned achievements." />
                        <QuickActionCard Icon={Settings} title="Account Settings" description="Manage preferences and security." />
                        <QuickActionCard Icon={Receipt} title="Billing History" description="Check your recent payments." />
                        <QuickActionCard Icon={PhoneCall} title="Support Center" description="Need help? Contact support." />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Page;

type NavItemProps = {
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
    active?: boolean;
    danger?: boolean;
    badgeCount?: number;
    onClick: () => void;
};

const NavItem = ({ label, Icon, active, danger, onClick, badgeCount }: NavItemProps) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm font-medium transition ${active
                ? "bg-blue-100 text-blue-600"
                : danger
                    ? "text-red-500 hover:bg-gray-100"
                    : "text-gray-700 hover:bg-gray-100"
            }`}
    >
        <span className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            {label}
        </span>
        {!!badgeCount && (
            <span className="bg-red-500 text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {badgeCount > 9 ? "9+" : badgeCount}
            </span>
        )}
    </button>
);