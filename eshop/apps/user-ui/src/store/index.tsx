import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import toast from "react-hot-toast";
import { sendKafkaEvent } from "../actions/track-user";

type Product = {
    id: string;
    title: string;
    price: number;
    image: string;
    quantity?: number;
    shopId: string;
};

type Store = {
    cart: Product[];
    wishlist: Product[];
    addToCart: (product: Product, user: any, location: any, deviceInfo: any) => void;
    removeFromCart: (id: string, user: any, location: any, deviceInfo: any) => void;
    addToWishlist: (product: Product, user: any, location: any, deviceInfo: any) => void;
    removeFromWishlist: (id: string, user: any, location: any, deviceInfo: any) => void;
};

// ---- per-user persistence -------------------------------------------------
// null = nobody logged in: nothing is read from or written to localStorage.
let activeUserId: string | null = null;

const userScopedStorage: StateStorage = {
    getItem: (name) =>
        activeUserId && typeof window !== "undefined"
            ? window.localStorage.getItem(`${name}:${activeUserId}`)
            : null,
    setItem: (name, value) => {
        if (activeUserId && typeof window !== "undefined") {
            window.localStorage.setItem(`${name}:${activeUserId}`, value);
        }
    },
    removeItem: (name) => {
        if (activeUserId && typeof window !== "undefined") {
            window.localStorage.removeItem(`${name}:${activeUserId}`);
        }
    },
};

/**
 * Call whenever the logged-in user changes (login, logout, switching account).
 * Clears the in-memory cart/wishlist, then loads that user's saved ones.
 */
export const setActiveStoreUser = (userId: string | null) => {
    if (activeUserId === userId) return;

    // 1. detach storage first so clearing doesn't overwrite anyone's saved data
    activeUserId = null;
    useStore.setState({ cart: [], wishlist: [] });

    // 2. attach the new user's storage and load their saved cart/wishlist
    activeUserId = userId;
    if (userId) useStore.persist.rehydrate();
};

const requireLogin = (user: any, what: string) => {
    if (user?.id) return true;
    toast.error(`Please log in to add items to your ${what}.`);
    return false;
};

export const useStore = create<Store>()(
    persist(
        (set, get) => ({
            cart: [],
            wishlist: [],

            // add to cart
            addToCart: (product, user, location, deviceInfo) => {
                if (!requireLogin(user, "cart")) return;

                set((state) => {
                    const existing = state.cart.find((item) => item.id === product.id);
                    if (existing) {
                        return {
                            cart: state.cart.map((item) =>
                                item.id === product.id
                                    ? { ...item, quantity: (item.quantity ?? 1) + 1 }
                                    : item
                            ),
                        };
                    }
                    return { cart: [...state.cart, { ...product, quantity: product?.quantity }] };
                });

                if (user?.id && location && deviceInfo) {
                    sendKafkaEvent({
                        userId: user?.id,
                        productId: product?.id,
                        shopId: product?.shopId,
                        action: "add_to_cart",
                        country: location?.country || "unknown",
                        city: location?.city || "Unknown",
                        device: deviceInfo || "Unknown Device",
                    });
                }
            },

            // remove from cart
            removeFromCart: (id, user, location, deviceInfo) => {
                const removedProduct = get().cart.find((item) => item.id === id);
                set((state) => ({
                    cart: state.cart.filter((item) => item.id !== id),
                }));

                if (user?.id && location && deviceInfo && removedProduct) {
                    sendKafkaEvent({
                        userId: user?.id,
                        productId: removedProduct?.id,
                        shopId: removedProduct?.shopId,
                        action: "remove_from_cart",
                        country: location?.country || "unknown",
                        city: location?.city || "Unknown",
                        device: deviceInfo || "Unknown Device",
                    });
                }
            },

            // add to wishlist
            addToWishlist: (product, user, location, deviceInfo) => {
                if (!requireLogin(user, "wishlist")) return;

                set((state) => {
                    if (state.wishlist.find((item) => item.id === product.id)) {
                        return state;
                    }
                    return { wishlist: [...state.wishlist, product] };
                });

                if (user?.id && location && deviceInfo) {
                    sendKafkaEvent({
                        userId: user?.id,
                        productId: product?.id,
                        shopId: product?.shopId,
                        action: "add_to_wishlist",
                        country: location?.country || "unknown",
                        city: location?.city || "Unknown",
                        device: deviceInfo || "Unknown Device",
                    });
                }
            },

            // remove from wishlist
            removeFromWishlist: (id, user, location, deviceInfo) => {
                const removedProduct = get().wishlist.find((item) => item.id === id);
                set((state) => ({
                    wishlist: state.wishlist.filter((item) => item.id !== id),
                }));

                if (user?.id && location && deviceInfo && removedProduct) {
                    sendKafkaEvent({
                        userId: user?.id,
                        productId: removedProduct?.id,
                        shopId: removedProduct?.shopId,
                        action: "remove_from_wishlist",
                        country: location?.country || "unknown",
                        city: location?.city || "Unknown",
                        device: deviceInfo || "Unknown Device",
                    });
                }
            },
        }),
        {
            name: "store-storage",
            storage: createJSONStorage(() => userScopedStorage),
        }
    )
);