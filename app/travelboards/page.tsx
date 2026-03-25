"use client";

import styles from "./travelboards.module.css";

export default function TravelBoardsPage() {
  return (
    <div className={styles.container}>

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Travel Boards</h1>
        <div className={styles.buttons}>
          <button className={styles.btn}>Create</button>
          <button className={styles.btn}>Manage</button>
          <button className={styles.btn}>Join</button>
        </div>
      </div>

      {/* Empty state */}
      <div className={styles.empty}>
        <p>You have no travel boards yet.</p>
        <p>Click <strong>Create</strong> to start planning your first trip!</p>
      </div>

    </div>
  );
}