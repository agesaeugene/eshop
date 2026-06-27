import axios from "axios";


const axiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_SERVER_URI,
    withCredentials: true, // Include cookies in requests
});

let isRefreshing = false;
let refreshSubscribers: (() => void)[] = [];

//Handling logouts and preventing infinite loops
const handleLogout = () => {
    if (window.location.pathname !== "/login") {
        window.location.href = "/login";
    }
};

//handling a new access token to the queued request
const subscribeTokenRefresh = (callback: () => void) => {
    refreshSubscribers.push(callback)
}

//execute queued request after refresh
const onRefreshSuccess = () => {
    refreshSubscribers.forEach((callback) => callback());
    refreshSubscribers = [];
};

//Handling Api request
axiosInstance.interceptors.request.use(
    (config) => config,
    (error) => Promise.reject(error)
);

//Handling expired tokens and refresh logic
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        //Prevetin infinite retry loop
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // If a refresh is already in progress, queue the request
                return new Promise((resolve) => {
                    subscribeTokenRefresh(() => {
                        resolve(axiosInstance(originalRequest));
                    });
                });
            }
            
            originalRequest._retry = true;
            isRefreshing = true;
            try {
                await axios.post(`${process.env.NEXT_PUBLIC_SERVER_URI}/api/refresh-token`, {}, { withCredentials: true });
                isRefreshing = false;
                onRefreshSuccess();
                return axiosInstance(originalRequest);
            }
                catch (err) {   
                    isRefreshing = false;
                    refreshSubscribers = [];
                    handleLogout();
                    return Promise.reject(error);

                }
    }
    return Promise.reject(error);
}
);

export default axiosInstance;