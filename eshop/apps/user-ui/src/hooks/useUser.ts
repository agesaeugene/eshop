import { useEffect } from 'react';
import {useQuery} from '@tanstack/react-query';
import axiosInstance from '../utils/axiosInstance';
import { useAuthStore } from '../store/authStore';
import { isProtected } from '../utils/protected';


//fetching user data
const fetchUser = async (isLoggedIn: Boolean) => {
    const config = isLoggedIn ? isProtected : {};
    const response = await axiosInstance.get("/api/logged-in-user"); //, { withCredentials: true }
    return response.data.user;
};

const useUser = () => {
    const { setLoggedIn, isLoggedIn } = useAuthStore();

    const {data: user, isPending, isError: isError, isSuccess, refetch: refetch} = useQuery({
        queryKey: ["User"],
        queryFn: () => fetchUser(isLoggedIn),
        staleTime: 5 * 60 * 1000, //5 minutes
        retry: false,
        retryOnMount: false, // don't re-request on every mount after an error
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });

    // replaces the removed onSuccess / onError callbacks
    useEffect(() => {
        if (isSuccess) setLoggedIn(true);
        if (isError) setLoggedIn(false);
    }, [isSuccess, isError, setLoggedIn]);

    useEffect(() => {
        if (!user?.id) return;
        const heartbeat = () => {
            void axiosInstance.post("/api/session-heartbeat").catch((error) => {
                console.error("Could not update user activity status:", error);
            });
        };
        heartbeat();
        const interval = window.setInterval(heartbeat, 30_000);
        return () => window.clearInterval(interval);
    }, [user?.id]);

return {user:user as any, isloading:isPending, isError};
};

export default useUser;