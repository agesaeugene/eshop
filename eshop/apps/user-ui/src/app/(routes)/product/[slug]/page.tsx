import ProductPageClient from './product-page-client';
import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Product | SokoJamo',
    description: 'View product details and shop securely on SokoJamo.',
};

const Page = async ({
    params,
}: {
    params: Promise<{ slug: string }>;
}) => {
    const { slug } = await params;
    return <ProductPageClient slug={slug} />;
};

export default Page;