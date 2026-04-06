// added this new hook to handle logout functionality, which is used in both the profile page and the user overview page. 
// It calls the backend API to set the user's status to OFFLINE, clears the token and user info from localStorage, 
// and redirects to the login page.
// a hook is a reusable function that can be used across different components without having to repeat the same code, 
// it allows us to extract logic from components and reuse it in a clean and efficient way.
"use client";

import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";

export const useLogout = () => {
  const router = useRouter();
  const apiService = useApi();
  const { clear: clearToken } = useLocalStorage<string>("token", "");

  const logout = async () => {  // defining a func when logout button is clicked; asych bc call the backend API which is asynch ; 
  // meaning this func can do tasks that take time (fetching data from server) so it will pause the func until we have the data - cause JS runs line by line

    try {
      // Call backend to invalidate session token & set status OFFLINE
      await apiService.post(`/users/logout`, {});
        
      //  clear token in localStorage
      clearToken();
      localStorage.removeItem("user");

      // Redirect to landing page
      router.push("/");
    } catch (err) {
      console.error("Logout failed", err);
      alert("Logout failed. Try again.");
    }
  };

  return logout;
};