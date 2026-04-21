"use client";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "antd";
import { useEffect, useState, useRef } from "react";
import { User, Preferences } from "@/types/user";
import { useLogout } from "@/hooks/useLogout";
import { useApi } from "@/hooks/useApi";

export default function HeaderButtons() {
  const router = useRouter();
  const pathname = usePathname();
  const logout = useLogout();
  const apiService = useApi();
  const [user, setUser] = useState<User | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    if (storedUser?.id) {
      setUser(storedUser);

      const fetchProfilePicture = async () => {
        try {
          const prefs = await apiService.get<Preferences>(
            `/users/${storedUser.id}/preferences`
          );
          setProfilePicture(prefs.profilePicture ?? null);
        } catch {
          setProfilePicture(null);
        }
      };
      fetchProfilePicture();
    }
  }, [pathname]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    <div style={{ marginLeft: "auto", position: "relative" }} ref={menuRef}>
      {/* Profile picture + username — clickable */}
      <div
        style={{ display: "flex", alignItems: "center", gap: "16px", cursor: "pointer" }}
        onClick={() => setMenuOpen((prev) => !prev)}
      >
        <span style={{
          color: "white",
          fontSize: "36px",
          fontFamily: "DM Sans",
          fontWeight: 700,
        }}>
          {user?.username ?? ""}
        </span>
        {profilePicture ? (
          <img
            src={profilePicture}
            alt={user?.username ?? ""}
            style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover" }}
          />
        ) : (
          <div style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "#ccc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "32px",
          }}>
            👤
          </div>
        )}
      </div>

      {/* Dropdown menu */}
      {menuOpen && (
        <div style={{
          position: "absolute",
          top: "100px",
          right: 0,
          width: "260px",
          background: "white",
          borderRadius: "16px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          zIndex: 2000,
          overflow: "hidden",
        }}>
          {/* Menu items */}
          {[
            { label: "Countries Overview", path: `/countryOverview` },
            { label: "Saved Places", path: `/users/${user?.id}` },//need to change these paths once the pages are implemented
            { label: "Travel boards", path: `/travelboards` },
            { label: "Community", path: `/users/${user?.id}` },//need to change these paths once the pages are implemented
            { label: "Posts", path: `/users/${user?.id}` },//need to change these paths once the pages are implemented
            { label: "Settings", path: `/users/${user?.id}` },//need to change these paths once the pages are implemented
          ].map((item) => (
            <div
              key={item.label}
              onClick={() => { router.push(item.path); setMenuOpen(false); }}
              style={{
                padding: "16px 24px",
                fontSize: "18px",
                fontFamily: "DM Sans",
                fontWeight: 600,
                color: "#0B0696",
                cursor: "pointer",
                borderBottom: "1px solid #f0f0f0",
                textAlign: "center",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f4f4f4")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
            >
              {item.label}
            </div>
          ))}

          {/* Logout */}
          <div style={{ padding: "16px", display: "flex", justifyContent: "center" }}>
            <button
              onClick={logout}
              style={{
                padding: "10px 32px",
                borderRadius: "40px",
                border: "none",
                background: "#0B0696",
                color: "white",
                fontSize: "18px",
                fontFamily: "DM Sans",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}