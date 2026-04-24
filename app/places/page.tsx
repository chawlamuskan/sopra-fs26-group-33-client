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
}

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
            overflow: "visible" }}>
        <h1 className={styles.title} style={{ margin: "0 0 24px 0" }}>
          Saved Places
        </h1>
        <div style={{ backgroundColor: "#76bdd6", borderRadius: "16px", padding: "20px" }}>
          <h2 style={{ color: "#0d1b8e", fontWeight: "700", fontSize: "28px", margin: "0 0 16px 4px" }}>
            All
          </h2>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "14px" }}>
              {savedPlaces.map((place) => (
                <div
                  key={place.id}
                  title={place.name}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "12px",
                    aspectRatio: "1 / 1",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "8px",
                    textAlign: "center",
                    fontSize: "11px",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e8f4fd")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
                >
                  {place.name}
                </div>
              ))}
              {savedPlaces.length === 0 && (
                <p style={{ gridColumn: "1 / -1", color: "#0d1b8e" }}>No saved places yet.</p>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default SavedPlaces;