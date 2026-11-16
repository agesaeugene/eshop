"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { XIcon } from "apps/user-ui/src/assets/svgs/x-icon";
import YoutubeIcon from "apps/user-ui/src/assets/svgs/youtube-icon";
import axiosInstance from "apps/user-ui/src/utils/axiosInstance";
import {
    Calendar,
    Clock,
    Globe,
    Heart,
    MapPin,
    Star,
    Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import ProductCard from "../../components/cards/product-card";
import useLocationTracking from "apps/user-ui/src/hooks/useLocationTracking";
import useDeviceTracking from "apps/user-ui/src/hooks/useDeviceTracking";
import useUser from "apps/user-ui/src/hooks/useUser";
import { sendKafkaEvent } from "apps/user-ui/src/actions/track-user";

const TABS = ["Products", "Offers", "Reviews"];

// Local type: avatar is a relation (images) in your schema, so it is an object with a url.
interface ShopData {
    id: string;
    name: string;
    bio?: string | null;
    category?: string;
    avatar?: { url: string } | null;
    coverBanner?: string | null;
    address?: string;
    opening_hours?: string;
    website?: string;
    socialLinks?: any[];
    ratings?: number;
    createdAt: string;
}

const SellerProfile = ({
    shop,
    followersCount,
}: {
    shop: ShopData;
    followersCount: number;
}) => {
    const [activeTab, setActiveTab] = useState("Products");
    const [followers, setFollowers] = useState(followersCount);
    const [isFollowing, setIsFollowing] = useState(false);

    const { user } = useUser();
    const location = useLocationTracking();
    const deviceInfo = useDeviceTracking();
    const queryClient = useQueryClient();

    // ---- Products ----
    const { data: products, isLoading } = useQuery({
        queryKey: ["shop-products", shop?.id],
        queryFn: async () => {
            const res = await axiosInstance.get(
                `/product/api/shop-products/${shop?.id}?page=1&limit=10`
            );
            return res.data.products;
        },
        enabled: !!shop?.id,
        staleTime: 1000 * 60 * 5,
    });

    // ---- Offers / events ----
    const { data: events, isLoading: isEventLoading } = useQuery({
        queryKey: ["shop-events", shop?.id],
        queryFn: async () => {
            const res = await axiosInstance.get(
                `/product/api/shop-events/${shop?.id}?page=1&limit=10`
            );
            return res.data.events;
        },
        enabled: !!shop?.id && activeTab === "Offers",
        staleTime: 1000 * 60 * 5,
    });

    // ---- Is the current user already following? ----
    const { data: followStatus } = useQuery({
        queryKey: ["is-following", shop?.id],
        queryFn: async () => {
            const res = await axiosInstance.get(
                `/product/api/is-following/${shop?.id}`
            );
            return res.data;
        },
        enabled: !!shop?.id && !!user?.id,
        retry: false,
    });

    useEffect(() => {
        if (typeof followStatus?.isFollowing === "boolean") {
            setIsFollowing(followStatus.isFollowing);
        }
    }, [followStatus]);

    const toggleFollowMutation = useMutation({
        mutationFn: async () => {
            if (isFollowing) {
                await axiosInstance.post("/product/api/unfollow-shop", {
                    shopId: shop?.id,
                });
            } else {
                await axiosInstance.post("/product/api/follow-shop", {
                    shopId: shop?.id,
                });
            }
        },
        onSuccess: () => {
            setFollowers((prev) => (isFollowing ? prev - 1 : prev + 1));
            setIsFollowing((prev) => !prev);
            queryClient.invalidateQueries({
                queryKey: ["is-following", shop?.id],
            });
        },
        onError: () => {
            console.error("Failed to follow/unfollow the shop.");
        },
    });

    // ---- Track shop visit ----
    useEffect(() => {
        if (isLoading) return;
        if (!location || !deviceInfo || !user?.id || !shop?.id) return;

        sendKafkaEvent({
            userId: user.id,
            shopId: shop.id,
            action: "shop_visit",
            country: location?.country || "Unknown",
            city: location?.city || "Unknown",
            device: deviceInfo || "Unknown Device",
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location, deviceInfo, isLoading, user?.id, shop?.id]);

    const socialLinks = (shop?.socialLinks ?? []) as any[];

    return (
        <div>
            {/* Cover */}
            <div className="relative w-full flex justify-center">
                <Image
                    src={shop?.coverBanner || "/placeholder-cover.jpg"}
                    alt="Seller Cover"
                    className="w-full h-[400px] object-cover"
                    width={1200}
                    height={300}
                />
            </div>

            {/* Seller info + details */}
            <div className="w-[85%] lg:w-[70%] mt-[-50px] mx-auto relative z-20 flex flex-col lg:flex-row gap-6">
                {/* Info card */}
                <div className="bg-gray-200 p-6 rounded-lg shadow-lg flex-1">
                    <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                        <div className="relative w-[100px] h-[100px] shrink-0 rounded-full border-4 border-slate-300 overflow-hidden">
                            <Image
                                src={shop?.avatar?.url || "/placeholder-avatar.jpg"}
                                alt="Seller Avatar"
                                fill
                                className="object-cover"
                            />
                        </div>

                        <div className="flex-1 w-full">
                            <h1 className="text-2xl font-semibold text-slate-900">
                                {shop?.name}
                            </h1>
                            <p className="text-slate-800 text-sm mt-1">
                                {shop?.bio || "No bio available"}
                            </p>

                            <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center text-blue-400 gap-1">
                                    <Star fill="#60a5fa" size={18} />{" "}
                                    <span>{shop?.ratings ? shop.ratings : "N/A"}</span>
                                </div>
                                <div className="flex items-center text-slate-700 gap-1">
                                    <Users size={18} /> <span>{followers} Followers</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mt-3 text-slate-700">
                                <Clock size={18} />
                                <span>
                                    {shop?.opening_hours || "Mon - Sat: 9 AM - 6 PM"}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-3 text-slate-700">
                                <MapPin size={18} />
                                <span>{shop?.address || "No address provided"}</span>
                            </div>
                        </div>

                        <button
                            className={`px-3 py-2 h-[40px] rounded-lg font-semibold text-white flex items-center gap-2 transition ${
                                isFollowing
                                    ? "bg-red-500 hover:bg-red-600"
                                    : "bg-blue-600 hover:bg-blue-700"
                            }`}
                            onClick={() => toggleFollowMutation.mutate()}
                            disabled={toggleFollowMutation.isPending}
                        >
                            <Heart size={18} />
                            {isFollowing ? "Unfollow" : "Follow"}
                        </button>
                    </div>
                </div>

                {/* Shop details card */}
                <div className="bg-gray-200 p-6 rounded-lg shadow-lg w-full lg:w-[30%]">
                    <h2 className="text-xl font-semibold text-slate-900">Shop Details</h2>
                    <div className="flex items-center gap-3 mt-3 text-slate-700">
                        <Calendar size={18} />
                        <span>
                            Joined: {new Date(shop.createdAt).toLocaleDateString()}
                        </span>
                    </div>

                    {shop?.website && (
                        <div className="flex items-center gap-3 mt-3 text-slate-700">
                            <Globe size={18} />
                            <Link
                                href={shop.website}
                                className="hover:underline text-blue-600"
                            >
                                {shop.website}
                            </Link>
                        </div>
                    )}

                    {socialLinks.length > 0 && (
                        <div className="mt-3">
                            <h3 className="text-slate-700 text-lg font-medium">Follow us:</h3>
                            <div className="flex gap-3 mt-2">
                                {socialLinks.map((link: any, index: number) => (
                                    <a
                                        key={index}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="opacity-[.9]"
                                    >
                                        {link.type === "youtube" && <YoutubeIcon />}
                                        {link.type === "x" && <XIcon />}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="w-[85%] lg:w-[70%] mx-auto mt-8">
                <div className="flex border-b border-gray-300">
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-3 px-6 text-lg font-semibold transition ${
                                activeTab === tab
                                    ? "text-slate-800 border-b-2 border-blue-600"
                                    : "text-slate-600"
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="bg-gray-200 rounded-lg my-4 text-slate-700">
                    {activeTab === "Products" && (
                        <div className="m-auto grid grid-cols-1 gap-4 p-4 sm:grid-cols-3 md:grid-cols-4">
                            {isLoading &&
                                Array.from({ length: 10 }).map((_, index) => (
                                    <div
                                        key={index}
                                        className="h-[250px] bg-gray-300 animate-pulse rounded-xl"
                                    />
                                ))}

                            {products?.map((product: any) => (
                                <ProductCard key={product.id} product={product} />
                            ))}

                            {!isLoading && products?.length === 0 && (
                                <p className="py-2">No products available yet!</p>
                            )}
                        </div>
                    )}

                    {activeTab === "Offers" && (
                        <div className="m-auto grid grid-cols-1 gap-4 p-4 sm:grid-cols-3 md:grid-cols-4">
                            {isEventLoading &&
                                Array.from({ length: 10 }).map((_, index) => (
                                    <div
                                        key={index}
                                        className="h-[250px] bg-gray-300 animate-pulse rounded-xl"
                                    />
                                ))}

                            {events?.map((product: any) => (
                                <ProductCard
                                    isEvent={true}
                                    key={product.id}
                                    product={product}
                                />
                            ))}

                            {!isEventLoading && events?.length === 0 && (
                                <p className="py-2">No offers available yet!</p>
                            )}
                        </div>
                    )}

                    {activeTab === "Reviews" && (
                        <div>
                            <p className="text-center py-5">No reviews available yet!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SellerProfile;