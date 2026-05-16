"use client";

import HeaderButtons from "@/components/HeaderButtons";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import MapSearchBar from "@/components/MapSearchBar";
import { PlaceInfo } from "@/types/placeinfo";

type StoredUser = {
  id: number;
};

interface HeaderProps {
  onPlaceSelect?: (lat: number, lng: number, place: PlaceInfo) => void;
  onToggleSavedPlaces?: (enabled: boolean) => void;
}

export default function Header( {onPlaceSelect, onToggleSavedPlaces }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [storedUser, setStoredUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const item = localStorage.getItem("user");
    if (item) {
      try {
        setStoredUser(JSON.parse(item));
      } catch {
        setStoredUser(null);
      }
    }
  }, []);
   
  if (pathname === "/"){
    return (
      <header style={headerStyle}>
        <h1 style={titleStyle}>Worldtura</h1>
        <HeaderButtons />
      </header>
    );  
  }

  return (
    <header style ={headerStyle}>
      <h1
        style={titleStyle}
        onClick={() => {
          if (storedUser?.id) {
            router.push(`/users/${storedUser.id}`)
          }
        }}
      >
        Worldtura
      </h1>

      {pathname.startsWith("/users/") && <MapSearchBar onPlaceSelect={onPlaceSelect ?? (() => {})} />}
      <HeaderButtons onToggleSavedPlaces={onToggleSavedPlaces} />
    </header>
  );
}

const headerStyle: React.CSSProperties = {
  background: "#0B0696",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 24px",
  position: "sticky",
  top: 0,
  zIndex: 1000,
  height: "107px",
};

const titleStyle: React.CSSProperties = {
  color: "#FFF",
  fontSize: "48px",
  fontFamily: "DM Sans",
  fontWeight: 700,
  letterSpacing: "-0.293px",
  margin: 0,
}