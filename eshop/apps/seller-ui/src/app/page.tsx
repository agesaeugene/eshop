"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Star,
  Users,
  Clock,
  MapPin,
  Calendar,
  Globe,
  Youtube,
  Twitter,
} from "lucide-react";
import useSeller from "../hooks/useSeller";
import { useQuery } from "@tanstack/react-query";
import axiosInstance from "../utils/axiosInstance";

type ShopProduct = {
  id: string;
  title: string;
  slug?: string;
  stock?: number;
  sale_price?: number;
  regular_price?: number;
  images?: { url: string }[];
};

const tabs = ["Products", "Offers", "Reviews"] as const;
type Tab = (typeof tabs)[number];

const emptyMessages: Record<Tab, string> = {
  Products: "No products available yet!",
  Offers: "No offers available yet!",
  Reviews: "No reviews available yet!",
};

// Simple illustration for the default cover (right side of the banner)
const CoverIllustration = () => (
  <svg
    viewBox="0 0 320 300"
    className="h-full w-auto"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* speech bubble */}
    <rect x="10" y="20" width="170" height="125" rx="6" fill="#fff" stroke="#1f2a44" strokeWidth="5" />
    <path d="M120 145 L150 185 L150 145 Z" fill="#fff" stroke="#1f2a44" strokeWidth="5" strokeLinejoin="round" />
    <rect x="115" y="140" width="40" height="10" fill="#fff" />
    {/* cart */}
    <path d="M35 50 H55 L70 100 H135 L145 65 H62" fill="none" stroke="#1f2a44" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="82" cy="118" r="7" fill="#1f2a44" />
    <circle cx="122" cy="118" r="7" fill="#1f2a44" />
    {/* check badge */}
    <circle cx="140" cy="45" r="22" fill="#fff" stroke="#1f2a44" strokeWidth="5" />
    <path d="M129 45 L138 54 L152 37" fill="none" stroke="#1f2a44" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    {/* hair */}
    <path d="M200 150 C185 90 215 50 255 55 C300 60 315 110 300 175 L250 175 Z" fill="#2b1b5a" />
    {/* face */}
    <ellipse cx="240" cy="120" rx="28" ry="34" fill="#c8742f" />
    <circle cx="230" cy="115" r="2.5" fill="#1f2a44" />
    <circle cx="252" cy="115" r="2.5" fill="#1f2a44" />
    <path d="M232 134 Q241 142 252 134" fill="none" stroke="#1f2a44" strokeWidth="3" strokeLinecap="round" />
    {/* body */}
    <path d="M190 300 L195 195 C200 165 280 160 290 195 L305 300 Z" fill="#f5b83d" />
    <path d="M232 155 L240 175 L250 155" fill="none" stroke="#1f2a44" strokeWidth="3" strokeLinejoin="round" />
    {/* arm + phone */}
    <path d="M205 210 C190 240 200 260 225 255" fill="#c8742f" stroke="#c8742f" strokeWidth="16" strokeLinecap="round" />
    <rect x="212" y="215" width="34" height="58" rx="5" fill="#3b4cca" stroke="#1f2a44" strokeWidth="3" transform="rotate(-12 229 244)" />
    {/* watch */}
    <rect x="205" y="262" width="26" height="14" rx="4" fill="#2f7fd1" />
  </svg>
);

