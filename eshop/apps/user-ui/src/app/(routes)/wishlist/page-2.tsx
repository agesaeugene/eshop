'use client';

import useDeviceTracking from 'apps/user-ui/src/hooks/useDeviceTracking';
import useLocationTracking from 'apps/user-ui/src/hooks/useLocationTracking';
import useUser from 'apps/user-ui/src/hooks/useUser';
import { useStore } from 'apps/user-ui/src/store';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import {
    Heart,
    ShoppingBag,
    Trash2,
    Plus,
    Minus,
    ArrowLeft,
    ShoppingCart,
    Sparkles,
} from 'lucide-react';

const WishlistPage = () => {
    const { user } = useUser();
    const location = useLocationTracking();
    const deviceInfo = useDeviceTracking();

    const addToCart = useStore((state: any) => state.addToCart);
    const removeFromWishlist = useStore(
        (state: any) => state.removeFromWishlist
    );
    const wishlist = useStore((state: any) => state.wishlist);

    const decreaseQuantity = (id: string) => {
        useStore.setState((state: any) => ({
            wishlist: state.wishlist.map((item: any) =>
                item.id === id && item.quantity > 1
                    ? { ...item, quantity: item.quantity - 1 }
                    : item
            ),
        }));
    };

    const increaseQuantity = (id: string) => {
        useStore.setState((state: any) => ({
            wishlist: state.wishlist.map((item: any) =>
                item.id === id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ),
        }));
    };

    const removeItem = (id: string) => {
        removeFromWishlist(id, user, location, deviceInfo);
    };

    const totalItems = wishlist?.reduce(
        (total: number, item: any) => total + (item.quantity || 1),
        0
    );

    const totalPrice = wishlist?.reduce(
        (total: number, item: any) =>
            total + (item.sale_price || 0) * (item.quantity || 1),
        0
    );

    return (
        <div className="min-h-screen w-full bg-[#f8fafc] text-[#111827]">

            {/* =========================
                PAGE HEADER
            ========================== */}
            <section className="border-b border-[#e5e7eb] bg-white">
                <div className="mx-auto w-[95%] max-w-[1280px] px-0 py-8 md:py-12">

                    {/* Breadcrumb */}
                    <div className="mb-6 flex items-center gap-2 text-sm text-[#6b7280]">
                        <Link
                            href="/"
                            className="transition-colors hover:text-[#2295FF]"
                        >
                            Home
                        </Link>

                        <span className="text-[#cbd5e1]">/</span>

                        <span className="font-medium text-[#111827]">
                            Wishlist
                        </span>
                    </div>

                    <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">

                        <div>
                            <div className="mb-3 flex items-center gap-2">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eaf5ff]">
                                    <Heart
                                        size={18}
                                        className="fill-[#2295FF] text-[#2295FF]"
                                    />
                                </div>

                                <span className="text-sm font-semibold uppercase tracking-[0.15em] text-[#2295FF]">
                                    Saved Items
                                </span>
                            </div>

                            <h1 className="font-jost text-4xl font-semibold tracking-tight md:text-5xl">
                                My Wishlist
                            </h1>

                            <p className="mt-3 max-w-xl text-sm leading-6 text-[#6b7280] md:text-base">
                                Keep track of the products you love and save
                                them for later.
                            </p>
                        </div>

                        {wishlist.length > 0 && (
                            <div className="flex items-center gap-2 rounded-full border border-[#e5e7eb] bg-[#f8fafc] px-4 py-2.5 text-sm font-medium text-[#4b5563]">
                                <Heart
                                    size={16}
                                    className="text-[#2295FF]"
                                />

                                {totalItems}{' '}
                                {totalItems === 1 ? 'item' : 'items'} saved
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* =========================
                MAIN CONTENT
            ========================== */}
            <main className="mx-auto w-[95%] max-w-[1280px] py-8 md:py-12">

                {/* EMPTY WISHLIST */}
                {wishlist.length === 0 ? (
                    <div className="flex min-h-[520px] items-center justify-center">
                        <div className="w-full max-w-xl rounded-3xl border border-[#e5e7eb] bg-white px-6 py-14 text-center shadow-sm md:px-12">

                            <div className="mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-full bg-[#eef7ff]">
                                <Heart
                                    size={42}
                                    strokeWidth={1.5}
                                    className="text-[#2295FF]"
                                />
                            </div>

                            <h2 className="font-jost text-2xl font-semibold md:text-3xl">
                                Your wishlist is empty
                            </h2>

                            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#6b7280]">
                                You haven't saved any products yet. Explore
                                our collection and add your favorite products
                                to your wishlist.
                            </p>

                            <Link
                                href="/"
                                className="mx-auto mt-8 inline-flex items-center gap-2 rounded-xl bg-[#2295FF] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_8px_25px_rgba(34,149,255,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#087fe5]"
                            >
                                <ShoppingBag size={18} />
                                Continue Shopping
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-8 lg:grid-cols-[1fr_330px]">

                        {/* =========================
                            PRODUCTS
                        ========================== */}
                        <div className="space-y-4">

                            {/* Desktop header */}
                            <div className="hidden rounded-2xl border border-[#e5e7eb] bg-white px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#6b7280] md:grid md:grid-cols-[minmax(280px,1fr)_130px_150px_130px_100px] md:items-center md:gap-4">
                                <span>Product</span>
                                <span>Price</span>
                                <span>Quantity</span>
                                <span>Action</span>
                                <span></span>
                            </div>

                            {wishlist.map((item: any) => {
                                const salePrice = item?.sale_price || 0;
                                const originalPrice = item?.price || item?.regular_price;

                                return (
                                    <div
                                        key={item.id}
                                        className="group rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm transition-all duration-300 hover:border-[#c9e7ff] hover:shadow-md md:p-5"
                                    >

                                        {/* DESKTOP */}
                                        <div className="hidden md:grid md:grid-cols-[minmax(280px,1fr)_130px_150px_130px_100px] md:items-center md:gap-4">

                                            {/* Product */}
                                            <div className="flex min-w-0 items-center gap-4">

                                                <Link
                                                    href={`/product/${item.slug || item.id}`}
                                                    className="relative flex h-[90px] w-[90px] flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f8fafc]"
                                                >
                                                    <Image
                                                        src={
                                                            item?.images?.[0]
                                                                ?.url
                                                        }
                                                        alt={item.title}
                                                        width={90}
                                                        height={90}
                                                        className="h-full w-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
                                                    />

                                                    <div className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm">
                                                        <Heart
                                                            size={13}
                                                            className="fill-[#2295FF] text-[#2295FF]"
                                                        />
                                                    </div>
                                                </Link>

                                                <div className="min-w-0">
                                                    <Link
                                                        href={`/product/${item.slug || item.id}`}
                                                        className="line-clamp-2 text-sm font-semibold text-[#111827] transition-colors hover:text-[#2295FF]"
                                                    >
                                                        {item.title}
                                                    </Link>

                                                    {item.category && (
                                                        <p className="mt-1 text-xs text-[#9ca3af]">
                                                            {item.category}
                                                        </p>
                                                    )}

                                                    {item.stock !== undefined && (
                                                        <p
                                                            className={`mt-2 text-xs font-medium ${
                                                                item.stock > 0
                                                                    ? 'text-emerald-600'
                                                                    : 'text-red-500'
                                                            }`}
                                                        >
                                                            {item.stock > 0
                                                                ? 'In Stock'
                                                                : 'Out of Stock'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Price */}
                                            <div>
                                                <p className="text-base font-semibold text-[#111827]">
                                                    Ksh{' '}
                                                    {salePrice.toLocaleString(
                                                        'en-KE',
                                                        {
                                                            minimumFractionDigits: 2,
                                                        }
                                                    )}
                                                </p>

                                                {originalPrice &&
                                                    originalPrice >
                                                        salePrice && (
                                                        <p className="mt-1 text-xs text-[#9ca3af] line-through">
                                                            Ksh{' '}
                                                            {originalPrice.toLocaleString(
                                                                'en-KE',
                                                                {
                                                                    minimumFractionDigits: 2,
                                                                }
                                                            )}
                                                        </p>
                                                    )}
                                            </div>

                                            {/* Quantity */}
                                            <div className="flex">
                                                <div className="flex h-10 items-center rounded-xl border border-[#e5e7eb] bg-[#f8fafc]">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            decreaseQuantity(
                                                                item.id
                                                            )
                                                        }
                                                        className="flex h-10 w-9 cursor-pointer items-center justify-center text-[#6b7280] transition-colors hover:text-[#2295FF]"
                                                    >
                                                        <Minus size={14} />
                                                    </button>

                                                    <span className="min-w-[30px] text-center text-sm font-semibold">
                                                        {item.quantity}
                                                    </span>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            increaseQuantity(
                                                                item.id
                                                            )
                                                        }
                                                        className="flex h-10 w-9 cursor-pointer items-center justify-center text-[#6b7280] transition-colors hover:text-[#2295FF]"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Add cart */}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    addToCart(
                                                        item,
                                                        user,
                                                        location,
                                                        deviceInfo
                                                    )
                                                }
                                                className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#2295FF] px-4 text-xs font-semibold text-white transition-all duration-200 hover:bg-[#087fe5] hover:shadow-lg hover:shadow-[#2295FF]/20"
                                            >
                                                <ShoppingCart size={15} />
                                                Add
                                            </button>

                                            {/* Remove */}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeItem(item.id)
                                                }
                                                className="flex cursor-pointer items-center justify-center gap-1.5 text-xs font-medium text-[#9ca3af] transition-colors hover:text-red-500"
                                            >
                                                <Trash2 size={15} />
                                                Remove
                                            </button>
                                        </div>

                                        {/* MOBILE */}
                                        <div className="md:hidden">

                                            <div className="flex gap-4">

                                                <Link
                                                    href={`/product/${item.slug || item.id}`}
                                                    className="relative flex h-[100px] w-[100px] flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f8fafc]"
                                                >
                                                    <Image
                                                        src={
                                                            item?.images?.[0]
                                                                ?.url
                                                        }
                                                        alt={item.title}
                                                        width={100}
                                                        height={100}
                                                        className="h-full w-full object-contain mix-blend-multiply"
                                                    />

                                                    <div className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm">
                                                        <Heart
                                                            size={13}
                                                            className="fill-[#2295FF] text-[#2295FF]"
                                                        />
                                                    </div>
                                                </Link>

                                                <div className="min-w-0 flex-1">

                                                    <Link
                                                        href={`/product/${item.slug || item.id}`}
                                                        className="line-clamp-2 text-sm font-semibold leading-5 text-[#111827]"
                                                    >
                                                        {item.title}
                                                    </Link>

                                                    <div className="mt-2">
                                                        <span className="text-base font-bold text-[#111827]">
                                                            Ksh{' '}
                                                            {salePrice.toLocaleString(
                                                                'en-KE',
                                                                {
                                                                    minimumFractionDigits: 2,
                                                                }
                                                            )}
                                                        </span>

                                                        {originalPrice &&
                                                            originalPrice >
                                                                salePrice && (
                                                            <span className="ml-2 text-xs text-[#9ca3af] line-through">
                                                                Ksh{' '}
                                                                {originalPrice.toLocaleString(
                                                                    'en-KE',
                                                                    {
                                                                        minimumFractionDigits: 2,
                                                                    }
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {item.stock !== undefined && (
                                                        <p
                                                            className={`mt-1 text-xs font-medium ${
                                                                item.stock > 0
                                                                    ? 'text-emerald-600'
                                                                    : 'text-red-500'
                                                            }`}
                                                        >
                                                            {item.stock > 0
                                                                ? 'In Stock'
                                                                : 'Out of Stock'}
                                                        </p>
                                                    )}
                                                </div>

                                            </div>

                                            <div className="mt-5 flex items-center justify-between border-t border-[#f1f5f9] pt-4">

                                                <div className="flex h-10 items-center rounded-xl border border-[#e5e7eb] bg-[#f8fafc]">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            decreaseQuantity(
                                                                item.id
                                                            )
                                                        }
                                                        className="flex h-10 w-9 items-center justify-center text-[#6b7280]"
                                                    >
                                                        <Minus size={14} />
                                                    </button>

                                                    <span className="min-w-[30px] text-center text-sm font-semibold">
                                                        {item.quantity}
                                                    </span>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            increaseQuantity(
                                                                item.id
                                                            )
                                                        }
                                                        className="flex h-10 w-9 items-center justify-center text-[#6b7280]"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>

                                                <div className="flex items-center gap-2">

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeItem(item.id)
                                                        }
                                                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#fee2e2] text-red-400 transition-colors hover:bg-red-50 hover:text-red-500"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            addToCart(
                                                                item,
                                                                user,
                                                                location,
                                                                deviceInfo
                                                            )
                                                        }
                                                        className="flex h-10 items-center gap-2 rounded-xl bg-[#2295FF] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#087fe5]"
                                                    >
                                                        <ShoppingCart
                                                            size={15}
                                                        />
                                                        Add to Cart
                                                    </button>

                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* =========================
                            SUMMARY
                        ========================== */}
                        <aside className="h-fit lg:sticky lg:top-6">

                            <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-sm">

                                <div className="border-b border-[#eef2f7] p-6">
                                    <div className="flex items-center gap-2">
                                        <Sparkles
                                            size={17}
                                            className="text-[#2295FF]"
                                        />

                                        <h2 className="font-jost text-lg font-semibold">
                                            Wishlist Summary
                                        </h2>
                                    </div>
                                </div>

                                <div className="space-y-5 p-6">

                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-[#6b7280]">
                                            Products
                                        </span>

                                        <span className="font-medium text-[#111827]">
                                            {wishlist.length}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-[#6b7280]">
                                            Total quantity
                                        </span>

                                        <span className="font-medium text-[#111827]">
                                            {totalItems}
                                        </span>
                                    </div>

                                    <div className="border-t border-[#eef2f7] pt-5">
                                        <div className="flex items-end justify-between">
                                            <span className="text-sm text-[#6b7280]">
                                                Estimated total
                                            </span>

                                            <span className="text-xl font-bold text-[#111827]">
                                                Ksh{' '}
                                                {totalPrice.toLocaleString(
                                                    'en-KE',
                                                    {
                                                        minimumFractionDigits: 2,
                                                    }
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            wishlist.forEach((item: any) =>
                                                addToCart(
                                                    item,
                                                    user,
                                                    location,
                                                    deviceInfo
                                                )
                                            );
                                        }}
                                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#2295FF] py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#087fe5] hover:shadow-lg hover:shadow-[#2295FF]/20"
                                    >
                                        <ShoppingCart size={17} />
                                        Add All To Cart
                                    </button>

                                    <Link
                                        href="/"
                                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#e5e7eb] py-3.5 text-sm font-semibold text-[#374151] transition-colors hover:border-[#2295FF] hover:text-[#2295FF]"
                                    >
                                        <ArrowLeft size={16} />
                                        Continue Shopping
                                    </Link>

                                </div>
                            </div>

                            {/* Small reassurance card */}
                            <div className="mt-4 rounded-2xl border border-[#dbeafe] bg-[#eff7ff] p-5">
                                <div className="flex gap-3">
                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white">
                                        <Heart
                                            size={16}
                                            className="fill-[#2295FF] text-[#2295FF]"
                                        />
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-semibold text-[#111827]">
                                            Your favorites are safe
                                        </h3>

                                        <p className="mt-1 text-xs leading-5 text-[#64748b]">
                                            Products you love stay here until
                                            you're ready to buy.
                                        </p>
                                    </div>
                                </div>
                            </div>

                        </aside>
                    </div>
                )}
            </main>
        </div>
    );
};

export default WishlistPage;