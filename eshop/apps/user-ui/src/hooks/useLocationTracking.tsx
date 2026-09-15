"use client";

import { useEffect, useState } from "react";

const LOCATION_STORAGE_KEY = "user_location";
const LOCATION_EXPIRY_DAYS = 20;

const getStoredLocation = () => {
    if (typeof window === "undefined") return null;

    const storedData = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (!storedData) return null;

    try {
        const parsedData = JSON.parse(storedData);
        const expiryTime = LOCATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        const isExpired = Date.now() - parsedData.timestamp > expiryTime;
        return isExpired ? null : parsedData;
    } catch {
        return null;
    }
};

const useLocationTracking = () => {
    const [location, setLocation] = useState<{ country: string; city: string } | null>(null);

    useEffect(() => {
        const stored = getStoredLocation();
        if (stored) {
            setLocation(stored);
            return;
        }

        // HTTPS-compatible free geolocation endpoint (ip-api.com's free tier is HTTP-only,
        // which browsers block as mixed content on an HTTPS site)
        fetch("https://ipwho.is/")
            .then((res) => res.json())
            .then((data) => {
                if (data?.success === false) return;

                const newLocation = {
                    country: data?.country,
                    city: data?.city,
                    timestamp: Date.now(),
                };

                localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(newLocation));
                setLocation(newLocation);
            })
            .catch((error) => console.log("Failed to get location", error));
    }, []);

    return location;
};

export default useLocationTracking;