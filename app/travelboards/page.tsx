"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button, Modal, Input, DatePicker } from "antd";
import styles from "./travelboards.module.css";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import Header from "@/components/Header";
import LocationInput from "./LocationInput";
import dayjs, { Dayjs } from "dayjs";
import { ApiService } from "@/api/apiService"; // adjust path if needed

type TravelBoard = {
  id: number;
  name: string;
  location: string;
  startDate: string | null;
  endDate: string | null;
  privacy: string;
  ownerId: number;
};


const TravelBoardsPage: React.FC = () => {
    const isAllowed = useProtectedRoute(); 
    const [isCreatedModalOpen, setIsCreatedModalOpen] = useState(false); // state to control if we need to display the modal to create new board 
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false); // state to control if we need to display the modal to join a new board
    const apiService = new ApiService();
    
    const [boardName, setBoardName] = useState("");
    const [location, setLocation] = useState("");
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
    const [privacy, setPrivacy] = useState<"PRIVATE" | "FRIENDS" | "PUBLIC">("PRIVATE");

    const [boards, setBoards] = useState<TravelBoard[]>([]); // for displayig TB


    const [isManageMode, setIsManageMode] = useState(false);    // for managing 
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);  // for managing 

    // for invitation code pop up 
    const [showCodePopup, setShowCodePopup] = useState(false);
    const [generatedCode, setGeneratedCode] = useState("");
    const [codeCopied, setCodeCopied] = useState(false);

    // to search friends 
    const [friendSearch, setFriendSearch] = useState("");
    const [friendResults, setFriendResults] = useState<{id: number; username: string; avatar?: string}[]>([]);
    const [invitedFriends, setInvitedFriends] = useState<{id: number; username: string}[]>([]);
    const friendDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);


    useEffect(() => {
        if (!isAllowed) return;     // #35 ; #46 works for pop up too 
        fetchBoards();             // #36 fetch TB for display  

        // get current user id from localStorage
        const userId = localStorage.getItem("userId");
        if (userId) setCurrentUserId(Number(userId));
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
      privacy: privacy,
      invitedUserIds: invitedFriends.map((f) => f.id),
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
    } catch (err) {
      alert("Something went wrong. Please try again.");
      console.error(err);
    }
  };

    // for displaying TB 
    const fetchBoards = async () => {
      try {
        const data = await apiService.get<{id: number, name: string, location: string, startDate: string | null, endDate: string | null, privacy: string, ownerId: number}[]>("/travelboards/my");
        setBoards(data);
      } catch (err) {
        console.error("Could not fetch boards:", err);
      }
    };

    const handleMinus = async (boardId: number, ownerId: number) => {

      if (currentUserId === ownerId) {
          // user is owner → delete the board
          try {
              await apiService.delete(`/travelboards/${boardId}`);
              fetchBoards(); // refresh list
          } catch (err) {
              alert("Could not delete board.");
              console.error(err);
          }
      } else {
          // user is not owner → just remove from view
          setBoards(boards.filter(board => board.id !== boardId));
      }
  };

    const generateInviteCode = () => {
      // 8-char alphanumeric code — readable and short enough to type
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const code = Array.from({ length: 8 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
      ).join("");
      setGeneratedCode(code);
      setShowCodePopup(true);
      setCodeCopied(false);
      // TODO: optionally POST this code to your backend so it can be validated on join
    };

    const handleCopyCode = () => {
      navigator.clipboard.writeText(generatedCode);
      setCodeCopied(true);
    };

    // for friends search 
    const searchFriends = async (query: string) => {
      if (query.length < 1) { setFriendResults([]); return; }
      try {
        // Adjust endpoint to whatever your backend exposes
        const results = await apiService.get<{id: number; username: string}[]>(
          `/travelboards/join}`
        );
        setFriendResults(results);
      } catch {
        setFriendResults([]);
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
          <Button 
              className={styles.btn} 
              onClick={() => setIsManageMode(!isManageMode)}
              style={isManageMode ? {background: "#0B0696", color: "white"} : {}}
          >
              {isManageMode ? "Done" : "Manage"}
          </Button>
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
            <div key={board.id} className={styles.boardCard} style={{position: "relative"}}>
              
              {/* Minus button - only show in manage mode */}
              {isManageMode && (
                  <button
                    onClick={() => handleMinus(board.id, board.ownerId)}
                      style={{
                          position: "absolute",
                          top: "-10px",
                          left: "-10px",
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          background: "#555",
                          color: "white",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "16px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          zIndex: 10
                      }}
                  >
                      −
                  </button>
              )}
              
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

            <LocationInput value={location} onChange={setLocation} />

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
                  {(["PRIVATE", "FRIENDS", "PUBLIC"] as const).map((opt) => (
                    <Button
                      key={opt}
                      className={styles.privacyBtn}
                      type={privacy === opt ? "primary" : "default"}
                      onClick={() => setPrivacy(opt)}
                    >
                      {opt.charAt(0) + opt.slice(1).toLowerCase()}
                    </Button>
                  ))}
                </div>
                <p style={{ fontSize: "0.75rem", color: "#888", marginTop: "0.25rem" }}>
                  {privacy === "PRIVATE" && "Only you can see this board."}
                  {privacy === "FRIENDS" && "Only your friends can see this board."}
                  {privacy === "PUBLIC" && "Everyone can see this board."}
                </p>
              </div>

            {/* Invite friends — unchanged */}
            <div className={styles.inviteSection}>
              <p className={styles.sectionLabel}>Invite friends</p>
              <div className={styles.inviteButtons}>
                <Button className={styles.inviteBtn} onClick={generateInviteCode}>
                  Share code
                </Button>
              </div>

              {/* Inline code popup */}
              {showCodePopup && (
                <div style={{
                  marginTop: "0.75rem", background: "#f0eeff",
                  borderRadius: "16px", padding: "1rem",
                  border: "1.5px solid #3333cc", textAlign: "center"
                }}>
                  <p style={{ margin: "0 0 0.5rem", fontWeight: 700, color: "#3333cc" }}>
                    Invite Code
                  </p>
                  <div style={{
                    fontSize: "1.6rem", letterSpacing: "0.3em",
                    fontWeight: 800, color: "#0B0696", marginBottom: "0.75rem"
                  }}>
                    {generatedCode}
                  </div>
                  <Button
                    onClick={handleCopyCode}
                    style={{ borderRadius: "20px", background: "#0B0696", color: "white", border: "none" }}
                  >
                    {codeCopied ? "✓ Copied!" : "Copy code"}
                  </Button>
                  <p style={{ fontSize: "0.75rem", color: "#888", marginTop: "0.5rem" }}>
                    Share this code with friends so they can join your board.
                  </p>
                </div>
              )}
            </div>

            <div style={{ position: "relative", marginTop: "0.5rem" }}>
              <input
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: "20px",
                  background: "#e8e8e8", border: "none", boxSizing: "border-box",
                  fontSize: "0.9rem"
                }}
                placeholder="Search friends by username or email…"
                value={friendSearch}
                onChange={(e) => {
                  setFriendSearch(e.target.value);
                  if (friendDebounce.current) clearTimeout(friendDebounce.current);
                  friendDebounce.current = setTimeout(() => searchFriends(e.target.value), 300);
                }}
              />
              {friendResults.length > 0 && (
                <ul style={{
                  position: "absolute", top: "100%", left: 0, right: 0,
                  background: "#fff", border: "1px solid #d6cece",
                  borderRadius: "12px", listStyle: "none", margin: 0, padding: "0.4rem 0",
                  zIndex: 100, boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                }}>
                  {friendResults.map((f) => (
                    <li
                      key={f.id}
                      onMouseDown={() => {
                        if (!invitedFriends.find((x) => x.id === f.id)) {
                          setInvitedFriends([...invitedFriends, f]);
                        }
                        setFriendSearch("");
                        setFriendResults([]);
                      }}
                      style={{ padding: "8px 16px", cursor: "pointer", fontSize: "0.9rem" }}
                    >
                      {f.username}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Invited chips */}
            {invitedFriends.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.5rem" }}>
                {invitedFriends.map((f) => (
                  <span key={f.id} style={{
                    background: "#3333cc", color: "white", borderRadius: "20px",
                    padding: "4px 12px", fontSize: "0.8rem", display: "flex",
                    alignItems: "center", gap: "6px"
                  }}>
                    {f.username}
                    <span
                      onClick={() => setInvitedFriends(invitedFriends.filter((x) => x.id !== f.id))}
                      style={{ cursor: "pointer", fontWeight: 700 }}
                    >×</span>
                  </span>
                ))}
              </div>
            )}

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
