'use client';
import React, { useState } from 'react';
import { Package, ChevronDown, ChevronUp } from 'lucide-react';

type OrderItem = {
    id: string;
    productId: string;
    quantity: number;
    price: number;
};

type Order = {
    id: string;
    total: number;
    status: string;
    deliveryStatus: string;
    createdAt: string;
    items: OrderItem[];
    shop?: { id: string; name: string };
};

const statusStyles: Record<string, string> = {
    ordered: "bg-yellow-100 text-yellow-700",
    processing: "bg-blue-100 text-blue-700",
    shipped: "bg-purple-100 text-purple-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
};

const formatStatus = (status: string) =>
    status.charAt(0).toUpperCase() + status.slice(1);

const OrdersSection = ({
    orders,
    isLoading,
}: {
    orders: Order[] | undefined;
    isLoading: boolean;
}) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    if (isLoading) {
        return <p className="text-sm text-gray-500">Loading your orders...</p>;
    }

    if (!orders || orders.length === 0) {
        return (
            <div className="text-center py-10 text-gray-500">
                <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">You haven't placed any orders yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {orders.map((order) => {
                const isOpen = expandedId === order.id;
                const badgeClass =
                    statusStyles[order.deliveryStatus] || "bg-gray-100 text-gray-700";

                return (
                    <div
                        key={order.id}
                        className="border border-gray-200 rounded-md overflow-hidden"
                    >
                        <button
                            onClick={() => setExpandedId(isOpen ? null : order.id)}
                            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                        >
                            <div>
                                <p className="text-sm font-medium text-gray-800">
                                    Order #{order.id.slice(-8).toUpperCase()}
                                    {order.shop?.name ? ` · ${order.shop.name}` : ""}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {new Date(order.createdAt).toLocaleDateString()} ·{" "}
                                    {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-xs px-2 py-1 rounded-full ${badgeClass}`}>
                                    {formatStatus(order.deliveryStatus)}
                                </span>
                                <span className="text-sm font-semibold text-gray-800">
                                    ${order.total.toFixed(2)}
                                </span>
                                {isOpen ? (
                                    <ChevronUp className="w-4 h-4 text-gray-400" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                )}
                            </div>
                        </button>

                        {isOpen && (
                            <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-2">
                                {order.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex justify-between text-sm text-gray-600"
                                    >
                                        <span>
                                            Product #{item.productId.slice(-6)} × {item.quantity}
                                        </span>
                                        <span>${(item.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between text-sm font-semibold text-gray-800 pt-2 border-t border-gray-200">
                                    <span>Total</span>
                                    <span>${order.total.toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default OrdersSection;