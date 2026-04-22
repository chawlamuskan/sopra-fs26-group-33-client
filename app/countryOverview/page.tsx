"use client";
/// <reference types="google.maps" />

import {useRouter, useParams} from "next/navigation";
import { Button } from "antd";
import { BookOutlined, CodeOutlined, GlobalOutlined } from "@ant-design/icons";
import styles from "@/styles/page.module.css";
import {
  APIProvider,
  Map,
  useMap,
  MapMouseEvent,
} from "@vis.gl/react-google-maps";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";

interface CountryInfo {
  name: string;
  capital: string;
  population: number;
  flag: string;
  languages: string[];
}

interface savedCountry {
  countryName: string;
  status: "visited" | "wishlist";
}

// coloring logic for colored map
const getColor = (status?: string) => {
  switch (status) {
    case "visited":
      return "#0B0696"; // green
    case "wishlist":
      return "#5AA7C3"; // yellow
    default:
      return "#a8a8a8"; // gray
  }
};

function CountryLayer({ savedCountries }: { savedCountries: savedCountry[] | null }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !savedCountries) return;

    map.data.loadGeoJson(
      "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson",
      undefined,

      (features: google.maps.Data.Feature[]) => {
        features.forEach((f) => {
          const name = f.getProperty("name");
          const code = f.getProperty("ISO3166-1-Alpha-2");
          if ((name as string)?.includes("France") || code === "FR") {
            console.log("France entry:", name, "->", code);
          }
        });
        map.data.setStyle((feature: google.maps.Data.Feature) => {

          const name = feature.getProperty("name") as string;
          const match = savedCountries.find((c: savedCountry) => c.countryName === name);
          return {
            fillColor: getColor(match?.status),
            fillOpacity: 1.0,
            strokeWeight: 0.5,
            strokeColor: "#e3c8c8",
            clickable: false,
          };
        });
      }
    );

  }, [map, savedCountries]);
  return null;
}

export default function CountryOverview() {
    const isAllowed = useProtectedRoute();
    const router = useRouter();
    const position = {lat: 47.3769, lng: 8.5417}
    const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null);
    const apiService = useApi();
    const [savedCountries, setSavedCountries] = useState<savedCountry[] | null>(null);
    const handleClick = async (event: MapMouseEvent) => {
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
        } catch (error) {
            console.error("Error fetching country info:", error);
        }
    };  


    useEffect(() => {
      if (!isAllowed) return;
     }, [isAllowed]);



    useEffect(() => {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = storedUser.id;
      if (!userId) return;

      const getSavedCountries = async () => {
        try {
          const data: savedCountry[] = await apiService.get<savedCountry[]>(`/users/${userId}/savedcountries`);
          setSavedCountries(data);
        } catch (error) {
          if (error instanceof Error) {
            alert(`Something went wrong while fetching saved places:\n${error.message}`);
          } else {
            console.error("An unknown error occurred while fetching saved places.");
          }
        }
      };
      getSavedCountries();
    }, [apiService]);
    if (isAllowed === null) return null;
    if (!isAllowed) return null;

    return (
      <>
        <Header />
        <main className={styles.main}>
          <div style={{ display: "flex", alignItems: "center", gap: "32px", paddingLeft: "28px" }}>
          <h1 className={styles.title} style={{ margin: 0 }}>Countries Overview</h1>
          
          <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: 30, height: 30, backgroundColor: "#0B0696", borderRadius: "4px" }} />
              <span style={{ color: "#0B0696", fontFamily: "DM Sans", fontWeight: 600 }}>Visited</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: 30, height: 30, backgroundColor: "#5AA7C3", borderRadius: "4px" }} />
              <span style={{ color: "#0B0696", fontFamily: "DM Sans", fontWeight: 600 }}>Want to Visit</span>
            </div>
          </div>
        </div>

          <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!} language="en">
            <div style={{ height: "100vh", width: "100vw" }}>
              <Map
                mapId="3acb2fe9409f10157220259c"
                defaultZoom={5}
                defaultCenter={position}
                gestureHandling='greedy'
                disableDefaultUI
                onClick={handleClick}
              >
                <CountryLayer savedCountries={savedCountries} />
                {countryInfo && (
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
                        Please <span style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => router.push("/login")}>Login</span> or <span style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => router.push("/register")}>Register</span> to view
                      </div>
                      <p style={{ textAlign: "center", fontWeight: "bold" }}>Community Posts</p>
                      <div style={{
                        backgroundColor: "#1a3a8f",
                        borderRadius: "8px",
                        padding: "10px",
                        textAlign: "center"
                      }}>
                        Please <span style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => router.push("/login")}>Login</span> or <span style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => router.push("/register")}>Register</span> to view
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
}