const Page = () => {
  const router = useRouter();
  const { seller, isloading, isError } = useSeller();
  const [activeTab, setActiveTab] = React.useState<Tab>("Products");

  // No logged-in seller -> send to login first
  useEffect(() => {
    if (!isloading && (isError || !seller)) {
      router.replace("/login");
    }
  }, [isloading, isError, seller, router]);

  // Products created by the logged-in seller only (server filters by the authenticated seller's shop)
  const { data: products = [], isLoading: productsLoading } = useQuery<ShopProduct[]>({
    queryKey: ["seller-shop-products", seller?.id],
    queryFn: async () => {
      const res = await axiosInstance.get("/product/api/get-shop-products");
      return res.data.products ?? [];
    },
    enabled: !!seller?.id,
  });

  // Number of users following this shop
  const { data: followersData } = useQuery<{ count: number }>({
    queryKey: ["seller-shop-followers", seller?.id],
    queryFn: async () => {
      const res = await axiosInstance.get("/seller/api/get-shop-followers-count");
      return { count: Number(res.data.count ?? 0) };
    },
    enabled: !!seller?.id,
    retry: false,
  });

  if (isloading || !seller) {
    return (
      <div className="min-h-screen bg-[#0b111d] flex items-center justify-center text-gray-300">
        Loading...
      </div>
    );
  }

  const shop = seller.shop ?? {};
  const shopName: string = shop.name || seller.name || "My Shop";
  const avatarUrl: string | undefined =
    typeof shop.avatar === "string" ? shop.avatar : shop.avatar?.url;
  const coverUrl: string | undefined =
    typeof shop.coverBanner === "string" ? shop.coverBanner : shop.coverBanner?.url;
  const socialLinks: { type?: string; url?: string }[] = Array.isArray(shop.socialLinks)
    ? shop.socialLinks
    : [];

  const joinedAt = seller.createdAt
    ? new Date(seller.createdAt).toLocaleDateString("en-US")
    : "-";

  // Prefer the dedicated count; fall back to any followers array on the seller/shop object
  const followersCount: number =
    followersData?.count ??
    (Array.isArray(shop.followers) ? shop.followers.length : undefined) ??
    (Array.isArray(seller.followers) ? seller.followers.length : 0);

  const iconFor = (type?: string) =>
    (type || "").toLowerCase().includes("youtube") ? (
      <Youtube size={20} />
    ) : (
      <Twitter size={20} />
    );

  return (
    <div className="min-h-screen bg-[#0b111d] text-white">
      {/* Back to Dashboard */}
      <div className="px-4 py-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-gray-200 hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </div>

      {/* Cover */}
      <div className="relative w-full h-[300px] bg-[#fbc520] overflow-hidden">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="Shop cover" className="w-full h-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-between px-10 md:px-32">
            <div>
              <h2 className="text-5xl md:text-7xl font-serif text-[#111] leading-tight">
                Shop Anytime
              </h2>
              <p className="mt-6 text-xl md:text-3xl font-semibold tracking-wide text-[#1a1a2e] uppercase">
                24/7 Really Great Shop
              </p>
            </div>
            <div className="hidden md:block h-full pt-3">
              <CoverIllustration />
            </div>
          </div>
        )}

        <Link href="/dashboard/settings" className="absolute top-4 right-4 flex items-center gap-2 bg-[#1f2937] hover:bg-[#374151] text-sm font-medium px-4 py-2 rounded-md shadow">
          <Pencil size={14} />
          Edit Cover
        </Link>
      </div>

      {/* Profile card + Shop details */}
      <div className="max-w-[900px] mx-auto px-4 -mt-9 relative z-10 grid grid-cols-1 md:grid-cols-[1fr_265px] gap-5">
        {/* Profile card */}
        <div className="bg-[#161e2c] rounded-lg p-5 flex gap-5 shadow-lg">
          <div className="relative w-[76px] h-[76px] shrink-0">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={shopName}
                className="w-[76px] h-[76px] rounded-full object-cover border-2 border-gray-500 p-[2px]"
              />
            ) : (
              <div className="w-[76px] h-[76px] rounded-full border-2 border-gray-500 bg-[#243044] flex items-center justify-center text-2xl font-semibold">
                {shopName.charAt(0).toUpperCase()}
              </div>
            )}
            <button className="absolute bottom-0 right-0 bg-[#2b3648] p-1 rounded-full border border-[#161e2c]">
              <Pencil size={11} />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <h1 className="text-lg font-semibold truncate">{shopName}</h1>
                <p className="text-xs text-gray-400 mt-1">
                  {shop.bio || "No bio added yet."}
                </p>
              </div>
              <button className="shrink-0 flex items-center gap-2 bg-[#2b3648] hover:bg-[#374357] text-sm font-medium px-5 py-2 rounded-md">
                <Pencil size={14} />
                Edit Profile
              </button>
            </div>

            <div className="flex items-center gap-4 mt-3 text-sm">
              <span className="flex items-center gap-1 text-yellow-400">
                <Star size={14} fill="currentColor" />
                {shop.ratings ?? "N/A"}
              </span>
              <span className="flex items-center gap-1 text-gray-300">
                <Users size={14} />
                {followersCount.toLocaleString()}{" "}
                {followersCount === 1 ? "Follower" : "Followers"}
              </span>
            </div>

            <p className="flex items-center gap-2 text-sm text-gray-400 mt-3">
              <Clock size={14} />
              {shop.opening_hours || "Mon - Fri 9 am to 10pm"}
            </p>
            <p className="flex items-center gap-2 text-sm text-gray-400 mt-2">
              <MapPin size={14} />
              {shop.address || "Address not set"}
            </p>
          </div>
        </div>

        {/* Shop details card */}
        <div className="bg-[#161e2c] rounded-lg p-5 shadow-lg h-fit">
          <h3 className="font-semibold mb-4">Shop Details</h3>

          <p className="flex items-center gap-2 text-sm text-gray-400">
            <Calendar size={14} />
            Joined At: {joinedAt}
          </p>

          <p className="flex items-center gap-2 text-sm mt-3">
            <Globe size={14} className="text-gray-400 shrink-0" />
            {shop.website ? (
              <a
                href={shop.website}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline truncate"
              >
                {shop.website}
              </a>
            ) : (
              <span className="text-gray-500">No website</span>
            )}
          </p>

          <h4 className="font-semibold mt-4 mb-2 text-sm">Follow Us:</h4>
          <div className="flex items-center gap-3 text-white">
            {socialLinks.length > 0 ? (
              socialLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-blue-400"
                >
                  {iconFor(link.type)}
                </a>
              ))
            ) : (
              <>
                <Youtube size={20} />
                <Twitter size={20} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-[900px] mx-auto px-4 mt-12 pb-16">
        <div className="flex gap-10 border-b border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-2 text-sm font-semibold -mb-px border-b-2 transition-colors ${
                activeTab === tab
                  ? "text-white border-blue-500"
                  : "text-gray-400 border-transparent hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "Products" ? (
          productsLoading ? (
            <div className="mt-5 bg-[#161e2c] rounded-md px-4 py-3 text-sm text-gray-400">
              Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="mt-5 bg-[#161e2c] rounded-md px-4 py-3 text-sm text-gray-200">
              {emptyMessages.Products}
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {products.map((p) => (
                <div key={p.id} className="bg-[#161e2c] rounded-lg overflow-hidden shadow">
                  {p.images?.[0]?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.images[0].url}
                      alt={p.title}
                      className="w-full h-40 object-cover"
                    />
                  ) : (
                    <div className="w-full h-40 bg-[#243044] flex items-center justify-center text-gray-500 text-xs">
                      No image
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="text-sm font-semibold truncate">{p.title}</h3>
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      <span className="text-white font-medium">
                        KSh {p.sale_price ?? p.regular_price ?? 0}
                      </span>
                      {p.sale_price != null &&
                        p.regular_price != null &&
                        p.regular_price > p.sale_price && (
                          <span className="text-gray-500 line-through text-xs">
                            KSh {p.regular_price}
                          </span>
                        )}
                    </div>
                    <p className="mt-1 text-xs text-gray-400">Stock: {p.stock ?? 0}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="mt-5 bg-[#161e2c] rounded-md px-4 py-3 text-sm text-gray-200">
            {emptyMessages[activeTab]}
          </div>
        )}
      </div>
    </div>
  );
};

export default Page;