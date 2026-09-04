"use client";

import React from "react";
import ProductCard from "apps/user-ui/src/shared/components/cards/product-card";
import useProducts from "apps/user-ui/src/hooks/UseProducts";

const ProductsGrid = () => {
  const { products, isLoading, isError, error } = useProducts({ page: 1, limit: 20 });

  if (isLoading) {
    return (
      <div className="w-full py-10 text-center text-gray-500">
        Loading products...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full py-10 text-center text-red-500">
        Failed to load products{error instanceof Error ? `: ${error.message}` : "."}
      </div>
    );
  }

  if (!products?.length) {
    return (
      <div className="w-full py-10 text-center text-gray-500">
        No products available yet.
      </div>
    );
  }

  return (
    <div className="w-[92%] max-w-7xl mx-auto py-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-5">All Products</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
        {products.map((product: any) => (
          <ProductCard
            key={product.id}
            product={product}
            isEvent={Boolean(product.starting_date && product.ending_date)}
          />
        ))}
      </div>
    </div>
  );
};

export default ProductsGrid;