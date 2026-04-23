"use client";
import { useLogout } from "@/hooks/useLogout";
import React, { useCallback, useEffect, useState } from "react";
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
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import styles from "@/styles/page.module.css";

interface CountryInfo {
  name: string;
  capital: string;
  population: number;
  flag: string;
  languages: string[];
}

interface PlaceInfo {
  name: string;
  address: string;
  rating: number | null;
  placeId: string;
}

// Separate component to access the map instance for zoom tracking
const ZoomTracker: React.FC<{ onZoomChange: (zoom: number) => void }> = ({
  onZoomChange,
}) => {
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

// Component to intercept POI clicks and suppress the default Google popup
const PlaceClickInterceptor: React.FC<{
    onPlaceClick: (place: PlaceInfo) => void;
  }> = ({ onPlaceClick }) => {
    const map = useMap();

    useEffect(() => {
      if (!map) return;

      const ALLOWED_POI_TYPES = new Set([
        "restaurant",
        "cafe",
        "bar",
        "tourist_attraction",
        "museum",
        "park",
        "shopping_mall",
        "store",
        "lodging",
        "establishment",
      ]);

      const listener = map.addListener(
        "click",
        async (event: google.maps.MapMouseEvent & { placeId?: string }) => {
          if (!event.placeId) return;

          // Prevent default Google popup
          event.stop();

          try {
            const placeId = event.placeId;

            const response = await fetch(
              `https://places.googleapis.com/v1/places/${placeId}`,
              {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  "X-Goog-Api-Key":
                    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
                  "X-Goog-FieldMask":
                    "displayName,formattedAddress,rating,types",
                },
              }
            );

            if (!response.ok) {
              console.error("Places API error:", await response.text());
              return;
            }

            const data = await response.json();

            const types: string[] = data.types ?? [];

            // 🚫 Filter out cities, countries, admin regions, etc.
            const isPOI = types.some((t) =>
              ALLOWED_POI_TYPES.has(t)
            );

            if (!isPOI) {
              return; // ignore non-POI places
            }

            onPlaceClick({
              name: data.displayName?.text ?? "Unknown Place",
              address:
                data.formattedAddress ?? "No address available",
              rating: data.rating ?? null,
              placeId,
            });
          } catch (err) {
            console.error("Failed to fetch place details:", err);
          }
        }
      );

      return () => {
        google.maps.event.removeListener(listener);
      };
    }, [map, onPlaceClick]);

    return null;
};

// Star rating display component
const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
      {Array(fullStars)
        .fill(null)
        .map((_, i) => (
          <span key={`full-${i}`} style={{ color: "#FFD700", fontSize: "16px" }}>
            ★
          </span>
        ))}
      {hasHalf && (
        <span style={{ color: "#FFD700", fontSize: "16px" }}>⭐</span>
      )}
      {Array(emptyStars)
        .fill(null)
        .map((_, i) => (
          <span key={`empty-${i}`} style={{ color: "rgba(255,255,255,0.4)", fontSize: "16px" }}>
            ★
          </span>
        ))}
      <span
        style={{
          marginLeft: "6px",
          fontSize: "13px",
          color: "rgba(255,255,255,0.85)",
          fontWeight: 600,
        }}
      >
        {rating.toFixed(1)}
      </span>
    </span>
  );
};

