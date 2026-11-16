export type OrderItem = {
    id: string;
    productId: string;
    quantity: number;
    price: number;
    product: { id: string; title: string; images: { url: string }[] } | null;
};

export type Order = {
    id: string;
    total: number;
    status: string;
    deliveryStatus: string;
    createdAt: string;
    items: OrderItem[];
    shop?: { id: string; name: string };
};

export type AppNotification = {
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    redirect_link?: string | null;
    createdAt: string;
};