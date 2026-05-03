"use client";
import React, { useEffect, useState } from "react";
import Header from "@/components/Header";
import styles from "@/styles/page.module.css";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useApi } from "@/hooks/useApi";
import { User } from "@/types/user";
import { App } from "antd";


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
  const [manageMode, setManageMode] = useState(false);
  const apiService = useApi();
  const { message, modal } = App.useApp();

  useEffect(() => {
  if (!storedUser.value?.id) return;
  apiService.get<SavedPlace[]>(`/users/${storedUser.value.id}/savedplaces`)
    .then((data) => setSavedPlaces(data))
    .catch(console.error)
    .finally(() => setLoading(false));
}, [storedUser.value?.id]);

const handleRemovePlace = async (place: SavedPlace) => {
  modal.confirm({
    title: `Remove ${place.name} from Saved Places`,
    content: `Are you sure you want to remove ${place.name} from your saved places?`,
    okText: "Remove",
    okButtonProps: { danger: true },
    cancelText: "Cancel",
    onOk: async () => {
      try {
        await apiService.delete(`/users/${storedUser.value?.id}/savedplaces/${place.id}`);
        setSavedPlaces((prev) => prev.filter((p) => p.id != place.id));
        message.success(`${place.name} removed from saved places.`);

      } catch (error: unknown) {
        if (error instanceof Error) {
            message.error(error.message);
          } else {
            message.error(`An unknown error occurred while removing ${place.name} from the saved places.`);
          }
      }
    }
  })
};

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
        <div 
          style={{ 
            backgroundColor: "#76bdd6", 
            borderRadius: "16px", 
            padding: "20px" }}
        >
          <div 
            style={{
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              marginBottom: "16px",}}
          >
            <h2 
              style={{ 
                color: "#0d1b8e", 
                fontWeight: "700", 
                fontSize: "28px", 
                margin: "0 0 16px 4px" }}
            >
              All
            </h2>
            {savedPlaces.length > 0 && (
              <button 
                onClick={() => setManageMode((prev) => !prev)}
                style={{
                  padding: "8px 20px",
                  borderRadius: "20px",
                  border: "none",
                  background: manageMode ? "#0d1b8e" : "#ffffff",
                  color: manageMode ? "#ffffff" : "#0d1b8e",
                  fontWeight: 600,
                  fontSize: "14px",
                  fontFamily: "DM Sans",
                  cursor: "pointer",
                }}
              >
                {manageMode ? "Done" : "Manage"}
              </button>
            )}
          </div>

          {loading ? (
            <p>Loading...</p>
          ) : (
            <div 
              style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(8, 1fr)", 
                gap: "14px" 
              }}
            >
              {savedPlaces.map((place) => (
                <div
                  key={place.id}
                  title={place.name}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "12px",
                    aspectRatio: "1 / 1",
                    cursor: manageMode ? "default": "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "8px",
                    textAlign: "center",
                    fontSize: "11px",
                    overflow: "hidden",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    if (!manageMode)
                      e.currentTarget.style.backgroundColor = "#e8f4fd";
                  }}
                  onMouseLeave={(e) => {
                    if (!manageMode)
                      e.currentTarget.style.backgroundColor = "#ffffff";
                  }}
                >
                  {place.name}

                  {manageMode && (
                    <button
                      onClick={() => handleRemovePlace(place)}
                      style={{
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        border: "none",
                        background: "#d9534f",
                        color: "#ffffff",
                        fontWeight: 700,
                        fontSize: "14px",
                        lineHeight: "1",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                      }}
                      title={`Remove ${place.name}`}
                    >
                      -
                    </button>
                  )}
                </div>
              ))}
              {savedPlaces.length === 0 && (
                <p style={{ gridColumn: "1 / -1", color: "#0d1b8e" }}>
                  No saved places yet.
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default SavedPlaces;