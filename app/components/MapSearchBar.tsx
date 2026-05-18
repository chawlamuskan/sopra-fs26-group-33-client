"use client";

import { Input } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useState } from "react";
import { PlaceInfo } from "@/types/placeinfo";
import { isAllowedPoiType } from "@/constants/placeCategories";

interface PlacePrediction {
  place_id: string;
  description: string;
}

interface MapSearchBarProps {
  onPlaceSelect: (lat: number, lng: number, place: PlaceInfo) => void;
}


export default function MapSearchBar({ onPlaceSelect }: MapSearchBarProps) {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearch = async (value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    try {
      const response = await fetch(
        "https://places.googleapis.com/v1/places:autocomplete",
        {
          method: "POST", 
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
          },
          body: JSON.stringify({ input: value }),
        }
      );
      const data = await response.json();

      type Suggestion = {
        placePrediction: {
          placeId: string;
          text: {
            text: string;
          };
        };
      };

      if (data.suggestions) {
        setPredictions(
          data.suggestions.map((s: Suggestion) => ({
            place_id: s.placePrediction.placeId,
            description: s.placePrediction.text.text,
          }))
        );
        setShowDropdown(true);
      }
    } catch (err) {
      console.error("Autocomplete error:", err);
    }
  };

  const handleSelect = async (placeId: string) => {
  setShowDropdown(false);
  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
          "X-Goog-FieldMask": "location,displayName,formattedAddress,rating,photos.name,types",
        },
      }
    );
    const data = await response.json();
    const types: string[] = data.types || [];
    if (data.location) {
      onPlaceSelect(data.location.latitude, data.location.longitude, {
        name: data.displayName?.text ?? "Unknown Place",
        address: data.formattedAddress ?? "No address available",
        rating: data.rating ?? null,
        placeId: placeId,
        photoReference: data.photos?.[0]?.name ?? null,
        lat: data.location?.latitude ?? null,
        lng: data.location?.longitude ?? null,
        types: types.filter(isAllowedPoiType),
      });
    }
  } catch (err) {
    console.error("Place details error:", err);
  }
};

  return (
    <div style={containerStyle}>
      <div style={{ position: "relative", width: "100%", maxWidth: "520px" }}> 
        <Input
          placeholder="Search places..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onPressEnter={() => predictions[0] && handleSelect(predictions[0].place_id)}
          prefix={<SearchOutlined style={{ color: "#7D7D7D" }} />}
          style={inputStyle}
        />

        {showDropdown && predictions.length > 0 && (
          <div style={dropdownStyle}>
            {predictions.map((p) => (
              <div
                key={p.place_id}
                style={dropdownItemStyle}
                onMouseEnter={e => (e.currentTarget.style.background = "#f5f5f5")}
                onMouseLeave={e => (e.currentTarget.style.background = "white")}
                onClick={() => {
                  setQuery(p.description);
                  handleSelect(p.place_id);
                }}
              >
                <SearchOutlined style={{ color: "#aaa", marginRight: 8, fontSize: 12 }} />
                {p.description}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  justifyContent: "center",
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
  boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
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