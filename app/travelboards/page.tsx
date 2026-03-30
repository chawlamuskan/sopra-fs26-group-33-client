"use client";

import React, { useEffect, useState } from "react";
import { Button, Modal, Input, DatePicker } from "antd";
import styles from "./travelboards.module.css";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import Header from "@/components/Header";

const TravelBoardsPage: React.FC = () => {
    const isAllowed = useProtectedRoute(); 
    const [isCreatedModalOpen, setIsCreatedModalOpen] = useState(false); // state to control if we need to display the modal to create new board 
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false); // state to control if we need to display the modal to join a new board

    useEffect(() => {
        if (!isAllowed) return;     // #35 ; #46 works for pop up too 
    }, [isAllowed]);

  return (
    <>
    <Header /> 
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
          {/* #38 join modal */}
          <Button className={styles.btn} onClick={() => setIsJoinModalOpen(true)}>
            Join
          </Button>
        </div>
      </div>

      {/* Empty state */}
      <div className={styles.empty}>
        <p>You have no travel boards yet.</p>
        <p>Click <strong>Create</strong> to start planning your first trip!</p>
      </div>

        {/* Create modal - actual content for #47 */}

        <Modal
            title={<span style={{ color: "#3333cc" }}>Create a new board</span>}     // #45 travel board creation page + #47
            open={isCreatedModalOpen}
            onCancel={() => setIsCreatedModalOpen(false)}
            footer={null}
        >
          <div className={styles.form}>      

            {/* Board name */}
            <Input 
              placeholder="New Board Name"
              className={styles.input}
            />

            {/* Location */}
            <Input 
              placeholder="Choose location"
              className={styles.input}
            />

            {/* Date */}
            <DatePicker.RangePicker
              className={styles.input}
              placeholder={["Start date (optional)", "End date (optional)"]}
            />

            {/* Privacy */}
            <div className={styles.privacySection}>
              <p className={styles.sectionLabel}>Privacy setting</p>
              <div className={styles.privacyButtons}>
                <Button className={styles.privacyBtn}>Private</Button>
                <Button className={styles.privacyBtn}>Public</Button>
              </div>
            </div>

            {/* Invite friends */}
            <div className={styles.inviteSection}>
              <p className={styles.sectionLabel}>Invite friends</p>
              <div className={styles.inviteButtons}>
                <Button className={styles.invacyBtn}>Share code</Button>
                <Button className={styles.privacyBtn}>Pick from friends list</Button>
              </div>
            </div>

          </div>
        </Modal>
            
          
              
       

        {/* Join modal - actual content for #53 */}

        <Modal
            title="Join a Travel Board"
            open={isJoinModalOpen}
            onCancel={() => setIsJoinModalOpen(false)}
            footer={null}
        >
          <p style={{color: "red"}}>You can join soon ...</p>
        </Modal>

    </div>
    </>
  );
};

export default TravelBoardsPage;