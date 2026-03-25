"use client";

import React, { useEffect } from "react";
import { Button } from "antd";
import styles from "./travelboards.module.css";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";

const TravelBoardsPage: React.FC = () => {
    const isAllowed = useProtectedRoute();

    useEffect(() => {
        if (!isAllowed) return;
    }, [isAllowed]);

  return (
    <div className={styles.container}>

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Travel Boards</h1>
        <div className={styles.buttons}>
          <Button className={styles.btn}>Create</Button>
          <Button className={styles.btn}>Manage</Button>
          <Button className={styles.btn}>Join</Button>
        </div>
      </div>

      {/* Empty state */}
      <div className={styles.empty}>
        <p>You have no travel boards yet.</p>
        <p>Click <strong>Create</strong> to start planning your first trip!</p>
      </div>

    </div>
  );
};

export default TravelBoardsPage;