const UserDashboard: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const logout = useLogout();
  const isAllowed = useProtectedRoute();
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null);
  const [placeInfo, setPlaceInfo] = useState<PlaceInfo | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(5);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);
  const position = { lat: 47.3769, lng: 8.5417 };

  // Country name labels on Google Maps disappear around zoom level 6-7
  const COUNTRY_LABEL_MAX_ZOOM = 6;



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
      const countryName =
        geocodeData.results[0].address_components[0].long_name;
      await fetchCountryInfo(countryName);
    } catch (error) {
      console.error("Error fetching country info:", error);
    }
  };

  const handlePlaceClick = useCallback((place: PlaceInfo) => {
    setPlaceInfo(place);
    setSavedFeedback(null);
  }, []);

  const handleAddToSavedPlaces = () => {
    // Hook up to your API / state management as needed
    setSavedFeedback("Saved to places!");
    setTimeout(() => setSavedFeedback(null), 2000);
  };

  const handleAddToTravelBoards = () => {
    // Hook up to your API / state management as needed
    setSavedFeedback("Added to travel boards!");
    setTimeout(() => setSavedFeedback(null), 2000);
  };

  const showCountryPopup = countryInfo && currentZoom <= COUNTRY_LABEL_MAX_ZOOM;

  if (isAllowed === null) return null;
  if (!isAllowed) return null;

  return (
    <>
      <Header />
      <main className={styles.main}>
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
          <div
            style={{ height: "100vh", width: "100vw", position: "relative" }}
          >
            <Map
              mapId="3acb2fe9409f1015648d998e"
              defaultZoom={5}
              defaultCenter={position}
              gestureHandling="greedy"
              disableDefaultUI
              onClick={handleClick}
            >
              <ZoomTracker onZoomChange={setCurrentZoom} />
              <PlaceClickInterceptor onPlaceClick={handlePlaceClick} />

              {/* Country Info Popup */}
              {showCountryPopup && (
                <div
                  style={{
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
                    boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                  }}
                >
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
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                  <h2 style={{ textAlign: "center", marginBottom: "16px" }}>
                    {countryInfo.name}
                  </h2>
                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      alignItems: "center",
                      marginBottom: "16px",
                    }}
                  >
                    <span style={{ fontSize: "48px" }}>{countryInfo.flag}</span>
                    <div>
                      <p>
                        <strong>Capital:</strong> {countryInfo.capital}
                      </p>
                      <p>
                        <strong>Population:</strong>{" "}
                        {(countryInfo.population / 1_000_000).toFixed(2)} mill.
                      </p>
                      <p>
                        <strong>Language(s):</strong>{" "}
                        {countryInfo.languages.join(", ")}
                      </p>
                    </div>
                  </div>
                  <div style={{ marginTop: "12px" }}>
                    <p style={{ textAlign: "center", fontWeight: "bold" }}>
                      Recommended Places
                    </p>
                    <div
                      style={{
                        backgroundColor: "#1a3a8f",
                        borderRadius: "8px",
                        padding: "10px",
                        textAlign: "center",
                        marginBottom: "8px",
                      }}
                    >
                      Content coming soon
                    </div>
                    <p style={{ textAlign: "center", fontWeight: "bold" }}>
                      Community Posts
                    </p>
                    <div
                      style={{
                        backgroundColor: "#1a3a8f",
                        borderRadius: "8px",
                        padding: "10px",
                        textAlign: "center",
                      }}
                    >
                      Content coming soon
                    </div>
                  </div>
                </div>
              )}
            </Map>

            {/* Place Info Popup — rendered outside <Map> so it sits above the map layer cleanly */}
            {placeInfo && (
              <div
                style={{
                  position: "absolute",
                  bottom: "40px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  backgroundColor: "rgba(90, 167, 195, 0.83)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  color: "white",
                  borderRadius: "18px",
                  padding: "20px 22px 18px",
                  width: "340px",
                  zIndex: 1100,
                  boxShadow:
                    "0 8px 32px rgba(0,0,0,0.35), 0 1.5px 0 rgba(255,255,255,0.12) inset",
                  fontFamily: "'Segoe UI', system-ui, sans-serif",
                }}
              >
                {/* Close button */}
                <button
                  onClick={() => setPlaceInfo(null)}
                  style={{
                    position: "absolute",
                    top: "12px",
                    right: "14px",
                    background: "rgba(255,255,255,0.15)",
                    border: "none",
                    color: "white",
                    fontSize: "14px",
                    cursor: "pointer",
                    borderRadius: "50%",
                    width: "26px",
                    height: "26px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.background =
                      "rgba(255,255,255,0.28)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.background =
                      "rgba(255,255,255,0.15)")
                  }
                >
                  ✕
                </button>

                {/* Place name */}
                <h3
                  style={{
                    margin: "0 30px 6px 0",
                    fontSize: "17px",
                    fontWeight: 700,
                    lineHeight: 1.3,
                    letterSpacing: "-0.2px",
                  }}
                >
                  {placeInfo.name}
                </h3>

                {/* Address */}
                <p
                  style={{
                    margin: "0 0 10px",
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.82)",
                    lineHeight: 1.45,
                  }}
                >
                  📍 {placeInfo.address}
                </p>

                {/* Rating */}
                <div style={{ marginBottom: "16px" }}>
                  {placeInfo.rating !== null ? (
                    <StarRating rating={placeInfo.rating} />
                  ) : (
                    <span
                      style={{
                        fontSize: "13px",
                        color: "rgba(255,255,255,0.55)",
                      }}
                    >
                      No rating available
                    </span>
                  )}
                </div>

                {/* Divider */}
                <div
                  style={{
                    borderTop: "1px solid rgba(255,255,255,0.2)",
                    marginBottom: "14px",
                  }}
                />

                {/* Action buttons */}
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={handleAddToSavedPlaces}
                    style={{
                      flex: 1,
                      padding: "9px 10px",
                      background: "rgba(255,255,255,0.18)",
                      border: "1px solid rgba(255,255,255,0.35)",
                      borderRadius: "10px",
                      color: "white",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "background 0.2s, transform 0.1s",
                      letterSpacing: "0.1px",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(255,255,255,0.28)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(255,255,255,0.18)")
                    }
                    onMouseDown={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.transform =
                        "scale(0.97)")
                    }
                    onMouseUp={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.transform =
                        "scale(1)")
                    }
                  >
                    🔖 Add to Saved Places
                  </button>

                  <button
                    onClick={handleAddToTravelBoards}
                    style={{
                      flex: 1,
                      padding: "9px 10px",
                      background: "rgba(255,255,255,0.18)",
                      border: "1px solid rgba(255,255,255,0.35)",
                      borderRadius: "10px",
                      color: "white",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "background 0.2s, transform 0.1s",
                      letterSpacing: "0.1px",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(255,255,255,0.28)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(255,255,255,0.18)")
                    }
                    onMouseDown={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.transform =
                        "scale(0.97)")
                    }
                    onMouseUp={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.transform =
                        "scale(1)")
                    }
                  >
                    🗺️ Add to Travel Boards
                  </button>
                </div>

                {/* Feedback toast */}
                {savedFeedback && (
                  <p
                    style={{
                      marginTop: "10px",
                      textAlign: "center",
                      fontSize: "13px",
                      color: "rgba(255,255,255,0.9)",
                      fontWeight: 500,
                      animation: "fadeIn 0.2s ease",
                    }}
                  >
                    ✓ {savedFeedback}
                  </p>
                )}
              </div>
            )}
          </div>
        </APIProvider>
      </main>
    </>
  );
};

export default UserDashboard;