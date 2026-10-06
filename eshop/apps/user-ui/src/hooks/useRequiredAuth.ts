import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useUser from "./useUser";

const useRequireAuth = () => {
    const router = useRouter();
    const { user, isloading } = useUser();

    useEffect(() => {
        if (!isloading && !user) {
            router.replace("/login");
        }
    }, [user, isloading, router]);

    return { user, isloading };
};

export default useRequireAuth;