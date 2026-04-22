"use client"; // For components that need React hooks and browser APIs, SSR (server side rendering) has to be disabled. Read more here: https://nextjs.org/docs/pages/building-your-application/rendering/server-side-rendering
import { useRouter } from "next/navigation";
import { Button } from "antd";
import { BookOutlined, CodeOutlined, GlobalOutlined } from "@ant-design/icons";
import styles from "@/styles/page.module.css";
import {
  APIProvider,
  Map,
  MapMouseEvent,
} from "@vis.gl/react-google-maps";
import { useState } from "react";
import Header from "@/components/Header";



interface CountryInfo {
  name: string;
  capital: string;
  population: number;
  flag: string;
  languages: string[];
}

export default function Home() {
  const router = useRouter();
  const position = {lat: 47.3769, lng: 8.5417}
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null);
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

  return (
  <>
    <Header />
    <main className={styles.main}>
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!} language="en" libraries={["places"]}>
        <div style={{ height: "100vh", width: "100vw" }}>
          <Map
            mapId="3acb2fe9409f1015af87f375"
            defaultZoom={5}
            defaultCenter={position}
            gestureHandling='greedy'
            disableDefaultUI
            onClick={handleClick}
          >
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
