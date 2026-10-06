"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import axiosInstance from "apps/seller-ui/src/utils/axiosInstance";
import { useParams, useRouter } from "next/navigation";

const statuses = [
    "Ordered",
    "Packed",
    "Shipped",
    "Out for Delivery",
    "Delivered",
];

const Page = () => {
    const params = useParams();
    const router = useRouter();

    const orderId = params?.id as string;

    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    // Fetch order details
    const fetchOrder = async () => {
        if (!orderId) return;

        try {
            setLoading(true);

            const res = await axiosInstance.get(
                `/order/api/get-order-details/${orderId}`
            );

            setOrder(res.data.order);
        } catch (err) {
            console.error("Failed to fetch order details:", err);
        } finally {
            setLoading(false);
        }
    };

    // Update delivery status
    const handleStatusChange = async (
        e: React.ChangeEvent<HTMLSelectElement>
    ) => {
        const newStatus = e.target.value;

        if (!order?.id) return;

        try {
            setUpdating(true);

            await axiosInstance.put(
                `/order/api/update-status/${order.id}`,
                {
                    deliveryStatus: newStatus,
                }
            );

            setOrder((prev: any) => ({
                ...prev,
                deliveryStatus: newStatus,
            }));
        } catch (err) {
            console.error("Failed to update status:", err);
        } finally {
            setUpdating(false);
        }
    };

    useEffect(() => {
        if (orderId) {
            fetchOrder();
        }
    }, [orderId]);

    // Loading state
    if (loading) {
        return (
            <div className="flex justify-center items-center h-[40vh]">
                <Loader2 className="animate-spin w-6 h-6 text-gray-600" />
            </div>
        );
    }

    // Order not found
    if (!order) {
        return (
            <p className="text-center text-sm text-red-500">
                Order not found
            </p>
        );
    }

    const currentIndex = statuses.indexOf(order.deliveryStatus);

    return (
        <div className="max-w-5xl mx-auto px-4 py-10">
            {/* Back button */}
            <div className="my-4">
                <button
                    type="button"
                    className="text-white flex items-center gap-2 font-semibold cursor-pointer hover:text-blue-400 transition"
                    onClick={() => router.push("/dashboard/orders")}
                >
                    <ArrowLeft size={20} />
                    Go Back to Dashboard
                </button>
            </div>

            {/* Order title */}
            <h1 className="text-2xl font-bold text-gray-200 mb-4">
                Order #{order.id?.slice(-6)}
            </h1>

            {/* Status Selector */}
            <div className="mb-6">
                <label
                    htmlFor="delivery-status"
                    className="text-sm font-medium text-gray-300 mr-3"
                >
                    Update Delivery Status:
                </label>

                <select
                    id="delivery-status"
                    value={order.deliveryStatus}
                    onChange={handleStatusChange}
                    disabled={updating}
                    className="border bg-transparent text-gray-200 border-gray-300 rounded-md px-3 py-2 outline-none focus:border-blue-500 disabled:opacity-50"
                >
                    {statuses.map((status, statusIndex) => (
                        <option
                            key={status}
                            value={status}
                            disabled={
                                currentIndex >= 0 &&
                                statusIndex < currentIndex
                            }
                            className="bg-gray-800 text-white"
                        >
                            {status}
                        </option>
                    ))}
                </select>

                {updating && (
                    <Loader2 className="inline-block ml-2 w-4 h-4 animate-spin text-blue-500" />
                )}
            </div>

            {/* Delivery Progress */}
            <div className="mb-8">
                {/* Status labels */}
                <div className="flex items-center justify-between text-xs font-medium mb-2">
                    {statuses.map((step, idx) => {
                        const current = step === order.deliveryStatus;
                        const passed =
                            currentIndex >= 0 && currentIndex >= idx;

                        return (
                            <div
                                key={step}
                                className={`flex-1 ${
                                    current
                                        ? "text-blue-600"
                                        : passed
                                        ? "text-green-600"
                                        : "text-gray-400"
                                }`}
                            >
                                {step}
                            </div>
                        );
                    })}
                </div>

                {/* Progress line */}
                <div className="flex items-center">
                    {statuses.map((step, idx) => {
                        const reached =
                            currentIndex >= 0 && idx <= currentIndex;

                        return (
                            <div
                                key={step}
                                className="flex-1 flex items-center"
                            >
                                <div
                                    className={`w-4 h-4 rounded-full shrink-0 ${
                                        reached
                                            ? "bg-blue-600"
                                            : "bg-gray-300"
                                    }`}
                                />

                                {idx !== statuses.length - 1 && (
                                    <div
                                        className={`flex-1 h-1 ${
                                            reached
                                                ? "bg-blue-500"
                                                : "bg-gray-200"
                                        }`}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Summary Info */}
            <div className="mb-6 space-y-2 text-sm text-gray-200">
                {/* Payment Status */}
                <p>
                    <span className="font-semibold">
                        Payment Status:{" "}
                    </span>

                    <span className="text-green-600 font-medium">
                        {order.status}
                    </span>
                </p>

                {/* Total Paid */}
                <p>
                    <span className="font-semibold">
                        Total Paid:{" "}
                    </span>

                    <span className="font-medium">
                        $
                        {Number(order.total ?? 0).toFixed(2)}
                    </span>
                </p>

                {/* Discount */}
                {Number(order.discountAmount ?? 0) > 0 && (
                    <p>
                        <span className="font-semibold">
                            Discount Applied:{" "}
                        </span>

                        <span className="text-green-400">
                            -$
                            {Number(
                                order.discountAmount
                            ).toFixed(2)}

                            {order.couponCode && (
                                <>
                                    {" "}
                                    (
                                    {order.couponCode.discountType ===
                                    "percentage"
                                        ? `${order.couponCode.discountValue}%`
                                        : `$${order.couponCode.discountValue}`}{" "}
                                    off)
                                </>
                            )}
                        </span>
                    </p>
                )}

                {/* Coupon */}
                {order.couponCode && (
                    <p>
                        <span className="font-semibold">
                            Coupon Used:{" "}
                        </span>

                        <span className="text-blue-400">
                            {order.couponCode.public_name}
                        </span>
                    </p>
                )}

                {/* Date */}
                <p>
                    <span className="font-semibold">
                        Date:{" "}
                    </span>

                    {order.createdAt
                        ? new Date(
                              order.createdAt
                          ).toLocaleDateString()
                        : "N/A"}
                </p>
            </div>

            {/* Shipping Address */}
            {order.shippingAddress && (
                <div className="mb-6 text-sm text-gray-300">
                    <h2 className="text-md font-semibold mb-2">
                        Shipping Address
                    </h2>

                    <p>{order.shippingAddress.name}</p>

                    <p>
                        {order.shippingAddress.street},{" "}
                        {order.shippingAddress.city},{" "}
                        {order.shippingAddress.zip}
                    </p>

                    <p>{order.shippingAddress.country}</p>
                </div>
            )}

            {/* Order Items */}
            <div>
                <h2 className="text-lg font-semibold text-gray-300 mb-4">
                    Order Items
                </h2>

                <div className="space-y-4">
                    {order.items?.map((item: any, index: number) => (
                        <div
                            key={
                                item.productId ??
                                item.id ??
                                index
                            }
                            className="border border-gray-200 rounded-md p-4 flex items-center gap-4"
                        >
                            {/* Product Image */}
                            <img
                                src={
                                    item.product?.images?.[0]?.url ||
                                    "/placeholder.png"
                                }
                                alt={
                                    item.product?.title ||
                                    "Product image"
                                }
                                className="w-16 h-16 object-cover rounded-md border border-gray-200"
                            />

                            {/* Product Details */}
                            <div className="flex-1">
                                <p className="font-medium text-gray-200">
                                    {item.product?.title ||
                                        "Unnamed Product"}
                                </p>

                                <p className="text-sm text-gray-300">
                                    Quantity: {item.quantity}
                                </p>

                                {/* Selected Options */}
                                {item.selectedOptions &&
                                    Object.keys(
                                        item.selectedOptions
                                    ).length > 0 && (
                                        <div className="text-xs text-gray-400 mt-1">
                                            {Object.entries(
                                                item.selectedOptions
                                            ).map(
                                                (
                                                    [key, value]: [
                                                        string,
                                                        any
                                                    ]
                                                ) =>
                                                    value ? (
                                                        <span
                                                            key={key}
                                                            className="mr-3"
                                                        >
                                                            <span className="font-medium capitalize">
                                                                {key}:
                                                            </span>{" "}
                                                            {String(
                                                                value
                                                            )}
                                                        </span>
                                                    ) : null
                                            )}
                                        </div>
                                    )}
                            </div>

                            {/* Item Price */}
                            <p className="text-sm font-semibold text-gray-200">
                                $
                                {Number(
                                    item.price ?? 0
                                ).toFixed(2)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Page;