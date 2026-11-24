"use client";

import { useQuery } from "@tanstack/react-query";
import ProductDetails from "apps/user-ui/src/shared/modules/product/product-details";
import axiosInstance from "apps/user-ui/src/utils/axiosInstance";
import useRequireAuth from "apps/user-ui/src/hooks/useRequiredAuth";

const ProductPageClient = ({ slug }: { slug: string }) => {
    const { user, isloading } = useRequireAuth();
    const { data: product, isPending, isError, refetch } = useQuery({
        queryKey: ["product-details", slug],
        queryFn: async () => {
            const response = await axiosInstance.get(`/product/api/get-product/${encodeURIComponent(slug)}`);
            return response.data.product;
        },
        enabled: !!user && !!slug,
        staleTime: 2 * 60 * 1000,
        retry: false,
    });

    if (isloading || !user || isPending) {
        return <div className="flex min-h-[60vh] items-center justify-center">Loading product...</div>;
    }

    if (isError || !product) {
        return (
            <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
                <p className="text-gray-700">We couldn&apos;t load this product right now.</p>
                <button
                    type="button"
                    onClick={() => void refetch()}
                    className="rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
                >
                    Try again
                </button>
            </main>
        );
    }

    return <ProductDetails productDetails={product} />;
};

export default ProductPageClient;
