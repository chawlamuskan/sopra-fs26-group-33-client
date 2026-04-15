"use client";

import styles from "./travelboards.module.css";
import { useRef, useState } from "react";

type Suggestion = { label: string; placeId: string };

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
  const [loading, setLoading] = useState(false); //Nina
  const [error, setError] = useState<string | null>(null); //Nina

  const fetchSuggestions = async (query: string) => {
    if (query.length < 2) { setSuggestions([]); return; }
    setLoading(true); //Nina
    setError(null); //Nina
    try { //Nina
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=6&featuretype=city&featuretype=country&accept-language=en`
      );
      if (!res.ok) throw new Error("Failed to fetch"); //Nina
      const data = await res.json();
      // Filter to only cities/towns/villages/countries
      const filtered = data
        .filter((item: any) =>
          ["city","town","village","hamlet","country","state"].includes(item.addresstype)
        )
        .map((item: any) => ({
          label: item.display_name.split(",").slice(0, 2).join(",").trim(),
          placeId: item.place_id,
        }));
      // Deduplicate by label
      const unique = filtered.filter(
        (v: Suggestion, i: number, arr: Suggestion[]) =>
          arr.findIndex((x) => x.label === v.label) === i
      );
      setSuggestions(unique);
      setShow(true);
    } catch (err) { //Nina
      setError("Could not load suggestions. Try again.");
      setSuggestions([]);
    } finally { //Nina
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fetchSuggestions(e.target.value), 350);
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        className={styles.input}
        style={{ padding: "8px 12px", width: "100%", boxSizing: "border-box" }}
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
              onMouseDown={() => { onChange(s.label); setShow(false); }}
              style={{ padding: "8px 16px", cursor: "pointer", fontSize: "0.9rem", color: "#171717", background: "#f4ebeb"  }}
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
