export const DELIVERY_STATUSES = [
    "ordered",
    "packed",
    "shipped",
    "out_for_delivery",
    "delivered",
    "cancelled",
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const isDeliveryStatus = (value: unknown): value is DeliveryStatus =>
    typeof value === "string" && (DELIVERY_STATUSES as readonly string[]).includes(value);