import axiosInstance from "apps/user-ui/src/utils/axiosInstance";
import SellerProfile from "apps/user-ui/src/shared/modules/seller/seller-profile";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import React, { cache } from "react";

type PageProps = { params: Promise<{ id: string }> };

// cache() so generateMetadata and the page share one request
const fetchSellerDetails = cache(async (id: string) => {
    try {
        const response = await axiosInstance.get(`/product/api/get-shop/${id}`);
        return response.data;
    } catch (error: any) {
        if (error?.response?.status === 404) return null;
        console.error("get-shop failed:", error?.response?.status ?? error?.message);
        throw new Error("Could not load shop details. Please try again later.");
    }
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const data = await fetchSellerDetails(id);

    if (!data?.shop) {
        return { title: "Shop not found | Sokojamo Marketplace" };
    }

    const description =
        data.shop.bio ||
        "Explore products and services from trusted sellers on Sokojamo.";

    return {
        title: `${data.shop.name} | Sokojamo Marketplace`,
        description,
        openGraph: {
            title: `${data.shop.name} | Sokojamo Marketplace`,
            description,
            type: "website",
            images: [
                {
                    url: data.shop.avatar?.url || "/default-shop.png",
                    width: 800,
                    height: 600,
                    alt: data.shop.name || "Shop Logo",
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: `${data.shop.name} | Sokojamo Marketplace`,
            description,
            images: [data.shop.avatar?.url || "/default-shop.png"],
        },
    };
}

const Page = async ({ params }: PageProps) => {
    const { id } = await params;
    const data = await fetchSellerDetails(id);

    if (!data?.shop) notFound();

    return (
        <div>
            <SellerProfile
                shop={data.shop}
                followersCount={data.followersCount ?? 0}
            />
        </div>
    );
};

export default Page;