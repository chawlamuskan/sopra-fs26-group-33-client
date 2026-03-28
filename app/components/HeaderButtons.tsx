"use client";
import { useRouter } from "next/navigation";
import { Button } from "antd";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";

export default function HeaderButtons() {
  const router = useRouter();
  const isAllowed = useProtectedRoute();

  if (isAllowed) {
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
          Username
        </span>
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "#ccc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#555",
            fontSize: "12px",
          }}
        >
          Pic
        </div>
      </div>
    );
  }

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