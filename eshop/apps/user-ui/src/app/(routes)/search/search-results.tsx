"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import axiosInstance from "apps/user-ui/src/utils/axiosInstance";
import useRequireAuth from "apps/user-ui/src/hooks/useRequiredAuth";

type SearchProduct = {
    id: string;
    title: string;
    slug: string;
};

const SearchResults = ({ query }: { query: string }) => {
    const normalizedQuery = query.trim();
    const { user, isloading } = useRequireAuth();
    const { data: products = [], isPending, isError, refetch } = useQuery<SearchProduct[]>({
        queryKey: ["product-search", normalizedQuery],
        queryFn: async () => {
            const response = await axiosInstance.get("/product/api/search-products", {
                params: { q: normalizedQuery },
            });
            return response.data.products;
        },
        enabled: !!user && normalizedQuery.length > 0,
        staleTime: 60_000,
        retry: false,
    });

    if (isloading || !user) {
        return <div className="flex min-h-[50vh] items-center justify-center">Checking your account...</div>;
    }

    return (
        <main className="mx-auto min-h-[60vh] w-[90%] max-w-6xl py-10">
            <h1 className="mb-2 text-2xl font-semibold">Product search</h1>
            <p className="mb-6 text-gray-600">
                {normalizedQuery ? `Results for “${normalizedQuery}”` : "Enter a product name in the search bar."}
            </p>

            {isPending && <p className="text-gray-500">Searching products...</p>}
            {isError && (
                <div role="alert" className="space-y-3 text-red-600">
                    <p>We couldn&apos;t search products right now.</p>
                    <button type="button" onClick={() => void refetch()} className="rounded bg-blue-600 px-4 py-2 text-white">
                        Try again
                    </button>
                </div>
            )}
            {!isPending && !isError && normalizedQuery && products.length === 0 && (
                <p className="text-gray-600">No matching products found.</p>
            )}
            {products.length > 0 && (
                <ul className="divide-y rounded-xl border bg-white">
                    {products.map((product) => (
                        <li key={product.id}>
                            <Link href={`/product/${encodeURIComponent(product.slug)}`} className="block p-4 font-medium hover:bg-blue-50 hover:text-blue-700">
                                {product.title}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
};

export default SearchResults;
