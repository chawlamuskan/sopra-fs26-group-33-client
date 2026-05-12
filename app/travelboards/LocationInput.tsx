"use client";

import styles from "./travelboards.module.css";
import { useRef, useState } from "react";
import { Input } from "antd";

type Suggestion = { label: string; placeId: string };

interface AddressComponent {
  types: string[];
  long_name: string;
  short_name: string;
}

interface NominatimResult {
  addresstype?: string;
  display_name: string;
  place_id: string | number;
  address?: Record<string, string>;
}

const LocationInput = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [show, setShow] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolveLocalCityName = async (cityLabel: string): Promise<string> => {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cityLabel)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const data = await res.json();
      const components = data.results?.[0]?.address_components ?? [];

      const locality = components
        .find((c: AddressComponent) => c.types.includes("locality"))
        ?.long_name?.toLowerCase() ?? null;

      const country = components
        .find((c: AddressComponent) => c.types.includes("country"))
        ?.long_name?.toLowerCase() ?? null;

      if (locality && country) return `${locality}|${country}`;
      return cityLabel.split(",")[0].trim().toLowerCase();
    } catch {
      return cityLabel.split(",")[0].trim().toLowerCase();
    }
  };

  const fetchSuggestions = async (query: string) => {
    if (query.length < 2) { setSuggestions([]); return; }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=6&featuretype=city&featuretype=country&accept-language=en`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data: NominatimResult[] = await res.json();
      const filtered = data
        .filter((item) =>
          ["city", "town", "village", "hamlet", "country", "state"].includes(item.addresstype ?? "")
        )
        .map((item: NominatimResult) => {
          const city =
            item.address?.city ??
            item.address?.town ??
            item.address?.village ??
            item.address?.hamlet ??
            item.address?.state;
          const country = item.address?.country;
          const label = city && country ? `${city}, ${country}` : item.display_name.split(",")[0].trim();
          return { label, placeId: String(item.place_id) };
        });
      const unique = filtered.filter(
        (v: Suggestion, i: number, arr: Suggestion[]) =>
          arr.findIndex((x) => x.label === v.label) === i
      );
      setSuggestions(unique);
      setShow(true);
    } catch {
      setSuggestions([]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fetchSuggestions(e.target.value), 350);
  };

  return (
    <div style={{ position: "relative" }}>
      <Input
        className={styles.input}
        placeholder="Choose location"
        value={value}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setShow(false), 150)}
        onFocus={() => suggestions.length && setShow(true)}
      />
      {show && suggestions.length > 0 && (
        <ul style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          background: "#f4ebeb", border: "1px solid #d6cece", borderRadius: "12px",
          listStyle: "none", margin: 0, padding: "0.4rem 0",
          zIndex: 100, maxHeight: "200px", overflowY: "auto",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
        }}>
          {suggestions.map((s) => (
            <li
              key={s.placeId}
              onMouseDown={async () => {
                const localCity = await resolveLocalCityName(s.label);
                onChange(localCity);
                setShow(false);
              }}
              style={{ padding: "8px 16px", cursor: "pointer", fontSize: "0.9rem", color: "#171717", background: "#f4ebeb" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#e0d4d4")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#f4ebeb")}
            >
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LocationInput;