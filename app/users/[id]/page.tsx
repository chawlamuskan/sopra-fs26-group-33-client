"use client";
import { useLogout } from "@/hooks/useLogout";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Button } from "antd";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import Header from "@/components/Header";
import {
  APIProvider,
  Map,
  MapMouseEvent,
  useMap,
} from "@vis.gl/react-google-maps";
import styles from "@/styles/page.module.css";

interface CountryInfo {
  name: string;
  capital: string;
  population: number;
  flag: string;
  languages: string[];
}

// Separate component to access the map instance for zoom tracking
const ZoomTracker: React.FC<{ onZoomChange: (zoom: number) => void }> = ({ onZoomChange }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("zoom_changed", () => {
      const zoom = map.getZoom();
      if (zoom !== undefined) onZoomChange(zoom);
    });
    return () => google.maps.event.removeListener(listener);
  }, [map, onZoomChange]);

  return null;
};

const UserDashboard: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const logout = useLogout();
  const isAllowed = useProtectedRoute();
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(5);
  const position = { lat: 47.3769, lng: 8.5417 };

  // Country name labels on Google Maps disappear around zoom level 6-7
  const COUNTRY_LABEL_MAX_ZOOM = 6;

  if (isAllowed === null) return null;
  if (!isAllowed) return null;

  const fetchCountryInfo = async (countryName: string) => {
    const countryRes = await fetch(
      `https://restcountries.com/v3.1/name/${countryName}?fullText=true`
    );
    const countryData = await countryRes.json();
    if (!countryData || countryData.status === 404) {
      console.error("Country not found:", countryName);
      return;
    }
    const country = countryData[0];
    setCountryInfo({
      name: country.name.common,
      capital: country.capital?.[0] ?? "N/A",
      population: country.population,
      flag: country.flag,
      languages: Object.values(country.languages ?? {}),
    });
  };

  const handleClick = async (event: MapMouseEvent) => {
    // Don't fetch or show popup if zoomed in too far
    if (currentZoom > COUNTRY_LABEL_MAX_ZOOM) return;

    if (!event.detail.latLng) return;
    const lat = event.detail.latLng.lat;
    const lng = event.detail.latLng.lng;
    try {
      const geocodeReverse = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=country&language=en&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const geocodeData = await geocodeReverse.json();
      if (!geocodeData.results || geocodeData.results.length === 0) return;
      const countryName = geocodeData.results[0].address_components[0].long_name;
      await fetchCountryInfo(countryName);
    } catch (error) {
      console.error("Error fetching country info:", error);
    }
  };

  const showPopup = countryInfo && currentZoom <= COUNTRY_LABEL_MAX_ZOOM;

  return (
    <>
      <Header />
      <main className={styles.main}>
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
          <div style={{ height: "100vh", width: "100vw", position: "relative" }}>
            <Map
              mapId="3acb2fe9409f1015648d998e"
              defaultZoom={5}
              defaultCenter={position}
              gestureHandling="greedy"
              disableDefaultUI
              onClick={handleClick}
            >
              <ZoomTracker onZoomChange={setCurrentZoom} />

              {showPopup && (
                <div style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  backgroundColor: "#0B0696D1",
                  color: "white",
                  borderRadius: "16px",
                  padding: "24px",
                  width: "320px",
                  zIndex: 1000,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.5)"
                }}>
                  <button
                    onClick={() => setCountryInfo(null)}
                    style={{
                      position: "absolute",
                      top: "10px",
                      right: "14px",
                      background: "none",
                      border: "none",
                      color: "white",
                      fontSize: "18px",
                      cursor: "pointer"
                    }}
                  >✕</button>
                  <h2 style={{ textAlign: "center", marginBottom: "16px" }}>
                    {countryInfo.name}
                  </h2>
                  <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "16px" }}>
                    <span style={{ fontSize: "48px" }}>{countryInfo.flag}</span>
                    <div>
                      <p><strong>Capital:</strong> {countryInfo.capital}</p>
                      <p><strong>Population:</strong> {(countryInfo.population / 1_000_000).toFixed(2)} mill.</p>
                      <p><strong>Language(s):</strong> {countryInfo.languages.join(", ")}</p>
                    </div>
                  </div>
                  <div style={{ marginTop: "12px" }}>
                    <p style={{ textAlign: "center", fontWeight: "bold" }}>Recommended Places</p>
                    <div style={{
                      backgroundColor: "#1a3a8f",
                      borderRadius: "8px",
                      padding: "10px",
                      textAlign: "center",
                      marginBottom: "8px"
                    }}>
                      Content coming soon
                    </div>
                    <p style={{ textAlign: "center", fontWeight: "bold" }}>Community Posts</p>
                    <div style={{
                      backgroundColor: "#1a3a8f",
                      borderRadius: "8px",
                      padding: "10px",
                      textAlign: "center"
                    }}>
                      Content coming soon
                    </div>
                  </div>
                </div>
              )}
            </Map>
          </div>
        </APIProvider>
      </main>
    </>
  );
};

export default UserDashboard;