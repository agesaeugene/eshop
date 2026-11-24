"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import Hero from "../shared/modules/hero";
import SectionTitle from "../shared/components/section/section-title";
import ProductCard from "../shared/components/cards/product-card";
import ShopCard from "../shared/components/cards/shop.card";
import axiosInstance from "../utils/axiosInstance";
import useRequireAuth from "../hooks/useRequiredAuth";
import { useRouter } from "next/navigation";

// Derive types from the card components so we don't need `any`
type Product = React.ComponentProps<typeof ProductCard>["product"];
type Shop = React.ComponentProps<typeof ShopCard>["shop"];

const STALE_TIME = 1000 * 60 * 2;
const GRID_CLASSES =
  "m-auto grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 2xl:grid-cols-5 gap-5";

// ---------- Data fetching ----------
const fetchProducts = async (type?: "latest"): Promise<Product[]> => {
  const res = await axiosInstance.get("/product/api/get-all-products", {
    params: { page: 1, limit: 10, ...(type && { type }) },
  });
  return res.data.products;
};

const fetchShops = async (): Promise<Shop[]> => {
  const res = await axiosInstance.get("/product/api/top-shops");
  return res.data.shops;
};

const fetchOffers = async (): Promise<Product[]> => {
  const res = await axiosInstance.get("/product/api/get-all-events", {
    params: { page: 1, limit: 10 },
  });
  return res.data.events;
};

// ---------- Reusable UI ----------
const SkeletonGrid = ({ count = 10 }: { count?: number }) => (
  <div className={GRID_CLASSES}>
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="h-[250px] bg-gray-300 animate-pulse rounded-xl"
      />
    ))}
  </div>
);

type SectionProps<T> = {
  title: string;
  items: T[] | undefined;
  isLoading: boolean;
  isError: boolean;
  emptyMessage: string;
  onRetry: () => void;
  renderItem: (item: T) => React.ReactNode;
};

function Section<T extends { id: string | number }>({
  title,
  items,
  isLoading,
  isError,
  emptyMessage,
  onRetry,
  renderItem,
}: SectionProps<T>) {
  return (
    <section className="my-8">
      <div className="mb-8">
        <SectionTitle title={title} />
      </div>

      {isLoading && <SkeletonGrid />}

      {isError && (
        <div className="space-y-3 text-center text-red-500">
          <p>Products are temporarily unavailable. Please try again.</p>
          <button type="button" onClick={onRetry} className="rounded bg-blue-600 px-4 py-2 text-white">
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && items && items.length > 0 && (
        <div className={GRID_CLASSES}>{items.map(renderItem)}</div>
      )}

      {!isLoading && !isError && items?.length === 0 && (
        <p className="text-center">{emptyMessage}</p>
      )}
    </section>
  );
}

// ---------- Page ----------
const Page = () => {
  const { user, isloading: isUserLoading } = useRequireAuth();
  const router = useRouter();
  const products = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchProducts(),
    staleTime: STALE_TIME,
    enabled: !!user,
    retry: false,
  });

  const latestProducts = useQuery({
    queryKey: ["latest-products"],
    queryFn: () => fetchProducts("latest"),
    staleTime: STALE_TIME,
    enabled: !!user,
    retry: false,
  });

  const shops = useQuery({
    queryKey: ["shops"],
    queryFn: fetchShops,
    staleTime: STALE_TIME,
    enabled: !!user,
    retry: false,
  });

  const offers = useQuery({
    queryKey: ["offers"],
    queryFn: fetchOffers,
    staleTime: STALE_TIME,
    enabled: !!user,
    retry: false,
  });

  if (isUserLoading || !user) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-gray-600">Sign in to browse products and shops.</p>
          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
          >
            Sign in
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="bg-[#f5f5f5]">
      <Hero />
      <div className="md:w-[80%] w-[90%] my-10 m-auto">
        <Section
          title="Suggested Products"
          items={products.data}
          isLoading={products.isLoading}
          isError={products.isError}
          emptyMessage="No products available yet!"
          onRetry={() => void products.refetch()}
          renderItem={(product) => (
            <ProductCard key={product.id} product={product} />
          )}
        />

        <Section
          title="Latest Products"
          items={latestProducts.data}
          isLoading={latestProducts.isLoading}
          isError={latestProducts.isError}
          emptyMessage="No products available yet!"
          onRetry={() => void latestProducts.refetch()}
          renderItem={(product) => (
            <ProductCard key={product.id} product={product} />
          )}
        />

        <Section
          title="Top Shops"
          items={shops.data}
          isLoading={shops.isLoading}
          isError={shops.isError}
          emptyMessage="No shops available yet!"
          onRetry={() => void shops.refetch()}
          renderItem={(shop) => <ShopCard key={shop.id} shop={shop} />}
        />

        <Section
          title="Top Offers"
          items={offers.data}
          isLoading={offers.isLoading}
          isError={offers.isError}
          emptyMessage="No offers available yet!"
          onRetry={() => void offers.refetch()}
          renderItem={(product) => (
            <ProductCard key={product.id} product={product} isEvent={true} />
          )}
        />
      </div>
    </div>
  );
};

export default Page;