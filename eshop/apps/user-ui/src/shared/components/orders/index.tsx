'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Package, ChevronDown, ChevronUp, ArrowUpRight } from 'lucide-react';
import { Order } from 'apps/user-ui/src/types/order';

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
    ordered: { label: "Ordered", className: "bg-yellow-100 text-yellow-700" },
    packed: { label: "Packed", className: "bg-blue-100 text-blue-700" },
    shipped: { label: "Shipped", className: "bg-purple-100 text-purple-700" },
    out_for_delivery: { label: "Out for delivery", className: "bg-indigo-100 text-indigo-700" },
    delivered: { label: "Delivered", className: "bg-green-100 text-green-700" },
    cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700" },
};

const FALLBACK_STYLE = { label: "Unknown", className: "bg-gray-100 text-gray-700" };

const currency = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" });

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

    if (!orders?.length) {
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
                const status = STATUS_STYLES[order.deliveryStatus] ?? FALLBACK_STYLE;
                const itemCount = order.items.length;

                return (
                    <div key={order.id} className="border border-gray-200 rounded-md overflow-hidden">
                        <button
                            onClick={() => setExpandedId(isOpen ? null : order.id)}
                            aria-expanded={isOpen}
                            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                        >
                            <div>
                                <p className="text-sm font-medium text-gray-800">
                                    Order #{order.id.slice(-8).toUpperCase()}
                                    {order.shop?.name && ` · ${order.shop.name}`}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {new Date(order.createdAt).toLocaleDateString()} · {itemCount} item
                                    {itemCount !== 1 && "s"}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-xs px-2 py-1 rounded-full ${status.className}`}>
                                    {status.label}
                                </span>
                                <span className="text-sm font-semibold text-gray-800">
                                    {currency.format(order.total)}
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
                                    <div key={item.id} className="flex justify-between gap-4 text-sm text-gray-600">
                                        <span className="truncate">
                                            {item.product?.title ?? `Product #${item.productId.slice(-6)}`} ×{" "}
                                            {item.quantity}
                                        </span>
                                        <span className="shrink-0">
                                            {currency.format(item.price * item.quantity)}
                                        </span>
                                    </div>
                                ))}

                                <div className="flex justify-between text-sm font-semibold text-gray-800 pt-2 border-t border-gray-200">
                                    <span>Total</span>
                                    <span>{currency.format(order.total)}</span>
                                </div>

                                <Link
                                    href={`/order/${order.id}`}
                                    className="inline-flex items-center gap-1 pt-1 text-xs text-blue-600 hover:underline"
                                >
                                    Track order <ArrowUpRight className="w-3 h-3" />
                                </Link>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default OrdersSection;