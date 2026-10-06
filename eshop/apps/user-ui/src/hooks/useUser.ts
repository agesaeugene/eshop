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

    const {data: user, isPending, isError: isError, refetch: refetch} = useQuery({
        queryKey: ["User"],
        queryFn: () => fetchUser(isLoggedIn),
        staleTime: 5 * 60 * 1000, //5 minutes
        retry: false,
        // @ts-ignore
        onSuccess: () => {
            setLoggedIn(true);
        },
        onError: () => {
            setLoggedIn(false)
        }
    });
return {user:user as any, isloading:isPending, isError};
};

export default useUser;