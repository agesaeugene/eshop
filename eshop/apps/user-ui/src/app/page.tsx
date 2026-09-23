"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import Hero from "../shared/modules/hero";
import SectionTitle from "../shared/components/section/section-title";
import ProductCard from "../shared/components/cards/product-card";
import ShopCard from "../shared/components/cards/shop.card";
import axiosInstance from "../utils/axiosInstance";

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
  renderItem: (item: T) => React.ReactNode;
};

function Section<T extends { id: string | number }>({
  title,
  items,
  isLoading,
  isError,
  emptyMessage,
  renderItem,
}: SectionProps<T>) {
  return (
    <section className="my-8">
      <div className="mb-8">
        <SectionTitle title={title} />
      </div>

      {isLoading && <SkeletonGrid />}

      {isError && (
        <p className="text-center text-red-500">
          Something went wrong. Please try again later.
        </p>
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
  const products = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchProducts(),
    staleTime: STALE_TIME,
  });

  const latestProducts = useQuery({
    queryKey: ["latest-products"],
    queryFn: () => fetchProducts("latest"),
    staleTime: STALE_TIME,
  });

  const shops = useQuery({
    queryKey: ["shops"],
    queryFn: fetchShops,
    staleTime: STALE_TIME,
  });

  const offers = useQuery({
    queryKey: ["offers"],
    queryFn: fetchOffers,
    staleTime: STALE_TIME,
  });

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
          renderItem={(shop) => <ShopCard key={shop.id} shop={shop} />}
        />

        <Section
          title="Top Offers"
          items={offers.data}
          isLoading={offers.isLoading}
          isError={offers.isError}
          emptyMessage="No offers available yet!"
          renderItem={(product) => (
            <ProductCard key={product.id} product={product} isEvent={true} />
          )}
        />
      </div>
    </div>
  );
};

export default Page;