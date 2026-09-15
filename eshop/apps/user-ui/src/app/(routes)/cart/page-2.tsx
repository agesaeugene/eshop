"use client"
import useDeviceTracking from "apps/user-ui/src/hooks/useDeviceTracking";
import useLocationTracking from "apps/user-ui/src/hooks/useLocationTracking";
import useUser from "apps/user-ui/src/hooks/useUser";
import { useStore } from "apps/user-ui/src/store";
import { Loader2, Minus, Plus, ShoppingBag, Trash2, ChevronRight, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from 'react'

const CartPage = () => {
    const router = useRouter();
    const { user } = useUser();
    const location = useLocationTracking();
    const deviceInfo = useDeviceTracking();
    const cart = useStore((state: any) => state.cart);
    const [discountedProductId, setDiscountedProductId] = useState("");
    const [discountPercent, setDiscountPercent] = useState(0);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [couponCode, setCouponCode] = useState("");
    const [selectedAddressId, setSelectedAddressId] = useState("123");
    const [buyNowId, setBuyNowId] = useState("");

    const removeFromCart = useStore((state: any) => state.removeFromCart);
    const [loading, setloading] = useState(false);

    const increaseQuantity = (id: string) => {
        useStore.setState((state: any) => ({
            cart: state.cart.map((item: any) =>
                item.id === id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ),
        }));
    };

    const decreaseQuantity = (id: string) => {
        useStore.setState((state: any) => ({
            cart: state.cart.map((item: any) =>
                item.id === id && item.quantity > 1
                    ? { ...item, quantity: item.quantity - 1 }
                    : item
            ),
        }));
    };

    const removeItem = (id: string) => {
        removeFromCart(id, user, location, deviceInfo);
    };

    // Skips the cart and sends a single item straight to checkout.
    // Checkout page should read "buyNowItem" from sessionStorage when
    // the "buyNow" query param is present, and fall back to the full
    // cart otherwise.
    const handleBuyNow = (item: any) => {
        setBuyNowId(item.id);
        if (typeof window !== "undefined") {
            sessionStorage.setItem("buyNowItem", JSON.stringify(item));
        }
        router.push(`/checkout?buyNow=${item.id}`);
    };

    const subtotal = cart.reduce(
        (total: number, item: any) => total + item.quantity * item.sale_price,
        0
    );

    return (
        <div className="w-full bg-white">
            <div className="md:w-[80%] w-[92%] mx-auto min-h-screen">
                {/* Breadcrumbs */}
                <div className="pt-10 pb-8 border-b border-[#E7E9EC]">
                    <h1 className="font-jost text-[36px] md:text-[42px] leading-[1.1] text-[#0B1220] mb-3">
                        Your cart
                    </h1>
                    <div className="flex items-center text-[14px] text-[#8A8F98]">
                        <Link href={"/"} className="hover:text-[#0B1220] transition-colors">
                            Home
                        </Link>
                        <ChevronRight className="w-3.5 h-3.5 mx-1.5" />
                        <span className="text-[#0B1220]">Cart</span>
                        {cart.length > 0 && (
                            <span className="ml-2 text-[#8A8F98]">
                                &middot; {cart.length} {cart.length === 1 ? "item" : "items"}
                            </span>
                        )}
                    </div>
                </div>

                {/* If cart is empty */}
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-24">
                        <div className="w-16 h-16 rounded-full bg-[#F6F7F9] flex items-center justify-center mb-5">
                            <ShoppingBag className="w-7 h-7 text-[#8A8F98]" />
                        </div>
                        <p className="text-[#0B1220] text-lg font-medium mb-1">Your cart is empty</p>
                        <p className="text-[#8A8F98] text-sm mb-6">Items you add will show up here.</p>
                        <Link
                            href={"/"}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#0B1220] text-white text-sm font-medium px-6 py-3 hover:bg-[#1C2733] transition-colors"
                        >
                            Start shopping
                        </Link>
                    </div>
                ) : (
                    <div className="lg:flex items-start gap-10 py-10">
                        {/* Product list */}
                        <div className="w-full lg:w-[68%] flex flex-col">
                            {cart?.map((item: any) => {
                                const isDiscounted = item?.id === discountedProductId;
                                const displayPrice = isDiscounted
                                    ? (item.sale_price * (100 - discountPercent)) / 100
                                    : item.sale_price;

                                return (
                                    <div
                                        key={item.id}
                                        className="flex flex-col sm:flex-row gap-5 py-6 border-b border-[#EEF0F2]"
                                    >
                                        <Image
                                            src={item?.images?.[0]?.url}
                                            alt={item.title}
                                            width={112}
                                            height={112}
                                            className="rounded-xl object-cover w-[112px] h-[112px] bg-[#F6F7F9] flex-shrink-0"
                                        />

                                        <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-4">
                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-3">
                                                    <h3 className="font-medium text-[#0B1220] text-[16px] leading-snug pr-2">
                                                        {item.title}
                                                    </h3>
                                                    <button
                                                        onClick={() => removeItem(item?.id)}
                                                        className="text-[#B9BEC6] hover:text-[#E23744] transition-colors flex-shrink-0"
                                                        aria-label="Remove item"
                                                    >
                                                        <Trash2 className="w-[18px] h-[18px]" />
                                                    </button>
                                                </div>

                                                {item?.selectedOptions && (
                                                    <div className="flex items-center gap-3 mt-1.5 text-[13px] text-[#8A8F98]">
                                                        {item?.selectedOptions?.color && (
                                                            <span className="inline-flex items-center gap-1.5">
                                                                <span
                                                                    className="w-3 h-3 rounded-full border border-[#E7E9EC]"
                                                                    style={{ backgroundColor: item?.selectedOptions?.color }}
                                                                />
                                                                Color
                                                            </span>
                                                        )}
                                                        {item?.selectedOptions?.size && (
                                                            <span>Size {item?.selectedOptions?.size}</span>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="mt-2">
                                                    {isDiscounted ? (
                                                        <div className="flex items-baseline gap-2">
                                                            <span className="text-[#0B1220] font-jost text-[17px]">
                                                                Ksh {displayPrice.toFixed(2)}
                                                            </span>
                                                            <span className="line-through text-[#B9BEC6] text-[13px]">
                                                                Ksh {item.sale_price.toFixed(2)}
                                                            </span>
                                                            <span className="text-[#0E9F6E] text-[12px] font-medium">
                                                                {discountPercent}% off
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[#0B1220] font-jost text-[17px]">
                                                            Ksh {item.sale_price.toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Quantity + actions */}
                                            <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-3 justify-between sm:justify-start">
                                                <div className="flex items-center border border-[#E7E9EC] rounded-full">
                                                    <button
                                                        onClick={() => decreaseQuantity(item.id)}
                                                        disabled={item.quantity <= 1}
                                                        className="w-8 h-8 flex items-center justify-center text-[#0B1220] disabled:text-[#D7DAE0] disabled:cursor-not-allowed"
                                                        aria-label="Decrease quantity"
                                                    >
                                                        <Minus className="w-3.5 h-3.5" />
                                                    </button>
                                                    <span className="w-7 text-center text-sm text-[#0B1220]">
                                                        {item?.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => increaseQuantity(item.id)}
                                                        className="w-8 h-8 flex items-center justify-center text-[#0B1220]"
                                                        aria-label="Increase quantity"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                                <button
                                                    onClick={() => handleBuyNow(item)}
                                                    disabled={buyNowId === item.id && loading}
                                                    className="inline-flex items-center gap-1.5 rounded-full border border-[#0B1220] text-[#0B1220] text-[13px] font-medium px-4 py-2 hover:bg-[#0B1220] hover:text-white transition-colors whitespace-nowrap"
                                                >
                                                    <Zap className="w-3.5 h-3.5" />
                                                    Buy now
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Order summary */}
                        <div className="w-full lg:w-[32%] mt-10 lg:mt-0 lg:sticky lg:top-8">
                            <div className="rounded-[20px] border border-[#E7E9EC] p-6">
                                <h2 className="font-jost text-[20px] text-[#0B1220] mb-5">
                                    Order summary
                                </h2>

                                <div className="space-y-2.5 text-[14px]">
                                    <div className="flex justify-between text-[#5B6472]">
                                        <span>Subtotal</span>
                                        <span className="text-[#0B1220]">Ksh {subtotal.toFixed(2)}</span>
                                    </div>
                                    {discountAmount > 0 && (
                                        <div className="flex justify-between text-[#5B6472]">
                                            <span>Discount ({discountPercent}%)</span>
                                            <span className="text-[#0E9F6E]">- Ksh {discountAmount.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-5 pt-5 border-t border-[#EEF0F2]">
                                    <label className="block text-[13px] font-medium text-[#0B1220] mb-2">
                                        Coupon code
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={couponCode}
                                            onChange={(e: any) => setCouponCode(e.target.value)}
                                            placeholder="Enter code"
                                            className="w-full px-3.5 py-2.5 text-sm border border-[#E7E9EC] rounded-full focus:outline-none focus:border-[#0B1220] transition-colors placeholder:text-[#B9BEC6]"
                                        />
                                        <button
                                            // onClick={() => handleCouponApply()}
                                            className="flex-shrink-0 text-sm font-medium text-white bg-[#0B1220] px-5 rounded-full hover:bg-[#1C2733] transition-colors"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-5 pt-5 border-t border-[#EEF0F2]">
                                    <label className="block text-[13px] font-medium text-[#0B1220] mb-2">
                                        Shipping address
                                    </label>
                                    <select
                                        value={selectedAddressId}
                                        onChange={(e) => setSelectedAddressId(e.target.value)}
                                        className="w-full px-3.5 py-2.5 text-sm border border-[#E7E9EC] rounded-xl focus:outline-none focus:border-[#0B1220] transition-colors bg-white"
                                    >
                                        <option value="123">Home &mdash; Nairobi, Kenya</option>
                                    </select>
                                </div>

                                <div className="mt-5 pt-5 border-t border-[#EEF0F2]">
                                    <label className="block text-[13px] font-medium text-[#0B1220] mb-2">
                                        Payment method
                                    </label>
                                    <select className="w-full px-3.5 py-2.5 text-sm border border-[#E7E9EC] rounded-xl focus:outline-none focus:border-[#0B1220] transition-colors bg-white">
                                        <option value="mpesa">M-Pesa</option>
                                        <option value="credit_card">Online payment</option>
                                        <option value="cash_on_delivery">Cash on delivery</option>
                                    </select>
                                </div>

                                <div className="mt-5 pt-5 border-t border-[#EEF0F2] flex justify-between items-center">
                                    <span className="font-jost text-[17px] text-[#0B1220]">Total</span>
                                    <span className="font-jost text-[20px] text-[#0B1220]">
                                        Ksh {(subtotal - discountAmount).toFixed(2)}
                                    </span>
                                </div>

                                <button
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 mt-5 py-3.5 bg-[#155EFF] text-white text-sm font-medium hover:bg-[#0E46C4] transition-colors rounded-full disabled:opacity-70"
                                >
                                    {loading && <Loader2 className="animate-spin w-4 h-4" />}
                                    {loading ? "Redirecting..." : "Proceed to checkout"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default CartPage