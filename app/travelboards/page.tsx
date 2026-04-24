"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button, Modal, Input, DatePicker, App } from "antd";
import styles from "./travelboards.module.css";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import Header from "@/components/Header";
import LocationInput from "./LocationInput";
import dayjs, { Dayjs } from "dayjs";
import { ApiService } from "@/api/apiService"; // adjust path if needed
import { Preferences } from "@/types/user";
import { SearchOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";


type TravelBoard = {
  id: number;
  name: string;
  location: string;
  startDate: string | null;
  endDate: string | null;
  privacy: string;
  ownerId: number;
  memberIds?: number[];
};

type InvitationNotification = {
  id: number;
  boardId: number;
  senderId: number;
  receiverId: number;
  status: string;
  boardName: string;
  senderUsername: string;
};


const TravelBoardsPage: React.FC = () => {
    const isAllowed = useProtectedRoute(); 
    const [modal, contextHolder] = Modal.useModal(); // for confirmation modals 
    const [isCreatedModalOpen, setIsCreatedModalOpen] = useState(false); // state to control if we need to display the modal to create new board 
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false); // state to control if we need to display the modal to join a new board
    const apiService = new ApiService();
    const { message } = App.useApp();
    const router = useRouter();
    
    ///// for creating a new board /////
    const [boardName, setBoardName] = useState("");
    const [location, setLocation] = useState("");
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
    const [privacy, setPrivacy] = useState<"PRIVATE" | "FRIENDS" | "PUBLIC">("PRIVATE");
    const [inviteCode, setInviteCode] = useState(""); // store the invite code for the board being created

    const [boards, setBoards] = useState<TravelBoard[]>([]); // for displayig TB
    const [memberProfilePictures, setMemberProfilePictures] = useState<Record<number, string | null>>({});

    ///// for managing TB - only show delete button when in manage mode, only show rename button if user is owner /////
    const [isManageMode, setIsManageMode] = useState(false);    // for managing 
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);  // for managing 
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [renameBoardId, setRenameBoardId] = useState<number | null>(null);
    const [renameBoardName, setRenameBoardName] = useState("");

    ///// for invitation code pop up /////
    const [showCodePopup, setShowCodePopup] = useState(false);
    const [codeCopied, setCodeCopied] = useState(false);

    ///// to search friends /////
    const [friendSearch, setFriendSearch] = useState("");
    const [friendResults, setFriendResults] = useState<{id: number; username: string; avatar: string | null}[]>([]);
    const [invitedFriends, setInvitedFriends] = useState<{id: number; username: string}[]>([]);
    const friendDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [allFriends, setAllFriends] = useState<{id: number; username: string; avatar: string | null}[]>([]);

    ///// join button /////
    const [joinCode, setJoinCode] = useState("");
    const [joinNotifications, setJoinNotifications] = useState<InvitationNotification[]>([]);
    const [joinFeedback, setJoinFeedback] = useState<string | null>(null);
    const [notifAvatars, setNotifAvatars] = useState<Record<number, string | null>>({});
    const [notifCount, setNotifCount] = useState<number>(0);




    useEffect(() => {
        if (!isAllowed) return;     // #35 ; #46 works for pop up too 
        fetchBoards();             // #36 fetch TB for display  
        fetchNotifCount();
        // get current user id from stored user object
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser) as { id?: string | number };
            if (parsedUser.id !== undefined && parsedUser.id !== null) {
              setCurrentUserId(Number(parsedUser.id));
            }
          } catch {
            setCurrentUserId(null);
          }
        }
      }, [isAllowed]);

    const isBoardOwner = (board: TravelBoard) =>
      currentUserId !== null && Number(currentUserId) === Number(board.ownerId);

    // user profile pictures for preview in TB cards - only fetch for max 4 users per board and only if not already fetched for another board, to minimize number of requests
    const getPreviewMemberIds = (board: TravelBoard): number[] => {
      const ids = [board.ownerId, ...(board.memberIds ?? [])].map((id) => Number(id));
      const unique = Array.from(new Set(ids));
      return unique.slice(0, 4);
    };

    const getTotalParticipantCount = (board: TravelBoard): number => {
      const ids = [board.ownerId, ...(board.memberIds ?? [])].map((id) => Number(id));
      return Array.from(new Set(ids)).length;
    };

    useEffect(() => {
      if (!isAllowed || boards.length === 0) return;

      const previewIds = Array.from(
        new Set(
          boards.flatMap((board) => getPreviewMemberIds(board)),
        ),
      );

      const idsToFetch = previewIds.filter((id) => !(id in memberProfilePictures));
      if (idsToFetch.length === 0) return;

      let cancelled = false;

      const fetchPictures = async () => {
        const results = await Promise.all(
          idsToFetch.map(async (userId) => {
            try {
              const prefs = await apiService.get<Preferences>(`/users/${userId}/preferences`);
              return [userId, prefs.profilePicture ?? null] as const;
            } catch {
              return [userId, null] as const;
            }
          }),
        );

        if (cancelled) return;
        setMemberProfilePictures((prev) => {
          const next = { ...prev };
          for (const [userId, picture] of results) {
            next[userId] = picture;
          }
          return next;
        });
      };

      fetchPictures();

      return () => {
        cancelled = true;
      };
    }, [boards, isAllowed, memberProfilePictures]);

    const handleSave = async () => {
    if (!boardName.trim()) {
      message.warning("Please enter a board name.");
      return;
    }

    const payload = {
      name: boardName,
      location: location,
      startDate: dateRange[0] ? dateRange[0].format("YYYY-MM-DD") : null,
      endDate: dateRange[1] ? dateRange[1].format("YYYY-MM-DD") : null,
      privacy: privacy,
      inviteCode: inviteCode || null,
      invitedUserIds: invitedFriends.map((f) => f.id),
    };

    try {
      const createdBoard = await apiService.post<TravelBoard>("/travelboards", payload);

      let sentInvitationCount = 0;
      if (createdBoard?.id && invitedFriends.length > 0) {
        const invitationResults = await Promise.allSettled(
          invitedFriends.map((friend) =>
            apiService.post(`/travelboards/${createdBoard.id}/invitations`, {
              receiverId: friend.id,
            }),
          ),
        );
        sentInvitationCount = invitationResults.filter((result) => result.status === "fulfilled").length;
      }

      if (invitedFriends.length > 0) {
        message.success(`Board created! Sent ${sentInvitationCount}/${invitedFriends.length} invitations.`);
      } else {
        message.success("Board created!");
      }
      fetchBoards(); // refresh the list of boards after creating a new one
      setIsCreatedModalOpen(false);
      // reset form
      setBoardName("");
      setLocation("");
      setDateRange([null, null]);
      setInviteCode("");
      setShowCodePopup(false);
      setInvitedFriends([]);
      setPrivacy("PRIVATE"); 
    } catch (err) {
      message.error("Something went wrong while creating the board.");
      console.error(err);
    }
  };

    // for displaying TB 
    const fetchBoards = async () => {
      try {
        const data = await apiService.get<TravelBoard[]>("/travelboards");
        setBoards(data);
      } catch (err) {
        console.error("Could not fetch boards:", err);
      }
    };

    const manageConfirmBase = {
      centered: true,
      icon: null,
      okButtonProps: {
        style: {
          background: "#0B0696",
          border: "none",
          borderRadius: "8px",
          height: "36px",
          padding: "0 1.2rem",
        },
      },
      cancelButtonProps: {
        style: {
          borderRadius: "8px",
          border: "1px solid #0B0696",
          color: "#0B0696",
          height: "36px",
          padding: "0 1.2rem",
        },
      },
    };

    const handleMinus = async (boardId: number, ownerId: number) => {
      if (currentUserId !== null && Number(currentUserId) === Number(ownerId)) {
        modal.confirm({
          ...manageConfirmBase,
          title: <span style={{ color: "#3333cc", fontWeight: 800 }}>Delete this board?</span>,
          content: <span style={{ color: "#171717" }}>This will permanently delete the board for everyone.</span>,
          okText: "Delete",
          cancelText: "Cancel",
          onOk: async () => {
            try {
              await apiService.delete(`/travelboards/${boardId}`);
              fetchBoards();
            } catch (err) {
              message.error("Could not delete board.");
              console.error(err);
            }
          },
        });
      } else {
        modal.confirm({
          ...manageConfirmBase,
          title: <span style={{ color: "#3333cc", fontWeight: 800 }}>Leave this board?</span>,
          content: <span style={{ color: "#171717" }}>You will no longer see this board unless invited again.</span>,
          okText: "Leave",
          cancelText: "Cancel",
          onOk: async () => {
            try {
              await apiService.delete(`/travelboards/${boardId}/membership`);
              fetchBoards();
            } catch (err) {
              message.error("Could not leave board.");
              console.error(err);
            }
          },
        });
      }
    };

    const openRenameModal = (board: TravelBoard) => {
      setRenameBoardId(board.id);
      setRenameBoardName(board.name);
      setIsRenameModalOpen(true);
    };

    const handleRenameBoard = async () => {
      if (!renameBoardId) return;
      if (!renameBoardName.trim()) {
        message.warning("Board name cannot be empty.");
        return;
      }

      try {
        await apiService.put(`/travelboards/${renameBoardId}`, {
          name: renameBoardName.trim(),
        });
        setIsRenameModalOpen(false);
        setRenameBoardId(null);
        setRenameBoardName("");
        fetchBoards();
      } catch (err) {
        message.error("Could not rename board.");
        console.error(err);
      }
    };

    const generateInviteCode = () => {
      setShowCodePopup(true);
      setCodeCopied(false);
    };

    const handleCopyCode = async () => {
      try {
        let codeToCopy = inviteCode;
        if (!codeToCopy.trim()) {
          const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
          codeToCopy = Array.from({ length: 8 }, () =>
            chars[Math.floor(Math.random() * chars.length)]
          ).join("");
          setInviteCode(codeToCopy);
        }
        await navigator.clipboard.writeText(codeToCopy);
        setCodeCopied(true);
      } catch (error) {
        setCodeCopied(false);
        console.error("Failed to copy invite code:", error);
      }
    };

    // for friends search 
    const handleOpenCreate = async () => {
      setIsCreatedModalOpen(true);
      if (allFriends.length > 0) return;

      try {
        const storedUser = localStorage.getItem("user");
        const parsedUser = storedUser ? JSON.parse(storedUser) as { id?: number } : {};
        if (!parsedUser.id) return;
        const myId = Number(parsedUser.id);

        const allUsers = await apiService.get<{ id: number; username: string }[]>("/users");

        let myFriendIds: number[] = [];
        try {
          const myPrefs = await apiService.get<{ friends?: number[] }>(`/users/${myId}/preferences`);
          myFriendIds = (myPrefs.friends ?? []).map(Number);
        } catch {
          myFriendIds = [];
        }

        const mutualIds = new Set<number>(myFriendIds);
        await Promise.all(
          allUsers
            .filter((u) => Number(u.id) !== myId)
            .map(async (u) => {
              try {
                const theirPrefs = await apiService.get<{ friends?: number[] }>(`/users/${u.id}/preferences`);
                const theirFriends = (theirPrefs.friends ?? []).map(Number);
                if (theirFriends.includes(myId)) mutualIds.add(Number(u.id));
              } catch { /* no preferences yet */ }
            })
        );

        const friendUsers = allUsers.filter((u) => mutualIds.has(Number(u.id)));

        // fetch profile pictures for all friends in parallel
        const friendsWithAvatars = await Promise.all(
          friendUsers.map(async (u) => {
            try {
              const prefs = await apiService.get<{ profilePicture?: string | null }>(`/users/${u.id}/preferences`);
              return { id: Number(u.id), username: u.username, avatar: prefs.profilePicture ?? null };
            } catch {
              return { id: Number(u.id), username: u.username, avatar: null };
            }
          })
        );

        setAllFriends(friendsWithAvatars);
      } catch {
        setAllFriends([]);
      }
    };

    const searchFriends = (query: string) => {
      if (query.length < 1) { setFriendResults([]); return; }
      setFriendResults(
        allFriends.filter((f) =>
          f.username.toLowerCase().includes(query.toLowerCase())
        )
      );
    };

    // Fetch notifications when join modal opens
    const handleOpenJoin = async () => {
      setIsJoinModalOpen(true);
      setJoinFeedback(null);
      try {
        const data = await apiService.get<InvitationNotification[]>("/invitations");
        setJoinNotifications(data);

        // fetch profile pictures for all senders in parallel
        const avatarEntries = await Promise.all(
          data.map(async (notif) => {
            try {
              const prefs = await apiService.get<{ profilePicture?: string | null }>(`/users/${notif.senderId}/preferences`);
              return [notif.senderId, prefs.profilePicture ?? null] as const;
            } catch {
              return [notif.senderId, null] as const;
            }
          })
        );
        setNotifAvatars(Object.fromEntries(avatarEntries));
      } catch {
        setJoinNotifications([]);
      }
    };

    const handleAcceptInvite = async (notif: InvitationNotification) => {
      try {
        await apiService.put(`/invitations/${notif.id}/accept`, {});
        setJoinNotifications((prev) => prev.filter((n) => n.id !== notif.id));
        setNotifCount((prev) => Math.max(0, prev - 1)); // ← add
        setJoinFeedback(`You joined "${notif.boardName}".`);
        fetchBoards();
      } catch { message.error("Could not accept invite."); }
    };

    const handleDeclineInvite = async (notif: InvitationNotification) => {
      try {
        await apiService.put(`/invitations/${notif.id}/decline`, {});
        setJoinNotifications((prev) => prev.filter((n) => n.id !== notif.id));
        setNotifCount((prev) => Math.max(0, prev - 1)); // ← add
        setJoinFeedback(`You declined the invitation to "${notif.boardName}".`);
      } catch { message.error("Could not decline invite."); }
    };

    const handleJoinByCode = async () => {
      if (!joinCode.trim()) return;
      try {
        await apiService.post(
          `/travelboards/join?inviteCode=${encodeURIComponent(joinCode.trim())}`,
          {},
        );
        setJoinFeedback("You joined a board via invite code.");
        setJoinCode("");
        fetchBoards();
      } catch { message.error("Invalid or expired code."); }
    };

    const fetchNotifCount = async () => {
      try {
        const data = await apiService.get<InvitationNotification[]>("/invitations");
        setNotifCount(data.length);
      } catch {
        setNotifCount(0);
      }
    };


  return (
    <>
    {contextHolder}
    <Header /> 
    <div className={styles.page}>
    <div className={styles.container}>

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Travel Boards</h1>
        <div className={styles.buttons}>

            {/* #37 open modal */}
          <Button className={styles.btn} onClick={handleOpenCreate}>
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
          <div style={{ position: "relative", display: "inline-block" }}>
            <Button className={styles.btn} onClick={handleOpenJoin}>Join</Button>
            {notifCount > 0 && (
              <div style={{
                position: "absolute",
                top: "-8px",
                right: "-8px",
                background: "#0B0696",
                color: "white",
                borderRadius: "50%",
                width: "18px",
                height: "18px",
                fontSize: "11px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}>
                {notifCount > 9 ? "9+" : notifCount}
              </div>
            )}
          </div>
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

              {isManageMode && isBoardOwner(board) && (
                <button
                  onClick={() => openRenameModal(board)}
                  style={{
                    position: "absolute",
                    top: "-10px",
                    right: "-10px",
                    borderRadius: "16px",
                    border: "none",
                    background: "#0B0696",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "15px",
                    padding: "4px 8px",
                    zIndex: 10,
                  }}
                >
                  Rename
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
                <div className={styles.memberCircles}>
                  {getPreviewMemberIds(board).map((userId) => {
                    const profilePicture = memberProfilePictures[userId];
                    return profilePicture ? (
                      <img
                        key={userId}
                        src={profilePicture}
                        alt="member"
                        className={styles.memberCircleImg}
                      />
                    ) : (
                      <div key={userId} className={styles.memberCircleFallback}>👤</div>
                    );
                  })}
                  {getTotalParticipantCount(board) > 4 && (
                    <div className={styles.memberMore}>+{getTotalParticipantCount(board) - 4}</div>
                  )}
                </div>
              </div>

              {/* 6 empty place boxes */}
              <div className={styles.placesGrid}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={styles.placeBox} />
                ))}
              </div>
              
              {/* See more */}
              <div className={styles.seeMoreRow}>
                <a className={styles.seeMore} style={{ cursor: "pointer" }} onClick={() => router.push(`/travelboards/${board.id}`)}>see more</a>
              </div>
            </div>
          ))}
        </div>
      )}

        {/* Create modal - actual content for #47 */}

        <Modal
          title={<span style={{  color: "#3333cc", fontWeight: 800, fontSize: "1.4rem" }}>Create a new board</span>}
          open={isCreatedModalOpen}
          onCancel={() => {
            setIsCreatedModalOpen(false);
            // reset form
            setBoardName("");
            setLocation("");
            setDateRange([null, null]);
            setInviteCode("");
            setShowCodePopup(false);
            setInvitedFriends([]);
            setPrivacy("PRIVATE");
          }}
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
                    {inviteCode}
                  </div>
                  <Button
                    onClick={handleCopyCode}
                    style={{ borderRadius: "20px", background: "#0B0696", color: "white", border: "none" }}
                  >
                    {codeCopied ? "✓ Copied!" : "Copy code"}
                  </Button>
                  <p style={{ fontSize: "0.75rem", color: "#888", marginTop: "0.5rem" }}>
                    Code is generated and saved only when you press Copy code.
                  </p>
                </div>
              )}
            </div>

            <div style={{ position: "relative", marginTop: "0.5rem" }}>
              <Input
                placeholder="Search by username"
                variant="borderless"
                prefix={<SearchOutlined style={{ color: "#7D7D7D", marginRight: "4px" }} />}
                style={{ background: "#e8e8e8", borderRadius: "20px", width: "100%" }}
                value={friendSearch}
                onChange={(e) => {
                  setFriendSearch(e.target.value);
                  searchFriends(e.target.value);
                }}
              />
              {friendResults.length > 0 && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0,
                  background: "white", borderRadius: "8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  maxHeight: "200px", overflowY: "auto", zIndex: 100,
                }}>
                  {friendResults.map((f) => (
                    <div
                      key={f.id}
                      onMouseDown={() => {
                        if (!invitedFriends.find((x) => x.id === f.id)) {
                          setInvitedFriends([...invitedFriends, f]);
                        }
                        setFriendSearch("");
                        setFriendResults([]);
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: "12px",
                        padding: "10px 16px", cursor: "pointer",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      {f.avatar ? (
                        <img
                          src={f.avatar}
                          alt={f.username}
                          style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{
                          width: 36, height: 36, borderRadius: "50%", background: "#f0f0f0",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 16, flexShrink: 0,
                        }}>👤</div>
                      )}
                      <span style={{ fontFamily: "DM Sans", fontSize: "16px", color: "#000" }}>
                        {f.username}
                      </span>
                    </div>
                  ))}
                </div>
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
          title={<span style={{ color: "#3333cc", fontWeight: 800, fontSize: "1.4rem" }}>Join a board</span>}
          open={isJoinModalOpen}
          onCancel={() => { setIsJoinModalOpen(false); setJoinCode(""); setJoinFeedback(null); }}
          footer={null}
        >
          {joinFeedback && (
            <div style={{
              background: "#f0eeff", borderRadius: "16px", padding: "0.75rem 1rem",
              border: "1.5px solid #3333cc", marginBottom: "1rem", color: "#3333cc", fontWeight: 700
            }}>
              {joinFeedback}
            </div>
          )}

          {/* Notifications section */}
          <p style={{ color: "#3333cc", fontWeight: 700, fontSize: "1rem", marginBottom: "0.75rem" }}>Notifications</p>

          {joinNotifications.length === 0 ? (
            <p style={{ color: "#030000", fontSize: "0.9rem", marginBottom: "1.5rem" }}>No pending invitations.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
              {joinNotifications.map((notif) => (
                <div key={notif.id} style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  background: "#f4ebeb", borderRadius: "30px", padding: "0.5rem 1rem"
                }}>
                  {notifAvatars[notif.senderId] ? (
                    <img
                      src={notifAvatars[notif.senderId]!}
                      alt={notif.senderUsername}
                      style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{
                      width: "36px", height: "36px", borderRadius: "50%",
                      background: "#d6cece", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                    }}>👤</div>
                  )}
                  <span style={{ flex: 1, fontSize: "0.9rem", fontStyle: "italic" }}>
                    <strong>{notif.senderUsername}</strong> invited you to &quot;{notif.boardName}&quot;
                  </span>
                  <Button
                    size="small"
                    onClick={() => handleAcceptInvite(notif)}
                    style={{ background: "#0B0696", color: "white", border: "none", borderRadius: "20px" }}
                  >Accept</Button>
                  <Button
                    size="small"
                    onClick={() => handleDeclineInvite(notif)}
                    style={{ background: "#0B0696", color: "white", border: "none", borderRadius: "20px" }}
                  >Decline</Button>
                </div>
              ))}
            </div>
          )}

          {/* Use a code section */}
          <p style={{ color: "#3333cc",fontWeight: 700, fontSize: "1rem", marginBottom: "0.75rem" }}>Use a code</p>

          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Enter code…"
            maxLength={8}
            style={{
              width: "100%", padding: "10px 16px", borderRadius: "20px",
              background: "#e8e8e8", border: "none", fontSize: "1rem",
              letterSpacing: "0.15em", boxSizing: "border-box", marginBottom: "0.75rem"
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              onClick={handleJoinByCode}
              style={{ background: "#0B0696", color: "white", border: "none", borderRadius: "20px", padding: "0 1.5rem", height: "40px" }}
            >
              Confirm
            </Button>
          </div>
        </Modal>

        <Modal
          title={<span style={{ color: "#3333cc" }}>Rename board</span>}
          open={isRenameModalOpen}
          onCancel={() => {
            setIsRenameModalOpen(false);
            setRenameBoardId(null);
            setRenameBoardName("");
          }}
          onOk={handleRenameBoard}
          okText="Save"
          cancelText="Cancel"
        >
          <Input
            className={styles.input}
            placeholder="New board name"
            value={renameBoardName}
            onChange={(e) => setRenameBoardName(e.target.value)}
            onPressEnter={handleRenameBoard}
            autoFocus
          />
        </Modal>

    </div>
    </div>
    </>
  );
};

export default TravelBoardsPage;
