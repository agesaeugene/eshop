import { useQuery } from "@tanstack/react-query";
import axiosInstance from "../app/utils/axiosinstance";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";

// fetch admin data from API
const fetchAdmin = async () => {
  const response = await axiosInstance.get("/api/logged-in-admin");
  const data = response.data;
  // React Query errors if a query returns undefined, so always return null at minimum
  return data?.user ?? data?.admin ?? null;
};

const useAdmin = () => {
  const {
    data: admin,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin"],
    queryFn: fetchAdmin,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const router = useRouter();

  useEffect(() => {
    if (!admin?.id) return;
    const heartbeat = () => {
      void axiosInstance.post("/api/admin/session-heartbeat").catch((heartbeatError) => {
        console.error("Could not update admin activity status:", heartbeatError);
      });
    };
    heartbeat();
    const interval = window.setInterval(heartbeat, 30_000);
    return () => window.clearInterval(interval);
  }, [admin?.id]);

  useEffect(() => {
    if (isLoading) return;

    const status = (error as AxiosError | null)?.response?.status;
    const unauthorized = status === 401 || status === 403;

    // Redirect only when the server says "not logged in",
    // or it answered successfully but returned no admin
    if (unauthorized || (!isError && !admin)) {
      router.push("/");
    }
  }, [admin, isLoading, isError, error, router]);

  return { admin, isLoading, isError, error, refetch };
};

export default useAdmin;