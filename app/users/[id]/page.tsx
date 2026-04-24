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
import popupStyles from "@/styles/placePopup.module.css";
import { ApiService } from "@/api/apiService";

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

const PlaceClickInterceptor: React.FC<{
  onPlaceClick: (place: PlaceInfo) => void;
}> = ({ onPlaceClick }) => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const ALLOWED_POI_TYPES = new Set([
      "restaurant", "cafe", "bar", "tourist_attraction", "museum",
      "park", "shopping_mall", "store", "lodging", "establishment",
    ]);
    const listener = map.addListener(
      "click",
      async (event: google.maps.MapMouseEvent & { placeId?: string }) => {
        if (!event.placeId) return;
        event.stop();
        try {
          const placeId = event.placeId;
          const response = await fetch(
            `https://places.googleapis.com/v1/places/${placeId}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
                "X-Goog-FieldMask": "displayName,formattedAddress,rating,types",
              },
            }
          );
          if (!response.ok) {
            console.error("Places API error:", await response.text());
            return;
          }
          const data = await response.json();
          const types: string[] = data.types ?? [];
          const isPOI = types.some((t) => ALLOWED_POI_TYPES.has(t));
          if (!isPOI) return;
          onPlaceClick({
            name: data.displayName?.text ?? "Unknown Place",
            address: data.formattedAddress ?? "No address available",
            rating: data.rating ?? null,
            placeId,
          });
        } catch (err) {
          console.error("Failed to fetch place details:", err);
        }
      }
    );
    return () => { google.maps.event.removeListener(listener); };
  }, [map, onPlaceClick]);
  return null;
};

// Star rating — renders partial fill for the fractional star
const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
  return (
    <span className={popupStyles.starRow}>
      {Array(fullStars).fill(null).map((_, i) => (
        <span key={`full-${i}`} className={popupStyles.starFull}>★</span>
      ))}
      {hasHalf && <span className={popupStyles.starHalf}>★</span>}
      {Array(emptyStars).fill(null).map((_, i) => (
        <span key={`empty-${i}`} className={popupStyles.starEmpty}>★</span>
      ))}
      <span className={popupStyles.ratingValue}>{rating.toFixed(1)}</span>
    </span>
  );
};

const PlaceCard: React.FC<{
    placeInfo: PlaceInfo;
    onClose: () => void;
    userId: string | undefined;
    token: string | undefined;
    apiService: ApiService;
  }> = ({ placeInfo, onClose, userId, token, apiService }) => {
    const [savedFeedback, setSavedFeedback] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const handleAddToSaved = async () => {
      if (!userId) {
        setSavedFeedback("Not logged in.");
        setTimeout(() => setSavedFeedback(null), 2000);
        return;
      }
      setIsSaving(true);
      try {
        await apiService.post(`/users/${userId}/savedplaces`, {
          externalPlaceId: placeInfo.placeId,
          name: placeInfo.name,
          address: placeInfo.address,
          rating: placeInfo.rating,
        });
        setSavedFeedback("Saved to places!");
      } catch (err: any) {
        setSavedFeedback(err.status === 409 ? "Already saved!" : "Failed to save.");
      } finally {
        setIsSaving(false);
        setTimeout(() => setSavedFeedback(null), 2000);
      }
    };
      const payload = {
  externalPlaceId: placeInfo.placeId,
  name: placeInfo.name,
  address: placeInfo.address,
  rating: placeInfo.rating,
  types: [],
};
  console.log("Saving place payload:", payload);
  console.log("userId:", userId);

  return (
    <div className={popupStyles.card}>
      {/* Close */}
      <button className={popupStyles.closeBtn} onClick={onClose}>✕</button>

      {/* Header row: title + action buttons */}
      <div className={popupStyles.headerRow}>
        <h3 className={popupStyles.placeName}>{placeInfo.name}</h3>
        <div className={popupStyles.headerActions}>
          <button
            className={popupStyles.iconBtn}
            onClick={handleAddToSaved}
            title="Save place"
          >
            🔖
          </button>
          <button
            className={popupStyles.addToBoardBtn}
            //onClick={handleAddToTravelBoard}
          >
            + add to travel board
          </button>
        </div>
      </div>

      {/* Address */}
      <p className={popupStyles.address}>📍 {placeInfo.address}</p>

      {/* Image grid — 2 rows × 4 cols of white placeholders */}
      <div className={popupStyles.gridSection}>
        <div className={popupStyles.gridLabel}>Featured in these posts</div>
        <div className={popupStyles.imageGrid}>
          {Array(4).fill(null).map((_, i) => (
            <div key={i} className={popupStyles.imgPlaceholder} />
          ))}
        </div>
      </div>

      <div className={popupStyles.gridSection}>
        <div className={popupStyles.gridLabel}>Featured in these boards</div>
        <div className={popupStyles.imageGrid}>
          {Array(4).fill(null).map((_, i) => (
            <div key={i} className={popupStyles.imgPlaceholder} />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className={popupStyles.divider} />

      {/* Rating from Google Maps */}
      <div className={popupStyles.ratingSection}>
        <span className={popupStyles.ratingLabel}>Rating from Google Maps</span>
        {placeInfo.rating !== null ? (
          <StarRating rating={placeInfo.rating} />
        ) : (
          <span className={popupStyles.noRating}>No rating available</span>
        )}
      </div>

      {/* Feedback toast */}
      {savedFeedback && (
        <p className={popupStyles.toast}>✓ {savedFeedback}</p>
      )}
    </div>
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
  const position = { lat: 47.3769, lng: 8.5417 };
  const COUNTRY_LABEL_MAX_ZOOM = 6;

  const fetchCountryInfo = async (countryName: string) => {
    const countryRes = await fetch(
      `https://restcountries.com/v3.1/name/${countryName}?fullText=true`
    );
    const countryData = await countryRes.json();
    if (!countryData || countryData.status === 404) return;
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
    if (currentZoom > COUNTRY_LABEL_MAX_ZOOM) return;
    if (!event.detail.latLng) return;
    const { lat, lng } = event.detail.latLng;
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

  const handlePlaceClick = useCallback((place: PlaceInfo) => {
    setPlaceInfo(place);
  }, []);

  const showCountryPopup = countryInfo && currentZoom <= COUNTRY_LABEL_MAX_ZOOM;
  const storedUser = useLocalStorage<User | null>("user", null);

  if (isAllowed === null) return null;
  if (!isAllowed) return null;

  return (
    <>
      <Header />
      <main className={styles.main}>
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
          <div style={{ height: "100vh", width: "100vw", position: "relative", overflow: "hidden" }}>
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
                <div style={{
                  position: "absolute", top: "50%", left: "50%",
                  transform: "translate(-50%, -50%)",
                  backgroundColor: "#0B0696D1", color: "white",
                  borderRadius: "16px", padding: "24px", width: "320px",
                  zIndex: 1000, boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                }}>
                  <button
                    onClick={() => setCountryInfo(null)}
                    style={{
                      position: "absolute", top: "10px", right: "14px",
                      background: "none", border: "none", color: "white",
                      fontSize: "18px", cursor: "pointer",
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
                    <div style={{ backgroundColor: "#1a3a8f", borderRadius: "8px", padding: "10px", textAlign: "center", marginBottom: "8px" }}>
                      Content coming soon
                    </div>
                    <p style={{ textAlign: "center", fontWeight: "bold" }}>Community Posts</p>
                    <div style={{ backgroundColor: "#1a3a8f", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                      Content coming soon
                    </div>
                  </div>
                </div>
              )}
            </Map>

            {/* Place Card — rendered outside <Map> */}
            {placeInfo && (
              <div className={popupStyles.cardWrapper}>
                <PlaceCard
                  placeInfo={placeInfo}
                  onClose={() => setPlaceInfo(null)}
                  userId={storedUser.value?.id}
                  token={storedUser.value?.token}
                  apiService={apiService}
                />
              </div>
            )}
          </div>
        </APIProvider>
      </main>
    </>
  );
};

export default UserDashboard;