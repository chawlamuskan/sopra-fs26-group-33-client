"use client";
import React, { useEffect, useState } from "react";
import Header from "@/components/Header";
import styles from "@/styles/page.module.css";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useApi } from "@/hooks/useApi";
import { User } from "@/types/user";

interface SavedPlace {
  id: number;
  externalPlaceId: string;
  name: string;
  address: string;
  rating: number | null;
  photoReference: string | null; 
}

// Build the Google Places photo URL from a photo_reference
const getPlacePhotoUrl = (photoReference: string) =>
  `https://places.googleapis.com/v1/${photoReference}/media?maxWidthPx=400&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;

// Fallback when no photo is available
const PlaceholderIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#76bdd6" strokeWidth="1.5">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
    <circle cx="12" cy="9" r="2.5"/>
  </svg>
);

const PlaceCard: React.FC<{ place: SavedPlace }> = ({ place }) => {
  const [imgError, setImgError] = useState(false);
  const photoUrl = place.photoReference && !imgError
    ? getPlacePhotoUrl(place.photoReference)
    : null;

  return (
    <div
      title={place.name}
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        aspectRatio: "1 / 1",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        overflow: "hidden",
        position: "relative",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.04)";
        e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.15)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Photo or placeholder */}
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={place.name}
          onError={() => setImgError(true)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#eaf5fb",
        }}>
          <PlaceholderIcon />
        </div>
      )}

      {/* Name label at bottom */}
      <div style={{
        position: "relative",
        zIndex: 1,
        width: "100%",
        background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
        color: "#fff",
        fontSize: "10px",
        fontWeight: "600",
        padding: "16px 6px 6px",
        textAlign: "center",
        lineHeight: "1.2",
        // Clamp to 2 lines
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}>
        {place.name}
      </div>
    </div>
  );
};

const SavedPlaces: React.FC = () => {
  const storedUser = useLocalStorage<User | null>("user", null);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const apiService = useApi();

  useEffect(() => {
    if (!storedUser.value?.id) return;
    apiService.get<SavedPlace[]>(`/users/${storedUser.value.id}/savedplaces`)
      .then((data) => setSavedPlaces(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [storedUser.value?.id]);

  return (
    <>
      <Header />
      <main className={styles.main} style={{
        padding: "24px 70px",
        minHeight: "100vh",
        boxSizing: "border-box",
        overflow: "visible",
      }}>
        <h1 className={styles.title} style={{ margin: "0 0 24px 0" }}>
          Saved Places
        </h1>
        <div style={{ backgroundColor: "#76bdd6", borderRadius: "16px", padding: "20px" }}>
          <h2 style={{ color: "#0d1b8e", fontWeight: "700", fontSize: "28px", margin: "0 0 16px 4px" }}>
            All
          </h2>
          {loading ? (
            <p>Loading...</p>
          ) : savedPlaces.length === 0 ? (
            <p style={{ color: "#0d1b8e" }}>No saved places yet.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "14px" }}>
              {savedPlaces.map((place) => (
                <PlaceCard key={place.id} place={place} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default SavedPlaces;