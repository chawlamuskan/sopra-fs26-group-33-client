"use client";

import { Input } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useState } from "react";
import { PlaceInfo } from "@/types/placeinfo";
import { SavedPlace } from "@/types/savedplace";

interface PlaceSearchBarProps {
  onPlaceSelect: (lat: number, lng: number, place: PlaceInfo) => void;
  savedPlaces: SavedPlace[];
  onQueryChange?: (query: string) => void;
}

export default function PlaceSearchBar({ onPlaceSelect, savedPlaces, onQueryChange }: PlaceSearchBarProps) {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<SavedPlace[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearch = (value: string) => {
    setQuery(value);
    onQueryChange?.(value);
    if (!value.trim()) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    const filtered = savedPlaces.filter((p) =>
      p.name.toLowerCase().includes(value.toLowerCase()) ||
      p.address?.toLowerCase().includes(value.toLowerCase())
    );
    setPredictions(filtered);
    setShowDropdown(true);
  };

  const handleSelect = (place: SavedPlace) => {
    if (place.lat == null || place.lng == null) return;
    setQuery(place.name);
    setShowDropdown(false);
    onPlaceSelect(place.lat, place.lng, {
      name: place.name,
      address: place.address ?? "No address available",
      rating: place.rating ?? null,
      placeId: String(place.id),
      photoReference: place.photoReference ?? null,
      lat: place.lat,
      lng: place.lng,
    });
  };

  return (
    <div style={containerStyle}>
      <div style={{ position: "relative", width: "100%", maxWidth: "520px" }}>
        <Input
          placeholder="Search your saved places..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onPressEnter={() => predictions[0] && handleSelect(predictions[0])}
          prefix={<SearchOutlined style={{ color: "#7D7D7D" }} />}
          style={inputStyle}
        />

        {showDropdown && predictions.length > 0 && (
          <div style={dropdownStyle}>
            {predictions.map((p) => (
              <div
                key={p.id}
                style={dropdownItemStyle}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                onClick={() => handleSelect(p)}
              >
                <SearchOutlined style={{ color: "#aaa", marginRight: 8, fontSize: 12 }} />
                {p.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-start",
  width: "100%",
};

const inputStyle: React.CSSProperties = {
  maxWidth: "520px",
  height: "48px",
  borderRadius: "999px",
  background: "white",
  padding: "0 16px",
  fontSize: "16px",
  boxShadow: "0px 2px 8px rgba(0,0,0,0.12)",
};

const dropdownStyle: React.CSSProperties = {
  position: "absolute",
  top: "54px",
  left: 0,
  right: 0,
  background: "white",
  borderRadius: "12px",
  boxShadow: "0 4px 16px ",
  zIndex: 1000,
  overflow: "hidden",
};

const dropdownItemStyle: React.CSSProperties = {
  padding: "12px 16px",
  cursor: "pointer",
  fontSize: "14px",
  background: "white",
  transition: "background 0.15s",
};