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
import { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import InfoButton from "@/components/InfoButton";

interface CountryInfo {
  name: string;
  capital: string;
  population: number;
  flag: string;
  languages: string[];
  countryCode: string;
}

interface savedCountry {
  countryName: string;
  status: "visited" | "wishlist";
}

interface TravelBoard {
  id: number;
  name: string;
  location: string | null;
  privacy: string;
  ownerId: number;
  latMin?: number | null;
  latMax?: number | null;
  lngMin?: number | null;
  lngMax?: number | null;
  countryCode?: string | null;
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
  const geoJsonLoaded = useRef(false);

  useEffect(() => {
    if (!map || !savedCountries) return;

    const applyStyle = () => {
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
    };

    if (geoJsonLoaded.current) {
      applyStyle();
      return;
    }

    map.data.loadGeoJson(
      "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson",
      undefined,

      () => {
        geoJsonLoaded.current = true;
        applyStyle();
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
    const [savedCountries, setSavedCountries] = useState<savedCountry[]>([]);
    const [travelBoards, setTravelBoards] = useState<TravelBoard[]>([]);
    const [boardPlaces, setBoardPlaces] = useState<Record<number, { photoReference?: string | null; name: string }[]>>({});
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

            const countryCode = geocodeData.results[0].address_components.find(
              (component: { types: string[]; short_name: string }) =>
                component.types.includes("country")
            )?.short_name;

            setCountryInfo({
                name: country.name.common,
                capital: country.capital?.[0] ?? "N/A",
                population: country.population,
                flag: country.flag,
                languages: Object.values(country.languages ?? {}),
                countryCode: countryCode ?? "",
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
          if (error instanceof Error && error.message === "Preferences not found for this user") {
            setSavedCountries([]);
            return;
          }

          console.error("Something went wrong while fetching saved countries:", error);
          setSavedCountries([]);
        }
      };
      getSavedCountries();
    }, [apiService]);

    useEffect(() => {
      const fetchTravelBoards = async () => {
        try {
          const data = await apiService.get<TravelBoard[]>("/travelboards");
          setTravelBoards(data);
        } catch {
          setTravelBoards([]);
        }
      };
    
      fetchTravelBoards();
    }, [apiService, isAllowed]);

    const boardsForSelectedCountry = countryInfo
      ? travelBoards.filter(
          (board) => board.countryCode === countryInfo.countryCode
        )
      : [];

    useEffect(() => {
      boardsForSelectedCountry.forEach(async (board) => {
        if (boardPlaces[board.id]) return;
      
        try {
          const places = await apiService.get<{ id: number; name: string; photoReference?: string | null }[]>(
            `/travelboards/${board.id}/places`
          );
        
          setBoardPlaces((prev) => ({
            ...prev,
            [board.id]: places,
          }));
        } catch {
          setBoardPlaces((prev) => ({
            ...prev,
            [board.id]: [],
          }));
        }
      });
    }, [boardsForSelectedCountry]);

    if (isAllowed === null) return null;
    if (!isAllowed) return null;

    return (
      <>
        <Header />
        <InfoButton />
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
                      <p style={{ textAlign: "center", fontWeight: "bold" }}>
                        Your travel boards
                      </p>

                      {boardsForSelectedCountry.length === 0 ? (
                        <div
                          style={{
                            backgroundColor: "#1a3a8f",
                            borderRadius: "8px",
                            padding: "10px",
                            textAlign: "center",
                          }}
                        >
                          No travel boards yet
                        </div>
                      ) : (
                        <div style={{ 
                          display: "grid",
                          gridTemplateColumns: boardsForSelectedCountry.length === 1 ? "1fr" : "repeat(2, 1fr)", 
                          gap: "12px", 
                          marginTop: "10px" }}>
                          {boardsForSelectedCountry.slice(0, 4).map((board) => {
                            const previewPlace = boardPlaces[board.id]?.find((place) => place.photoReference);
                            const photoUrl = previewPlace?.photoReference
                              ? `https://places.googleapis.com/v1/${previewPlace.photoReference}/media?maxWidthPx=400&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
                              : null;
                          
                            return (
                              <div
                                key={board.id}
                                onClick={() => router.push(`/travelboards/${board.id}`)}
                                style={{
                                  backgroundImage: photoUrl
                                    ? `linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.55)), url(${photoUrl})`
                                    : undefined,
                                  backgroundSize: "cover",
                                  backgroundPosition: "center",
                                  backgroundColor: "rgba(255, 255, 255, 0.16)",
                                  borderRadius: "14px",
                                  padding: "10px 12px",
                                  height: boardsForSelectedCountry.length === 1 ? "150" : "125px",
                                  cursor: "pointer",
                                  display: "flex",
                                  justifyContent: "center",
                                  alignItems: "self-end",
                                }}
                              >
                                <div>
                                  <div style={{ fontWeight: 650, fontSize: boardsForSelectedCountry.length === 1 ? "20px" : "16px"}}>
                                    {board.name}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
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