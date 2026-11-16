import { useQuery } from "@tanstack/react-query";
import axiosInstance from "apps/user-ui/src/utils/axiosInstance";
import { Order } from "apps/user-ui/src/types/order";

export const USER_ORDERS_KEY = ["user-orders"] as const;

const useUserOrders = (enabled = true) =>
    useQuery<Order[]>({
        queryKey: USER_ORDERS_KEY,
        queryFn: async () => {
            const res = await axiosInstance.get("/order/api/get-user-orders");
            return res.data.orders;
        },
        enabled,
        staleTime: 30_000,
    });

export default useUserOrders;