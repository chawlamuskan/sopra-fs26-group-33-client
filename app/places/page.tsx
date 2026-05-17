"use client";

import React, { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import styles from "@/styles/page.module.css";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useApi } from "@/hooks/useApi";
import { User } from "@/types/user";
import { App } from "antd";
import InfoButton from "@/components/InfoButton";
import { useRouter } from "next/navigation";
import {
  ALLOWED_POI_TYPES,
  CATEGORY_LABELS,
  CATEGORY_ROUTES,
} from "@/constants/placeCategories";

interface SavedPlace {
  id: number;
  externalPlaceId: string;
  name: string;
  address: string;
  rating: number | null;
  photoReference: string | null;
  types: string[];
}

export const filterAllowedTypes = (types: string[] = []) =>
  types.filter((t) => ALLOWED_POI_TYPES.includes(t as any));

const getPlacePhotoUrl = (photoReference: string) =>
  `https://places.googleapis.com/v1/${photoReference}/media?maxWidthPx=400&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;

const PlaceholderIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#76bdd6" strokeWidth="1.5">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
    <circle cx="12" cy="9" r="2.5"/>
  </svg>
);

const PlaceCard: React.FC<{ place: SavedPlace; userId?: string }> = ({
  place,
  userId,
}) => {
  const router = useRouter();
  const [imgError, setImgError] = useState(false);

  const photoUrl =
    place.photoReference && !imgError
      ? getPlacePhotoUrl(place.photoReference)
      : null;

  return (
    <div
      title={place.name}
      onClick={() =>
        router.push(`/users/${userId}?placeId=${place.externalPlaceId}`)
      }
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        aspectRatio: "1 / 1",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
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
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#eaf5fb",
          }}
        >
          <PlaceholderIcon />
        </div>
      )}

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
          color: "#fff",
          fontSize: "10px",
          fontWeight: 600,
          padding: "16px 6px 6px",
          textAlign: "center",
        }}
      >
        {place.name}
      </div>
    </div>
  );
};

interface CategoryBoardProps {
  title: string;
  category: string;
  places: SavedPlace[];
}

const CategoryBoard: React.FC<CategoryBoardProps> = ({
  title,
  category,
  places,
}) => {
  const router = useRouter();
  const storedUser = useLocalStorage<User | null>("user", null);

  const userId = storedUser.value?.id;
  const previewPlaces = places.slice(0, 9);

  return (
    <div
      style={{
        background: "#D6E4F5",
        borderRadius: "20px",
        padding: "18px",
        breakInside: "avoid",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "14px",
        }}
      >
        <div>
          <h2 style={{ color: "#0d1b8e", fontWeight: 700, margin: 0 }}>
            {title}
          </h2>
          <p style={{ margin: 0, color: "#0d1b8e", opacity: 0.8 }}>
            {places.length} saved places
          </p>
        </div>

        <button
          onClick={() =>
            router.push(
              category === "All"
                ? "/places/all"
                : `/places/${CATEGORY_ROUTES[category]}`
            )
          }
          style={{
            border: "none",
            borderRadius: "999px",
            background: "#fff",
            color: "#0d1b8e",
            padding: "8px 14px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 3px 10px rgba(0,0,0,0.15)",
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
          See More
        </button>
      </div>

      {/* GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "6px",
        }}
      >
        {previewPlaces.map((place) => (
          <PlaceCard key={place.id} place={place} userId={userId} />
        ))}
      </div>
    </div>
  );
};

const SavedPlaces: React.FC = () => {
  const storedUser = useLocalStorage<User | null>("user", null);
  const router = useRouter();
  const apiService = useApi();

  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = storedUser.value?.id;

  useEffect(() => {
    if (storedUser.value === null) return;

    if (!userId) {
      router.replace("/");
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    apiService
      .get<SavedPlace[]>(`/users/${userId}/savedplaces`)
      .then(setSavedPlaces)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  const groupedPlaces = useMemo(() => {
    const groups: Record<string, SavedPlace[]> = {
      All: savedPlaces,
    };

    savedPlaces.forEach((place) => {
      const filteredTypes =
        place.types?.filter((t) => ALLOWED_POI_TYPES.includes(t as any)) ??
        [];

      filteredTypes.forEach((type) => {
        if (!groups[type]) groups[type] = [];
        if (!groups[type].some((p) => p.id === place.id)) {
          groups[type].push(place);
        }
      });
    });

    return groups;
  }, [savedPlaces]);

  const boardEntries = useMemo(() => {
    return Object.entries(groupedPlaces).sort((a, b) => {
      if (a[0] === "All") return -1;
      if (b[0] === "All") return 1;
      return b[1].length - a[1].length;
    });
  }, [groupedPlaces]);

  const columns: [string, SavedPlace[]][][] = [[], [], []];
  boardEntries.forEach((entry, i) => columns[i % 3].push(entry));

  return (
    <>
      <Header />
      <InfoButton />

      <main className={styles.main} style={{ padding: "24px 70px" }}>
        <h1 className={styles.title}>Saved Places</h1>

        {loading ? (
          <p>Loading...</p>
        ) : savedPlaces.length === 0 ? (
          <p>No saved places yet.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "12px",
            }}
          >
            {columns.map((col, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {col.map(([category, places]) => (
                  <CategoryBoard
                    key={category}
                    category={category}
                    title={category === "All" ? "All" : CATEGORY_LABELS[category] ?? category}
                    places={places}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
};

export default SavedPlaces;