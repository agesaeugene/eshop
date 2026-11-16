
import { useQuery } from "@tanstack/react-query";
import axiosInstance from "apps/user-ui/src/utils/axiosInstance";
import { AppNotification } from "apps/user-ui/src/types/order";

export const USER_NOTIFICATIONS_KEY = ["user-notifications"] as const;

const useUserNotifications = (enabled = true) =>
    useQuery<AppNotification[]>({
        queryKey: USER_NOTIFICATIONS_KEY,
        queryFn: async () => {
            const res = await axiosInstance.get("/order/api/notifications");
            return res.data.notifications;
        },
        enabled,
        refetchInterval: 30_000,
        refetchOnWindowFocus: true,
    });

export default useUserNotifications;
