"use client";
import React, { useEffect, useState } from "react";
import Header from "@/components/Header";
import styles from "@/styles/page.module.css";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useApi } from "@/hooks/useApi";
import { User } from "@/types/user";
import { useParams, useRouter } from "next/dist/client/components/navigation";

interface SavedPlace {
  id: number;
  externalPlaceId: string;
  name: string;
  address: string;
  rating: number | null;
  photoReference: string | null; 
}


interface BoardDetail {
  id: number;
  name: string;
  location: string;
}

const extractCity = (location: string) => location.split(",")[0].trim().toLowerCase();

const isInBoardCity = (address: string, boardLocation: string) =>
  address.toLowerCase().includes(extractCity(boardLocation));

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



const PlaceCard: React.FC<{ place: SavedPlace; boardLocation: string; added: boolean }> = ({ place, boardLocation, added }) => {
  const [imgError, setImgError] = useState(false);
  const photoUrl = place.photoReference && !imgError ? getPlacePhotoUrl(place.photoReference) : null;
  const matches = isInBoardCity(place.address, boardLocation);
  const disabled = !matches || added;
  const city = extractCity(boardLocation);

  return (
    <div style={{
      backgroundColor: "#ffffff",
      borderRadius: "12px",
      aspectRatio: "1 / 1",
      overflow: "hidden",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-end",
    }}>
      {/* Photo or placeholder */}
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={place.name}
          onError={() => setImgError(true)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#eaf5fb" }}>
          <PlaceholderIcon />
        </div>
      )}

      {/* Grey overlay for non-matching cities */}
      {!matches && (
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.55)",
          filter: "grayscale(100%)",
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "9px", fontWeight: "600", textAlign: "center", padding: "0 6px" }}>
            Not in {city.charAt(0).toUpperCase() + city.slice(1)}
          </span>
        </div>
      )}

      <button
        style={{
            position: "absolute",
            top: "6px",
            right: "6px",
            zIndex: 3,
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            border: "none",
            fontSize: "16px",
            fontWeight: "700",
            lineHeight: "1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: disabled ? "rgba(120,120,120,0.5)" : "rgba(255,255,255,0.9)",
            color: disabled ? "rgba(255,255,255,0.6)" : "#0d1b8e",
            cursor: disabled ? "not-allowed" : "pointer",
            boxShadow: disabled ? "none" : "0 2px 6px rgba(0,0,0,0.2)",
        }}
        >
        +
    </button>

      {/* Name label */}
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

const SavedPlacesAdd: React.FC = () => {
  const { id } = useParams();
  const router = useRouter();
  const storedUser = useLocalStorage<User | null>("user", null);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const apiService = useApi();
  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!storedUser.value?.id || !id) return;

    const fetchAll = async () => {
        try {
        const [places, boardData, boardPlaces] = await Promise.all([
            apiService.get<SavedPlace[]>(`/users/${storedUser.value!.id}/savedplaces`),
            apiService.get<BoardDetail>(`/travelboards/${id}`),
            apiService.get<SavedPlace[]>(`/travelboards/${id}/places`),  // ← new
        ]);

        setSavedPlaces(places);
        setBoard(boardData);
        setAddedIds(new Set(boardPlaces.map((p) => p.id)));  // ← new
        } catch (err) {
        console.error(err);
        } finally {
        setLoading(false);
        }
    };

    fetchAll();
    }, [storedUser.value?.id, id]);

  return (
    <>
      <Header />
      <main className={styles.main} style={{ padding: "24px 70px", minHeight: "100vh", boxSizing: "border-box", overflow: "visible" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
          <h1 className={styles.title} style={{ margin: 0 }}>
            Add Places {board ? `to "${board.name}"` : "to Board"}
          </h1>
          <button onClick={() => router.back()} style={{ background: "none", border: "1.5px solid #0d1b8e", borderRadius: "20px", padding: "6px 14px", color: "#0d1b8e", fontWeight: "600", cursor: "pointer" }}>
           Go Back
          </button>
        </div>
        <div style={{ backgroundColor: "#76bdd6", borderRadius: "16px", padding: "20px" }}>
          <h2 style={{ color: "#0d1b8e", fontWeight: "700", fontSize: "28px", margin: "0 0 16px 4px" }}>All</h2>
          {loading ? <p>Loading…</p> : savedPlaces.length === 0 ? (
            <p style={{ color: "#0d1b8e" }}>No saved places yet.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "14px" }}>
              {savedPlaces.map((place) => (
                <PlaceCard key={place.id} place={place} boardLocation={board?.location ?? ""} added={addedIds.has(place.id)} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default SavedPlacesAdd;