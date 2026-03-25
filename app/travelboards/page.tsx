"use client";

import React, { useEffect, useState } from "react";
import { Button, Modal } from "antd";
import styles from "./travelboards.module.css";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";

const TravelBoardsPage: React.FC = () => {
    const isAllowed = useProtectedRoute(); 
    const [isCreatedModalOpen, setIsCreatedModalOpen] = useState(false); // state to control if we need to display the modal to create new board 

    useEffect(() => {
        if (!isAllowed) return;     // #35
    }, [isAllowed]);

  return (
    <div className={styles.container}>

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Travel Boards</h1>
        <div className={styles.buttons}>

            {/* #37 open modal */}
          <Button className={styles.btn} onClick={() => setIsCreatedModalOpen(true)}>
            Create
          </Button>
          <Button className={styles.btn}>Manage</Button>
          <Button className={styles.btn}>Join</Button>
        </div>
      </div>

      {/* Empty state */}
      <div className={styles.empty}>
        <p>You have no travel boards yet.</p>
        <p>Click <strong>Create</strong> to start planning your first trip!</p>
      </div>

        {/* Create modal - actual content for #47 */}

        <Modal
            title="Create a new Travel Board"
            open={isCreatedModalOpen}
            onCancel={() => setIsCreatedModalOpen(false)}
            footer={null}
        >
          <p style={{color: "red"}}>Form coming soon ...</p>
        </Modal>

    </div>
  );
};

export default TravelBoardsPage;