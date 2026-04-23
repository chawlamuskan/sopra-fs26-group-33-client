"use client";
import React from "react";
import Header from "@/components/Header";
import styles from "@/styles/page.module.css";

const CARD_COUNT = 32;

const SavedPlaces: React.FC = () => {
  return (
    <>
      <Header />
      <main
        className={styles.main}
        style={{
          padding: "24px 70px",
        }}
      >
        <h1 className={styles.title} style={{ margin: "0 0 24px 0" }}>
          Saved Places
        </h1>

        <div
          style={{
            backgroundColor: "#76bdd6",
            borderRadius: "16px",
            padding: "20px",
          }}
        >
          <h2
            style={{
              color: "#0d1b8e",
              fontWeight: "700",
              fontSize: "28px",
              margin: "0 0 16px 4px",
            }}
          >
            All
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(8, 1fr)",
              gap: "14px",
            }}
          >
            {Array.from({ length: CARD_COUNT }).map((_, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "12px",
                  aspectRatio: "1 / 1",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#e8f4fd")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#ffffff")
                }
              />
            ))}
          </div>
        </div>
      </main>
    </>
  );
};

export default SavedPlaces;