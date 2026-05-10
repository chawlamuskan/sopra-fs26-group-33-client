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
  city?: string | null;
}

interface BoardDetail {
  id: number;
  name: string;
  location: string;
}

const extractCity = (location: string) => location.split(",")[0].trim().toLowerCase();

const isInBoardCity = (place: SavedPlace, boardLocation: string): boolean => {
  if (!place.city) return true;

  // boardLocation is stored as the local city name e.g. "roma"
  // place.city is stored as "locality|country" e.g. "roma|italy"
  const parts = place.city.split("|");
  const placeLocality = parts[0]?.toLowerCase().trim() ?? "";
  const placeCountry = parts[1]?.toLowerCase().trim() ?? "";

  const boardParts = boardLocation.split("|");
  const boardLocality = boardParts[0]?.toLowerCase().trim() ?? "";
  const boardCountry = boardParts[1]?.toLowerCase().trim() ?? "";

  // If we have country info on both sides, country must match
  if (placeCountry && boardCountry && placeCountry !== boardCountry) return false;

  // Then check locality
  if (placeLocality && boardLocality) return placeLocality === boardLocality;

  return true;
};

const getPlacePhotoUrl = (photoReference: string) =>
  `https://places.googleapis.com/v1/${photoReference}/media?maxWidthPx=400&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;

const PlaceholderIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#76bdd6" strokeWidth="1.5">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
    <circle cx="12" cy="9" r="2.5"/>
  </svg>
);

const ConfirmModal: React.FC<{
  placeName: string;
  cityLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ placeName, cityLabel, onConfirm, onCancel }) => (
  // Backdrop
  <div
    onClick={onCancel}
    style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0,0,0,0.4)",
      backdropFilter: "blur(4px)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {/* Card — stop click from bubbling to backdrop */}
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        backgroundColor: "#fff",
        borderRadius: "16px",
        padding: "28px 32px",
        maxWidth: "360px",
        width: "90%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {/* Icon */}
      <div style={{
        width: "44px",
        height: "44px",
        borderRadius: "50%",
        backgroundColor: "#fff3cd",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "22px",
      }}>
        ⚠️
      </div>

      {/* Text */}
      <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0d1b8e" }}>
        Outside {cityLabel}
      </h3>
      <p style={{ margin: 0, fontSize: "13px", color: "#555", lineHeight: "1.5" }}>
        <strong>{placeName}</strong> is not in {cityLabel}. Are you sure you want to add it to this board?
      </p>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "10px",
            border: "1.5px solid #ddd",
            backgroundColor: "#fff",
            color: "#555",
            fontWeight: "600",
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "10px",
            border: "none",
            backgroundColor: "#0d1b8e",
            color: "#fff",
            fontWeight: "600",
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          Add anyway
        </button>
      </div>
    </div>
  </div>
);

const PlaceCard: React.FC<{
  place: SavedPlace;
  boardCity: string; 
  cityDisplay: string;
  added: boolean;
  onAdd: (place: SavedPlace) => Promise<void>;
}> = ({ place, boardCity, cityDisplay, added, onAdd }) => { // ← was boardLocation
  const [imgError, setImgError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const photoUrl = place.photoReference && !imgError ? getPlacePhotoUrl(place.photoReference) : null;
  const matches = isInBoardCity(place, boardCity); 
  const cityLabel = boardCity.charAt(0).toUpperCase() + boardCity.slice(1); 


  const doAdd = async () => {
    setShowConfirm(false);
    setAdding(true);
    try {
      await onAdd(place);
    } finally {
      setAdding(false);
    }
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (added || adding) return;

    if (!matches) {
      setShowConfirm(true); // ← open modal to confirm place that is not in the same city
      return;
    }

    doAdd();
  };

  return (
    <>
      
      {showConfirm && (
        <ConfirmModal
            placeName={place.name}
            cityLabel={cityDisplay} 
            onConfirm={doAdd}
            onCancel={() => setShowConfirm(false)}
        />
      )}

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
              Not in {cityDisplay}
            </span>
          </div>
        )}

        {added && (
          <div style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(13, 27, 142, 0.35)",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <span style={{ fontSize: "20px", color: "#fff" }}>✓</span>
          </div>
        )}

        <button
          onClick={handleAdd}
          disabled={added || adding}
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
            backgroundColor: added ? "rgba(120,120,120,0.5)" : "rgba(255,255,255,0.9)",
            color: added ? "rgba(255,255,255,0.6)" : "#0d1b8e",
            cursor: added || adding ? "not-allowed" : "pointer",
            boxShadow: added ? "none" : "0 2px 6px rgba(0,0,0,0.2)",
          }}
        >
          {adding ? "…" : "+"}
        </button>

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
    </>
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
  const boardCity = board?.location ?? "";
  const cityLabel = boardCity.split("|")[0];
  const cityDisplay = cityLabel.charAt(0).toUpperCase() + cityLabel.slice(1);

  useEffect(() => {
    if (!storedUser.value?.id || !id) return;

    const fetchAll = async () => {
      try {
        const [places, boardData, boardPlaces] = await Promise.all([
          apiService.get<SavedPlace[]>(`/users/${storedUser.value!.id}/savedplaces`),
          apiService.get<BoardDetail>(`/travelboards/${id}`),
          apiService.get<SavedPlace[]>(`/travelboards/${id}/places`),
        ]);
        setSavedPlaces(places);
        setBoard(boardData);
        setAddedIds(new Set(boardPlaces.map((p) => p.id)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [storedUser.value?.id, id]);

  const handleAdd = async (place: SavedPlace) => {
    await apiService.post(`/travelboards/${id}/places`, {
      externalPlaceId: place.externalPlaceId,
      name: place.name,
      address: place.address,
      rating: place.rating,
      photoReference: place.photoReference,
    });
    setAddedIds((prev) => new Set([...prev, place.id]));
  };

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
                <PlaceCard
                key={place.id}
                place={place}
                boardCity={boardCity}
                cityDisplay={cityDisplay} // ← add
                added={addedIds.has(place.id)}
                onAdd={handleAdd}
                />
            ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default SavedPlacesAdd;