"use client"
import { useQuery } from '@tanstack/react-query'
import axiosInstance from 'apps/user-ui/src/utils/axiosInstance'
import React, { useState } from 'react'

const Page = () => {

    const [setIsProductLoading, setIsProductLoading] = useState(false);
    const [priceRange, setPriceRange] = useState([0, 1199]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
    const [selectedColors, setSelectedColors] = useState<string[]>([]);
    const [page, setPage] = useState(1);
    const [products, setProducts] = useState<any[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [tempPriceRange, setTempPriceRange] = useState([0, 1199]);

    const fetchFilteredProducts =  async() => {
        setIsProductLoading(true);
    }
    
    const {data, isLoading} = useQuery({
        queryKey: ["categories"],
        queryFn: async () => {
            const res = await axiosInstance.get("/product/api/get-categories");
            return res.data;
        },
        staleTime: 1000 * 60 * 30,
    });
    return (
        <div>Page</div>
    )
}

export default Page