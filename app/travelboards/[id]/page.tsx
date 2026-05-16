"use client";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import Header from "@/components/Header";
import { useParams, useRouter } from "next/navigation";
import styles from "@/styles/boarddetails.module.css";
import { useEffect, useState } from "react";
import { ApiService } from "@/api/apiService";
import { Preferences } from "@/types/user";
import dayjs from "dayjs";

type SavedPlace = {
  id: number;
  externalPlaceId: string;
  name: string;
  address: string;
  rating: number | null;
  photoReference?: string | null;
  addedByUserId: number;
};

type ActivityLog = {
  id: number;
  userId: number;
  action: string;
};

type BoardDetail = {
  id: number;
  name: string;
  location: string;
  startDate: string | null;
  endDate: string | null;
  ownerId: number;
  memberIds?: number[];
  activityLogs?: ActivityLog[];
};

const RemoveConfirmModal: React.FC<{
      placeName: string;
      onConfirm: () => void;
      onCancel: () => void;
    }> = ({ placeName, onConfirm, onCancel }) => (
      <div
        onClick={onCancel}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(4px)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#fff",
            borderRadius: "16px",
            padding: "28px 32px",
            maxWidth: "360px",
            width: "90%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            backgroundColor: "#ffe0e0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "22px",
          }}>
            🗑️
          </div>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0d1b8e" }}>
            Remove place
          </h3>
          <p style={{ margin: 0, fontSize: "13px", color: "#555", lineHeight: "1.5" }}>
            Are you sure you want to remove <strong>{placeName}</strong> from the board?
          </p>
          <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
            <button
              onClick={onCancel}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "10px",
                border: "1.5px solid #ddd",
                backgroundColor: "#fff",
                color: "#555",
                fontWeight: "600",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: "#e53935",
                color: "#fff",
                fontWeight: "600",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    );



