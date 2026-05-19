"use client";
import React, { useEffect, useState } from "react";
import Header from "@/components/Header";
import styles from "@/styles/page.module.css";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useApi } from "@/hooks/useApi";
import { User } from "@/types/user";
import { useParams, useRouter } from "next/dist/client/components/navigation";
import PlaceSearchBar from "@/components/PlaceSearchBar";
import {SavedPlace} from "@/types/savedplace";


interface BoardDetail {
  id: number;
  name: string;
  location: string;
  latMin?: number | null;
  latMax?: number | null;
  lngMin?: number | null;
  lngMax?: number | null;
}

const isInBoardCity = (place: SavedPlace, board: BoardDetail): boolean => {
  if (place.lat == null || place.lng == null) return true;
  if (board.latMin == null || board.latMax == null || board.lngMin == null || board.lngMax == null) return true;
  return (
    place.lat >= board.latMin &&
    place.lat <= board.latMax &&
    place.lng >= board.lngMin &&
    place.lng <= board.lngMax
  );
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
      <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0d1b8e" }}>
        Outside {cityLabel}
      </h3>
      <p style={{ margin: 0, fontSize: "13px", color: "#555", lineHeight: "1.5" }}>
        <strong>{placeName}</strong> is not in {cityLabel}. Are you sure you want to add it to this board?
      </p>
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
  board: BoardDetail;
  cityDisplay: string;
  added: boolean;
  onAdd: (place: SavedPlace) => Promise<void>;
}> = ({ place, board, cityDisplay, added, onAdd }) => {
  const [imgError, setImgError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const photoUrl = place.photoReference && !imgError ? getPlacePhotoUrl(place.photoReference) : null;
  const matches = isInBoardCity(place, board);

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
      setShowConfirm(true);
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
  const [addedPlaceIds, setAddedPlaceIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const boardCity = board?.location ?? "";
  const cityLabel = boardCity.split("|")[0];
  const cityDisplay = cityLabel.charAt(0).toUpperCase() + cityLabel.slice(1);

  const filteredPlaces = searchQuery
    ? savedPlaces.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.address?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : savedPlaces;

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
        setAddedPlaceIds(new Set(boardPlaces.map((p) => p.externalPlaceId)));
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
    setAddedPlaceIds((prev) => new Set([...prev, place.externalPlaceId]));
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
          <button onClick={() => router.push(`/users/${id}`)} style={{ background: "#0d1b8e", border: "1.5px solid #0d1b8e", borderRadius: "20px", padding: "6px 14px", color: "white", fontWeight: "600", cursor: "pointer" }}>
            Go to Map
          </button>
        </div>

        <div style={{ backgroundColor: "#76bdd6", borderRadius: "16px", padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
          <h2 style={{ color: "#0d1b8e", fontWeight: "700", fontSize: "28px", margin: 0 }}>All</h2>
          <PlaceSearchBar
            savedPlaces={savedPlaces}
            onQueryChange={(q) => setSearchQuery(q)}
            onPlaceSelect={(lat, lng, place) => setSearchQuery(place.name)}
          />
        </div>

        {loading ? <p>Loading…</p> : filteredPlaces.length === 0 ? (
          <p style={{ color: "#0d1b8e" }}>No saved places found.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "14px" }}>
            {filteredPlaces.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                board={board!}
                cityDisplay={cityDisplay}
                added={addedPlaceIds.has(place.externalPlaceId)}
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