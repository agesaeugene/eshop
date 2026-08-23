import { useQuery } from "@tanstack/react-query";
import axiosInstance from "apps/user-ui/src/utils/axiosInstance";

const fetchLayout = async () => {
  const res = await axiosInstance.get("/product/api/get-layout");
  return res.data.layout;
};

const useLayout = () => {
  const {
    data: layout,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["layout"],
    queryFn: fetchLayout,
    staleTime: 1000 * 60 * 60, // 1 hour — layout/banner data rarely changes
    retry: 2,
  });

  return { layout, isLoading, isError, error };
};

export default useLayout;