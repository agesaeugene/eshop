import {useQuery} from '@tanstack/react-query';
import axiosInstance from '../utils/axiosInstance';
import { use } from 'react';
import { query } from 'express';

//fetching user data
const fetchUser = async () => {
    const response = await axiosInstance.get("/api/logged-in-user"); //, { withCredentials: true }
    return response.data.user;
};

const useUser = () => {
    const {data: user, isLoading: isloading, isError: isError, refetch: refetch} = useQuery({
        queryKey: ["User"],
        queryFn: fetchUser,
        staleTime: 5 * 60 * 1000, //5 minutes
        retry: 1,
    });
return {user, isloading, isError, refetch};
};

export default useUser;