const TravelBoardPage: React.FC = () => {
  const isAllowed = useProtectedRoute();
  const { id } = useParams();
  const router = useRouter();
  const apiService = new ApiService();

  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [memberPictures, setMemberPictures] = useState<Record<number, string | null>>({});
  const [memberUsernames, setMemberUsernames] = useState<Record<number, string>>({}); 
  const [isRemoveMode, setIsRemoveMode] = useState(false);
  const [placeToRemove, setPlaceToRemove] = useState<SavedPlace | null>(null);

  const handleRemovePlace = async () => {
    if (!placeToRemove) return;
    try {
      await apiService.delete(`/travelboards/${id}/places/${placeToRemove.id}`);
      setSavedPlaces((prev) => prev.filter((p) => p.id !== placeToRemove.id));
      const updatedBoard = await apiService.get<BoardDetail>(`/travelboards/${id}`);
      setBoard(updatedBoard);
    } catch (err) {
      console.error("Could not remove place:", err);
    } finally {
      setPlaceToRemove(null);
    }
  };

  const PlaceImage = ({ place }: { place: SavedPlace }) => {
    const [imgError, setImgError] = useState(false);
    const photoUrl = place.photoReference && !imgError
      ? `https://places.googleapis.com/v1/${place.photoReference}/media?maxWidthPx=400&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      : null;

    return (
      <>
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={place.name}
            onError={() => setImgError(true)}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "#eaf5fb", display: "flex", alignItems: "center", justifyContent: "center" }} />
        )}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 1,
          background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
          color: "#fff", fontSize: "10px", fontWeight: "600",
          padding: "16px 6px 6px", textAlign: "center", lineHeight: "1.2",
          overflow: "hidden", display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }}>
          {place.name}
        </div>
      </>
    );
  };

  useEffect(() => {
    console.log("isAllowed:", isAllowed);
    console.log("id:", id);

    if (!isAllowed || !id) return;

    console.log("FETCHING BOARD");

    const fetchData = async () => {
      try {
        console.log("CALLING /travelboards/" + id);

        const boardData = await apiService.get<BoardDetail>(
          `/travelboards/${id}`
        );

        console.log("BOARD DATA:", boardData);

        const places = await apiService.get<SavedPlace[]>(
          `/travelboards/${id}/places`
        );

        console.log("PLACES:", places);

        setBoard(boardData);
        setSavedPlaces(places);
      } catch (err) {
        console.error("Could not fetch board:", err);
      }
    };

    fetchData();
  }, [isAllowed, id]);
  useEffect(() => {
    if (!board) return;

    const placeUserIds = savedPlaces.map((p) => p.addedByUserId);
    const logUserIds = (board.activityLogs ?? []).map((l) => l.userId); // ← include log users

    const allIds = Array.from(new Set([
      board.ownerId,
      ...(board.memberIds ?? []),
      ...placeUserIds,
      ...logUserIds, // ← add
    ]));

    const idsToFetch = allIds.filter((uid) => !(uid in memberPictures));
    if (idsToFetch.length === 0) return;

    let cancelled = false;

    const fetchPics = async () => {
      const results = await Promise.all(
        idsToFetch.map(async (uid) => {
          try {
            const [prefs, user] = await Promise.all([
              apiService.get<Preferences>(`/users/${uid}/preferences`),
              apiService.get<{ id: number; username: string }>(`/users/${uid}`),
            ]);
            return [uid, prefs.profilePicture ?? null, user.username] as const;
          } catch {
            return [uid, null, null] as const;
          }
        })
      );

      if (cancelled) return;

      setMemberPictures((prev) => {
        const next = { ...prev };
        for (const [uid, pic] of results) next[uid] = pic;
        return next;
      });

      setMemberUsernames((prev) => {
        const next = { ...prev };
        for (const [uid, , username] of results) {
          if (username) next[uid] = username;
        }
        return next;
      });
    };

    fetchPics();
    return () => { cancelled = true; };
  }, [board, savedPlaces.length]);

  if (isAllowed === null || !isAllowed) return null;

  const allMemberIds = board
    ? Array.from(new Set([board.ownerId, ...(board.memberIds ?? [])]))
    : [];

  const AvatarImg = ({ userId }: { userId: number }) => {
    const pic = memberPictures[userId];
    return pic
      ? <img src={pic} alt="member" className={styles.avatar} />
      : <div className={styles.avatarFallback}>👤</div>;
  };


  const parseAction = (action: string): { verb: string; subject: string; color: string } => {
      if (action.startsWith("added ")) {
        return { verb: "added", subject: action.replace("added ", ""), color: "#2e7d32" };
      }
      if (action.startsWith("removed ")) {
        return { verb: "removed", subject: action.replace("removed ", ""), color: "#e53935" };
      }
      if (action.includes("joined")) {
        return { verb: "joined the board", subject: "", color: "#0d1b8e" };
      }
      return { verb: action, subject: "", color: "#555" };
    };

  return (
    <>
      <Header />
      <div className={styles.page} style={{ padding: "24px 70px", minHeight: "100vh", boxSizing: "border-box", overflow: "visible" }}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Travel Boards</h1>
          <button className={styles.backBtn} onClick={() => router.back()}>Back</button>
        </div>

        {board && (
          <div className={styles.boardCard}>
            {/* LEFT PANEL */}
            <div className={styles.leftPanel}>
              <div className={styles.boardTitleRow}>
                <span className={styles.boardCity}>{board.name}</span>
                {board.startDate && (
                  <span className={styles.boardDates}>
                    {dayjs(board.startDate).format("D MMM")}
                    {board.endDate && ` – ${dayjs(board.endDate).format("D MMM")}`}
                  </span>
                )}
                <div className={styles.collabSection}>
                  <span className={styles.collabLabel}>In collaboration with:</span>
                  <div className={styles.collabAvatars}>
                    {allMemberIds.slice(0, 5).map((uid) => (
                      <AvatarImg key={uid} userId={uid} />
                    ))}
                  </div>
                </div>
                <div className={styles.iconBtns}>
                  <button className={styles.iconBtn} onClick={() => router.push(`/travelboards/${id}/add`)}>
                    Add a place
                  </button>
                  <button
                    className={styles.iconBtn}
                    onClick={() => setIsRemoveMode(!isRemoveMode)}
                    style={isRemoveMode ? { backgroundColor: "#e53935", color: "#fff" } : {}}
                  >
                    {isRemoveMode ? "Done" : "Remove a place"}
                  </button>
                </div>
              </div>

               <p className={styles.sectionLabel}>Saved Places:</p>

              {placeToRemove && (
                <RemoveConfirmModal
                  placeName={placeToRemove.name}
                  onConfirm={handleRemovePlace}
                  onCancel={() => setPlaceToRemove(null)}
                />
              )}

              <div className={styles.placesGrid}>
                {savedPlaces.map((place) => {
                  const ownerPic = memberPictures[place.addedByUserId];
                  return (
                    <div key={place.id} className={styles.placeCard} style={{ position: "relative", overflow: "visible" }}>
                    <div style={{ position: "absolute", inset: 0, borderRadius: "12px", overflow: "hidden" }}>
                      <PlaceImage place={place} />
                    </div>
                    {ownerPic
                      ? <img src={ownerPic} alt="owner" className={styles.placeOwnerIcon} />
                      : <div className={styles.placeOwnerFallback}>👤</div>
                    }
                    {isRemoveMode && (
                      <button
                        onClick={() => setPlaceToRemove(place)}
                        style={{
                          position: "absolute",
                          top: "-8px",
                          left: "-8px",
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          background: "#555",
                          color: "white",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "16px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          zIndex: 10,
                        }}
                      >
                        −
                      </button>
                    )}
                  </div>
                  );
                })}
                {savedPlaces.length === 0 && <p>No places added yet.</p>}
              </div>
            </div>

            {/* DIVIDER */}
            <div className={styles.divider} />

            {/* RIGHT PANEL */}
            <div className={styles.rightPanel}>
            <p className={styles.sectionLabel}>Activities Log:</p>
            <div className={styles.activityList}>
              {(board.activityLogs ?? []).length === 0 && (
                <p style={{ color: "#888", fontSize: "13px" }}>No activity yet.</p>
              )}
              {(showAllLogs ? (board.activityLogs ?? []) : (board.activityLogs ?? []).slice(0, 6)).map((log) => {
                const pic = memberPictures[log.userId];
                const username = memberUsernames[log.userId] ?? `User ${log.userId}`;
                const { verb, subject, color } = parseAction(log.action);

                return (
                  <div key={log.id} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 0",
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                  }}>
                    {pic ? (
                      <img src={pic} alt={username} style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#e8e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>👤</div>
                    )}
                    <div style={{ fontSize: "12px", lineHeight: "1.5", color: "#333" }}>
                      <span style={{ fontWeight: "700", color: "#0d1b8e" }}>{username}</span>
                      {" "}
                      <span style={{ fontWeight: "600", color }}>{verb}</span>
                      {subject && <> <span style={{ color: "#555", fontStyle: "italic" }}>{subject}</span></>}
                    </div>
                  </div>
                );
              })}
              

              {(board.activityLogs ?? []).length > 6 && (
                <button
                  onClick={() => setShowAllLogs(!showAllLogs)}
                  style={{
                    marginTop: "8px",
                    background: "none",
                    border: "none",
                    color: "#0d1b8e",
                    fontWeight: "600",
                    fontSize: "12px",
                    cursor: "pointer",
                    padding: "4px 0",
                  }}
                >
                  {showAllLogs ? "Show less" : `See more (${(board.activityLogs ?? []).length - 8} more)`}
                </button>
              )}
            </div>
          </div>
          </div>
        )}
      </div>
    </>
  );
};

export default TravelBoardPage;