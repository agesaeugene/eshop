import type { Metadata } from "next";
import SearchResults from "./search-results";

export const metadata: Metadata = { title: "Search products | SokoJamo" };

const SearchPage = async ({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) => {
    const { q = "" } = await searchParams;
    return <SearchResults query={q} />;
};

export default SearchPage;
