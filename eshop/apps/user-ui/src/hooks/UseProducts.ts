import { useQuery } from "@tanstack/react-query";
import axiosInstance from "apps/user-ui/src/utils/axiosInstance";

const fetchProducts = async (page: number, limit: number, type?: string) => {
  const res = await axiosInstance.get("/product/api/get-all-products", {
    params: { page, limit, type },
  });
  return res.data;
};

const useProducts = ({
  page = 1,
  limit = 20,
  type,
}: { page?: number; limit?: number; type?: string } = {}) => {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["products", page, limit, type],
    queryFn: () => fetchProducts(page, limit, type),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });

  return {
    products: data?.products ?? [],
    top10Products: data?.top10Products ?? [],
    total: data?.total ?? 0,
    currentPage: data?.currentPage ?? page,
    totalPages: data?.totalPages ?? 1,
    isLoading,
    isError,
    error,
    refetch,
  };
};

export default useProducts;