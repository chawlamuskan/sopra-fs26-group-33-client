// /app/hooks/useProtectedRoute.ts
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
//import useLocalStorage from "./useLocalStorage";
import { useApi } from "@/hooks/useApi";
import { User } from "@/types/user";

export const useProtectedRoute = () => {
  const router = useRouter();
  //const { value: token, clear, isHydrated } = useLocalStorage<string>("token", "");
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null); // null mean loading
  const apiService = useApi();

  useEffect(() => {
    const validate = async () => {
      const token = localStorage.getItem("token");
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

      if (!token || !storedUser?.id) {
        setIsAllowed(false);
        router.push("/"); // redirect to landing page if not authenticated
        return;
      }
      
    try {
      await apiService.get<User>(`/users/${storedUser.id}`);
      setIsAllowed(true);
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setIsAllowed(false);
      router.push("/");
    }
  };
  validate();
}, []);

  return isAllowed;
};