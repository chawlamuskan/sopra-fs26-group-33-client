"use client";

import React, { useEffect, useState } from "react";
import { Button, Modal, Input, DatePicker } from "antd";
import styles from "./travelboards.module.css";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import Header from "@/components/Header";
import dayjs, { Dayjs } from "dayjs";
import { ApiService } from "@/api/apiService"; // adjust path if needed


const TravelBoardsPage: React.FC = () => {
    const isAllowed = useProtectedRoute(); 
    const [isCreatedModalOpen, setIsCreatedModalOpen] = useState(false); // state to control if we need to display the modal to create new board 
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false); // state to control if we need to display the modal to join a new board
    const apiService = new ApiService();
    
    const [boardName, setBoardName] = useState("");
    const [location, setLocation] = useState("");
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
    const [isPublic, setIsPublic] = useState<boolean | null>(null);

    const [boards, setBoards] = useState<{id: number, name: string, location: string, startDate: string | null, endDate: string | null, privacy: string}[]>([]); // for displayig TB

    useEffect(() => {
        if (!isAllowed) return;     // #35 ; #46 works for pop up too 
        fetchBoards();             // #36 fetch TB for display  
      }, [isAllowed]);

    const handleSave = async () => {
    if (!boardName.trim()) {
      alert("Please enter a board name.");
      return;
    }

    const payload = {
      name: boardName,
      location: location,
      startDate: dateRange[0] ? dateRange[0].toISOString() : null,
      endDate: dateRange[1] ? dateRange[1].toISOString() : null,
      privacy: isPublic ? "PUBLIC" : "PRIVATE",
    };

    try {
      await apiService.post("/travelboards", payload);
      alert("Board created!");
      fetchBoards(); // refresh the list of boards after creating a new one
      setIsCreatedModalOpen(false);
      // reset form
      setBoardName("");
      setLocation("");
      setDateRange([null, null]);
      setIsPublic(null);
    } catch (err) {
      alert("Something went wrong. Please try again.");
      console.error(err);
    }
  };

    // for displaying TB 
  const fetchBoards = async () => {
    try {
      const data = await apiService.get<{id: number, name: string, location: string, startDate: string | null, endDate: string | null, privacy: string}[]>("/travelboards/my");
      setBoards(data);
    } catch (err) {
      console.error("Could not fetch boards:", err);
    }
  };

  return (
    <>
    <Header /> 
    <div className={styles.page}>
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
      {boards.length === 0 ? (
        <div className={styles.empty}>
          <p>You have no travel boards yet.</p>
          <p>Click <strong>Create</strong> to start planning your first trip!</p>
        </div>
      ) : (
        <div className={styles.boardList}>
          {boards.map((board) => (
            <div key={board.id} className={styles.boardCard}>
              {/* Top row: name + dates */}
              <div className={styles.boardCardHeader}>
                <h3 className={styles.boardName}>{board.name}</h3>
                {board.startDate && (
                  <span className={styles.boardDates}>
                    {dayjs(board.startDate).format("D MMM")}
                    {board.endDate && ` – ${dayjs(board.endDate).format("D MMM")}`}
                  </span>
                )}
              </div>

              {/* Friends joining */}
              <div className={styles.friendsRow}>
                <span className={styles.friendsLabel}>Friends joining:</span>
                {/* placeholder empty circles for now */}
              </div>

              {/* 6 empty place boxes */}
              <div className={styles.placesGrid}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={styles.placeBox} />
                ))}
              </div>
              
              {/* See more */}
              <div className={styles.seeMoreRow}>
                <a className={styles.seeMore}>see more</a>
              </div>
            </div>
          ))}
        </div>
      )}

        {/* Create modal - actual content for #47 */}

        <Modal
          title={<span style={{ color: "#3333cc" }}>Create a new board</span>}
          open={isCreatedModalOpen}
          onCancel={() => setIsCreatedModalOpen(false)}
          footer={null}
        >
          <div className={styles.form}>

            <Input
              placeholder="New Board Name"
              className={styles.input}
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
            />

            <Input
              placeholder="Choose location"
              className={styles.input}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />

            <DatePicker.RangePicker
              className={styles.input}
              placeholder={["Start date (optional)", "End date (optional)"]}
              value={dateRange}
              onChange={(dates) =>
                setDateRange(dates ? [dates[0], dates[1]] : [null, null])
              }
            />

            {/* Privacy */}
              <div className={styles.privacySection}>
                <p className={styles.sectionLabel}>Privacy setting</p>
                <div className={styles.privacyButtons}>
                  <Button
                    className={styles.privacyBtn}
                    type={!isPublic ? "primary" : "default"}
                    onClick={() => setIsPublic(false)}
                  >
                    Private
                  </Button>
                  <Button
                    className={styles.privacyBtn}
                    type={isPublic ? "primary" : "default"}
                    onClick={() => setIsPublic(true)}
                  >
                    Public
                  </Button>
                </div>
              </div>

            {/* Invite friends — unchanged */}
            <div className={styles.inviteSection}>
              <p className={styles.sectionLabel}>Invite friends</p>
              <div className={styles.inviteButtons}>
                <Button className={styles.inviteBtn}>Share code</Button>
                <Button className={styles.privacyBtn}>Pick from friends list</Button>
              </div>
            </div>

            {/* Save button */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button className={styles.saveBtn} onClick={handleSave}>Save</Button>
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
    </div>
    </>
  );
};

export default TravelBoardsPage;
