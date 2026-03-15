// /app/hooks/useProtectedRoute.ts
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useLocalStorage from "./useLocalStorage";

export const useProtectedRoute = () => {
  const router = useRouter();
  const { value: token } = useLocalStorage<string>("token", "");
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    const storedToken =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    // Check if token exists either in hook state or localStorage
    if ((token && token.trim() !== "") || (storedToken && storedToken.trim() !== "")) {
      setIsAllowed(true);
    } else {
      setIsAllowed(false);
      router.push("/login"); // redirect to login if not authenticated
    }
  }, [token, router]);

  return isAllowed;
};