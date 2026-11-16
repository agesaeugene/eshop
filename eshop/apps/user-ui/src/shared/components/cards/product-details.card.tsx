"use client";

import Image from 'next/image';
import Link from 'next/link';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import Ratings from '../ratings';
import { Heart, MapPin, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CartIcon from 'apps/user-ui/src/assets/svgs/cart-icon';
import { useStore } from 'apps/user-ui/src/store';
import useUser from 'apps/user-ui/src/hooks/useUser';
import useLocationTracking from 'apps/user-ui/src/hooks/useLocationTracking';
import useDeviceTracking from 'apps/user-ui/src/hooks/useDeviceTracking';
import axiosInstance from 'apps/user-ui/src/utils/axiosInstance';
import { isProtected } from 'apps/user-ui/src/utils/protected';
import { useQueryClient } from '@tanstack/react-query';

const FALLBACK_IMAGE =
    "https://ik.imagekit.io/eugenesokojamo/products/product-1787479615434_4jn1PmhYW.jpg?updatedAt=1787479618032";

const ProductDetailsCard = ({
    data,
    setOpen,
}: {
    data: any;
    setOpen: (open: boolean) => void;
}) => {
    const [activeImage, setActiveImage] = useState(0);
    const [isSelected, setIsSelected] = useState(data?.colors?.[0] || '');
    const [isSizeSelected, setIsSizeSelected] = useState(data?.sizes?.[0] || '');
    const [quantity, setQuantity] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const addToCart = useStore((state: any) => state.addToCart);
    const removeFromCart = useStore((state: any) => state.removeFromCart);
    const cart = useStore((state: any) => state.cart);
    const isInCart = cart.some((item: any) => item.id === data?.id);

    const addToWishlist = useStore((state: any) => state.addToWishlist);
    const removeFromWishlist = useStore((state: any) => state.removeFromWishlist);
    const wishlist = useStore((state: any) => state.wishlist);
    const isWishlisted = wishlist.some((item: any) => item.id === data?.id);

    const { user } = useUser();
    const location = useLocationTracking();
    const deviceInfo = useDeviceTracking();
    const router = useRouter();

    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);

    const mainImage = data?.images?.[activeImage]?.url || FALLBACK_IMAGE;
    const shopAvatar = data?.shop?.avatar || FALLBACK_IMAGE;
    const shop = data?.shop ?? data?.Shop;



    const queryClient = useQueryClient();


    const handleChat = async () => {
        if (isLoading) return;

        if (!user?.id) {
            toast.error('Please log in to chat with the seller.');
            router.push('/login');
            return;
        }

        const sellerId = data?.shop?.sellerId;
        if (!sellerId) {
            toast.error('This seller is not available for chat.');
            return;
        }

        setIsLoading(true);

        try {
            const res = await axiosInstance.post(
                "/chatting/api/create-user-conversationGroup",
                { sellerId },
                isProtected
            );

            const conversationId =
                res.data?.conversation?.id ?? res.data?.conversationId;

            if (!conversationId) {
                toast.error('Could not start the conversation.');
                return;
            }

            // make sure the inbox loads the new conversation instead of a stale cached list
            await queryClient.invalidateQueries({ queryKey: ["conversations"] });

            setOpen(false);
            router.push(`/inbox?conversationId=${conversationId}`);
        } catch (error: any) {
            console.log(error);
            toast.error(error?.response?.data?.message || 'Failed to start the chat.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddToCart = () => {
        if (isInCart) {
            removeFromCart(data.id, user, location, deviceInfo);
            return;
        }
        addToCart(
            {
                ...data,
                quantity,
                selectedOptions: { color: isSelected, size: isSizeSelected },
            },
            user,
            location,
            deviceInfo
        );
    };

    const handleWishlist = () => {
        if (isWishlisted) {
            removeFromWishlist(data.id, user, location, deviceInfo);
        } else {
            addToWishlist({ ...data, quantity: 1 }, user, location, deviceInfo);
        }
    };

    return (
        <div
            className="fixed flex items-center justify-center top-0 left-0 h-screen w-full bg-[#0000001d] z-50"
            onClick={() => setOpen(false)}
        >
            <div
                className="w-[90%] md:w-[70%] md:mt-14 2xl:mt-0 h-max overflow-scroll min-h-[70vh] p-4 md:p-6 bg-white shadow-md rounded-lg"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-full flex flex-col md:flex-row">
                    <div className="w-full md:w-1/2 h-full">
                        <Image
                            src={mainImage}
                            alt={data?.title || 'Product image'}
                            width={400}
                            height={400}
                            className="w-full rounded-lg object-contain"
                        />

                        {/* Thumbnails */}
                        <div className="flex gap-2 mt-4">
                            {data?.images?.map((img: any, index: number) => (
                                <div
                                    key={index}
                                    className={`cursor-pointer border rounded-md ${activeImage === index
                                        ? 'border-gray-500 pt-1'
                                        : 'border-transparent'
                                        }`}
                                    onClick={() => setActiveImage(index)}
                                >
                                    <Image
                                        src={img?.url || FALLBACK_IMAGE}
                                        alt={`Thumbnail ${index + 1}`}
                                        width={80}
                                        height={80}
                                        className="rounded-md"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="w-full md:w-1/2 md:pl-8 mt-6 md:mt-0">
                        {/* Seller Info */}
                        <div className="border-b relative pb-3 border-gray-200 flex items-center justify-between">
                            <div className="flex items-start gap-3">
                                <Image
                                    src={shopAvatar}
                                    alt="Shop Logo"
                                    width={60}
                                    height={60}
                                    className="rounded-full w-[60px] h-[60px] object-cover"
                                />
                                <div>
                                    <Link href={`/shop/${shop?.id}`} className="text-lg font-medium">
                                        {shop?.name}
                                    </Link>

                                    {/* Shop Ratings */}
                                    <span className="block mt-1">
                                        <Ratings rating={data?.shop?.ratings} />
                                    </span>

                                    {/* Shop Location */}
                                    <p className="text-gray-600 mt-1 flex items-center gap-1">
                                        <MapPin size={20} />
                                        {data?.shop?.address || 'Location Not Available'}
                                    </p>
                                </div>
                            </div>

                            {/* Chat with Seller Button */}
                            <button
                                type="button"
                                disabled={isLoading}
                                className="flex cursor-pointer items-center gap-2 px-4 py-2 bg-blue-700 text-white font-medium rounded-md disabled:opacity-60"
                                onClick={handleChat}
                            >
                                💬 Chat with Seller
                            </button>

                            <button
                                type="button"
                                className="absolute cursor-pointer right-[-5px] top-[-5px]"
                                onClick={() => setOpen(false)}
                            >
                                <X size={25} />
                            </button>
                        </div>

                        <h3 className="text-xl font-semibold mt-3">{data?.title}</h3>

                        <p className="mt-2 text-gray-700 whitespace-pre-wrap w-full">
                            {data?.short_description}
                        </p>

                        {/* Brand */}
                        {data?.brand && (
                            <p className="mt-2">
                                <strong>Brand:</strong> {data.brand}
                            </p>
                        )}

                        {/* Color Options */}
                        <div className="flex flex-col md:flex-row items-start gap-5 mt-4">
                            {data?.colors?.length > 0 && (
                                <div>
                                    <strong>Color:</strong>
                                    <div className="flex gap-2 mt-1">
                                        {data.colors.map((color: string, index: number) => (
                                            <button
                                                type="button"
                                                key={index}
                                                className={`w-8 h-8 cursor-pointer rounded-full border-2 transition ${isSelected === color
                                                    ? 'border-gray-400 scale-110 shadow-md'
                                                    : 'border-transparent'
                                                    }`}
                                                onClick={() => setIsSelected(color)}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Size Options */}
                        {data?.sizes?.length > 0 && (
                            <div className="mt-3">
                                <strong>Size:</strong>
                                <div className="flex gap-2 mt-1">
                                    {data.sizes.map((size: string, index: number) => (
                                        <button
                                            type="button"
                                            key={index}
                                            className={`px-4 py-1 cursor-pointer rounded-md transition ${isSizeSelected === size
                                                ? 'bg-gray-800 text-white'
                                                : 'bg-gray-300 text-black'
                                                }`}
                                            onClick={() => setIsSizeSelected(size)}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Price Section */}
                        <div className="mt-5 flex items-center gap-4">
                            <h3 className="text-2xl font-semibold text-gray-900">
                                Ksh {data?.sale_price}
                            </h3>
                            {data?.regular_price && (
                                <h3 className="text-lg text-red-600 line-through">
                                    Ksh {data.regular_price}
                                </h3>
                            )}
                        </div>

                        <div className="mt-5 flex items-center gap-5">
                            <div className="flex items-center rounded-md">
                                <button
                                    type="button"
                                    className="px-3 cursor-pointer py-1 bg-gray-300 hover:bg-gray-400 text-black font-semibold rounded-l-md"
                                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                                >
                                    -
                                </button>
                                <span className="px-4 bg-gray-100 py-1">{quantity}</span>
                                <button
                                    type="button"
                                    className="px-3 py-1 cursor-pointer bg-gray-300 hover:bg-gray-400 text-black font-semibold rounded-r-md"
                                    onClick={() => setQuantity((prev) => prev + 1)}
                                >
                                    +
                                </button>
                            </div>

                            <button
                                type="button"
                                disabled={!(data?.stock > 0)}
                                className="flex items-center gap-2 px-4 py-2 bg-[#ff5722] hover:bg-[#e64a19] text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={handleAddToCart}
                            >
                                <CartIcon size={18} />
                                {isInCart ? 'Remove from Cart' : 'Add to Cart'}
                            </button>

                            <button
                                type="button"
                                className="opacity-[.7] cursor-pointer"
                                onClick={handleWishlist}
                            >
                                <Heart
                                    size={30}
                                    fill={isWishlisted ? 'red' : 'transparent'}
                                    color={isWishlisted ? 'red' : '#4B5563'}
                                />
                            </button>
                        </div>

                        <div className="mt-3">
                            {data?.stock > 0 ? (
                                <span className="text-green-600 font-semibold">In Stock</span>
                            ) : (
                                <span className="text-red-600 font-semibold">Out of Stock</span>
                            )}
                        </div>

                        <div className="mt-3 text-gray-600 text-sm">
                            Estimated Delivery:{' '}
                            <strong>{estimatedDelivery.toDateString()}</strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetailsCard;