"use client";

import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useApi } from "@/hooks/useApi";
import { User } from "@/types/user";
import { CATEGORY_LABELS } from "@/constants/placeCategories";
import { App } from "antd";

interface SavedPlace {
  id: number;
  externalPlaceId: string;
  name: string;
  photoReference: string | null;
  types: string[];
}

const getPlacePhotoUrl = (photoReference: string) =>
  `https://places.googleapis.com/v1/${photoReference}/media?maxWidthPx=400&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const apiService = useApi();
  const storedUser = useLocalStorage<User | null>("user", null);

  const { message, modal } = App.useApp();

  const category = (params.category as string)?.toLowerCase();
  const userId = storedUser.value?.id;

  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [manageMode, setManageMode] = useState(false);

  // ✅ FIX: redirect instead of blank page
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

  const filteredPlaces = useMemo(() => {
    if (!category || category === "all") return savedPlaces;

    return savedPlaces.filter((p) =>
      (p.types ?? []).map((t) => t.toLowerCase()).includes(category)
    );
  }, [savedPlaces, category]);

  const title =
    category === "all"
      ? "All Saved Places"
      : `Saved ${CATEGORY_LABELS[category] ?? category}`;

  const handleRemovePlace = (place: SavedPlace) => {
    if (!userId) return;

    modal.confirm({
      title: "Remove saved place",
      content: `Are you sure you want to remove ${place.name}?`,
      okText: "Remove",
      cancelText: "Cancel",
      okButtonProps: { danger: true },

      onOk: async () => {
        try {
          await apiService.delete(`/users/${userId}/savedplaces/${place.id}`);
          setSavedPlaces((prev) => prev.filter((p) => p.id !== place.id));
          message.success(`${place.name} removed.`);
        } catch (error) {
          message.error("Failed to remove place.");
        }
      },
    });
  };

  return (
    <>
      <Header />

      <main style={{ padding: "24px 30px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h1 style={{ color: "#0d1b8e", margin: 0 }}>{title}</h1>

          <div style={{ display: "flex", gap: "10px" }}>
            {filteredPlaces.length > 0 && (
              <button
                onClick={() => setManageMode((p) => !p)}
                style={{
                  border: "none",
                  borderRadius: "999px",
                  background: manageMode ? "#0d1b8e" : "#fff",
                  color: manageMode ? "#fff" : "#0d1b8e",
                  padding: "8px 14px",
                  fontWeight: 600,
                  cursor: "pointer",
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
                {manageMode ? "Done" : "Manage"}
              </button>
            )}

            <button
              onClick={() => router.push("/places")}
              style={{
                border: "none",
                borderRadius: "999px",
                background: "#0d1b8e",
                color: "#fff",
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
              Back
            </button>
          </div>
        </div>

        <div
          style={{
            background: "#D6E4F5",
            borderRadius: "20px",
            padding: "18px",
            marginTop: "16px",
          }}
        >
          {loading ? (
            <p>Loading...</p>
          ) : filteredPlaces.length === 0 ? (
            <p>No saved places.</p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: "6px",
              }}
            >
              {filteredPlaces.map((place) => (
                <div
                  key={place.id}
                  style={{
                    borderRadius: "16px",
                    overflow: "hidden",
                    aspectRatio: "1 / 1",
                    position: "relative",
                    background: "#fff",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                    cursor: manageMode ? "default" : "pointer",
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
                  onClick={() => {
                    if (manageMode || !userId) return;
                    router.push(`/users/${userId}?placeId=${place.externalPlaceId}`);
                  }}
                >
                  {place.photoReference && (
                    <img
                      src={getPlacePhotoUrl(place.photoReference)}
                      alt={place.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  )}

                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: "10px",
                      fontSize: "12px",
                      color: "white",
                      background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
                    }}
                  >
                    {place.name}
                  </div>

                  {manageMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemovePlace(place);
                      }}
                      style={{
                        position: "absolute",
                        top: "6px",
                        right: "6px",
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        border: "none",
                        background: "#d9534f",
                        color: "#fff",
                        fontWeight: 700,
                      }}
                    >
                      −
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}