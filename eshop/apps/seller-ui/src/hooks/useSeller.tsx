import {useQuery} from '@tanstack/react-query';
import axiosInstance from '../utils/axiosInstance';


//fetching user data
const fetchSeller = async () => {
    const response = await axiosInstance.get("/api/logged-in-seller"); //, { withCredentials: true }
    return response.data.seller;
};

const useSeller = () => {
    const {data: seller, isLoading: isloading, isError: isError, refetch: refetch} = useQuery({
        queryKey: ["seller"],
        queryFn: fetchSeller,
        staleTime: 5 * 60 * 1000, //5 minutes
        retry: 1,
    });
return {seller, isloading, isError, refetch};
};

export default useSeller;