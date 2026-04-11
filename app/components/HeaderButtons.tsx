"use client";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "antd";
import { useEffect, useState } from "react";
import { User } from "@/types/user";

export default function HeaderButtons() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    if (storedUser?.id) {
      setUser(storedUser);
      if (pathname === "/") {
        router.push(`/users/${storedUser.id}`);
      }
    }
  }, [pathname]);

  if (pathname === "/") {
    return (
      <div style={{ display: "flex", gap: "16px", marginLeft: "auto" }}>
        <Button
          onClick={() => router.push("/login")}
          style={{
            width: "106px",
            height: "50px",
            borderRadius: "40px",
            background: "white",
            border: "none",
            color: "black",
            fontSize: "32px",
            fontFamily: "DM Sans",
            fontWeight: 700,
          }}
        >
          Login
        </Button>
        <Button
          onClick={() => router.push("/register")}
          style={{
            height: "50px",
            borderRadius: "40px",
            background: "white",
            border: "none",
            color: "black",
            fontSize: "32px",
            fontFamily: "DM Sans",
            fontWeight: 700,
            padding: "0 16px",
          }}
        >
          Register
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "16px", marginLeft: "auto" }}>
      <span
        style={{
          color: "white",
          fontSize: "36px",
          fontFamily: "DM Sans",
          fontWeight: 700,
        }}
      >
        {user?.username ?? ""}
      </span>
      {user?.profilePicture ? (
        <img
          src={user.profilePicture}
          alt={user.username ?? ""}
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />
      ) : (
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "#ccc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "32px",
          }}
        >
          🌍
        </div>
      )}
    </div>
  );
}