"use client";

import {useProtectedRoute} from "@/hooks/useProtectedRoute";
import Header from "@/components/Header";
import { useParams } from "next/navigation";
import styles from "@/styles/page.module.css";

const SettingsPage: React.FC = () => {
    const isAllowed = useProtectedRoute(); 
    const { id } = useParams();

    if (isAllowed === null) return null;
    if (!isAllowed) return null;

  return (
    <>
      <Header />
      <main className={styles.main} style={{
            padding: "24px 70px",
            minHeight: "100vh",
            boxSizing: "border-box",
            overflow: "visible" }}>
        <h1 className={styles.title} style={{ margin: "0 0 24px 0" }}>
          Settings
        </h1>
        <h2 style={{ color: "#000000", fontWeight: "700", fontSize: "28px", margin: "0 0 16px 4px" }}>
            Change your preferences
        </h2>
        <h2 style={{ color: "#000000", fontWeight: "700", fontSize: "28px", margin: "0 0 16px 4px" }}>
            Change your account details
        </h2>
      </main>
    </>
  );
};

export default SettingsPage;