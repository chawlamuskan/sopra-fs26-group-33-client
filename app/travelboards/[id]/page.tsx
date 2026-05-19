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
          <h3 style={{ 
            margin: 0, 
            fontSize: "16px", 
            fontWeight: "700", 
            color: "#0d1b8e" 
            }}>Remove place
          </h3>
          <p style={{ 
            margin: 0, 
            fontSize: "13px", 
            color: "#555", 
            lineHeight: "1.5" 
            }}>Are you sure you want to remove <strong>{placeName}</strong> from the board?
          </p>
          <div style={{ 
            display: "flex", 
            gap: "10px", 
            marginTop: "4px" 
            }}>
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
            >Cancel
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
            >Remove
            </button>
          </div>
        </div>
      </div>
    );

type AccessState =
  | "loading"
  | "owner"
  | "member"
  | "guest"
  | "denied";

const TravelBoardPage: React.FC = () => {
  const isAllowed = useProtectedRoute();
  const { id } = useParams();
  const router = useRouter();
  const apiService = new ApiService();

  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [accessState, setAccessState] = useState<AccessState>("loading");
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [memberPictures, setMemberPictures] = useState<Record<number, string | null>>({});
  const [memberUsernames, setMemberUsernames] = useState<Record<number, string>>({}); 
  const [isRemoveMode, setIsRemoveMode] = useState(false);
  const [placeToRemove, setPlaceToRemove] = useState<SavedPlace | null>(null);

  // track if user came from community page (otherwise travelboard)
  const [fromCommunity, setFromCommunity] = useState(false);
  
  const canEdit = accessState === "owner" || accessState === "member";
  const canViewActivityLog = accessState === "owner" || accessState === "member";

  useEffect(() => {
    const came = sessionStorage.getItem("fromCommunity") === "true";
    setFromCommunity(came);
    sessionStorage.removeItem("fromCommunity");
  }, []);

  useEffect(() => {
    if (!isAllowed || !id) return;
    let cancelled = false;

    const fetchData = async () => {
        try {
            // MEMBER ACCESS
            const boardData = await apiService.get<BoardDetail>(`/travelboards/${id}`);

            if (cancelled) return;
            setBoard(boardData);
            setAccessState("member");

            const places = await apiService.get<SavedPlace[]>(`/travelboards/${id}/places`);
            if (!cancelled) { setSavedPlaces(places); }

        } catch (err: any) {
            if (err.status === 401 || err.status === 403) {
                try {
                    const publicBoard = await apiService.get<BoardDetail>(`/travelboards/${id}/public`);
                    if (cancelled) return;
                    setBoard(publicBoard);
                    setAccessState("guest");

                    const places = await apiService.get<SavedPlace[]>(`/travelboards/${id}/places`);
                    if (!cancelled) { setSavedPlaces(places); }
                    
                } catch (e: any) {
                    if (e.status === 403) {
                        setAccessState("denied");
                    } else {
                        console.error(e);
                    }
                }
            } else {
                console.error("Could not fetch board:", err);
            }
        }
    };
    fetchData();
    return () => {
       cancelled = true; 
    };
  }, [isAllowed, id]);
  
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
            style={{ 
                position: "absolute", 
                inset: 0, 
                width: "100%", 
                height: "100%", 
                objectFit: "cover" 
            }}
          />
        ) : (
            <div style={{ 
                position: "absolute", 
                inset: 0, 
                background: "#eaf5fb", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center" 
                }} 
            />
        )}
        <div style={{
            position: "absolute", 
            bottom: 0, 
            left: 0, 
            right: 0, 
            zIndex: 1,
            background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
            color: "#fff", 
            fontSize: "10px", 
            fontWeight: "600",
            padding: "16px 6px 6px",
            textAlign: "center", 
            lineHeight: "1.2",
            overflow: "hidden", 
            display: "-webkit-box",
            WebkitLineClamp: 2, 
            WebkitBoxOrient: "vertical",
        }}>{place.name}
        </div>
      </>
    );
  };

  useEffect(() => {
    if (!board) return;

    const placeUserIds = savedPlaces.map((p) => p.addedByUserId);
    const logUserIds = (board.activityLogs ?? []).map((l) => l.userId);

    const allIds = Array.from(new Set([
      board.ownerId,
      ...(board.memberIds ?? []),
      ...placeUserIds,
      ...logUserIds,
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
            return [
                uid, 
                prefs.profilePicture ?? null, 
                user.username
            ] as const;
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
  }, [board, savedPlaces, apiService, memberPictures]);

  if (!isAllowed) return null;

  if (accessState === "loading") {
    return (
      <>
        <Header />
        <div className={styles.page}>
          <p>Loading board...</p>
        </div>
      </>
    );
  }

  if (accessState === "denied") {
    return (
      <>
        <Header />
        <div className={styles.page}>
          <h2>This board is private</h2>
        </div>
      </>
    );
  }
 
    const allMemberIds = board
        ? Array.from(new Set([board.ownerId, ...(board.memberIds ?? [])]))
        : [];

    const AvatarImg = ({ userId }: { userId: number }) => {
        const pic = memberPictures[userId];
        return pic
        ? <img src={pic} alt="member" className={styles.avatar} />
        : <div className={styles.avatarFallback}>👤</div>;
    };

    // ACTIVITY LOG text setup
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

        <div
        className={styles.page}
        style={{
            padding: "24px 70px",
            minHeight: "100vh",
            boxSizing: "border-box",
            overflow: "visible",
        }}
        >
        {/* HEADER */}
        <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Travel Boards</h1>

            <button
                style={{
                    border: "none", 
                    borderRadius: "999px", 
                    background: "#0d1b8e", 
                    color: "#ffffff", 
                    padding: "8px 14px", 
                    fontWeight: 600, 
                    cursor: "pointer", 
                    transition: "all 0.2s ease", 
                    boxShadow: "0 3px 10px rgba(0,0,0,0.15)",
                }}
                onClick={() => router.back()} 
                onMouseEnter={(e) => { 
                    e.currentTarget.style.transform = "scale(1.04)"; 
                    e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.25)"; 
                }} 
                onMouseLeave={(e) => { 
                    e.currentTarget.style.transform = "scale(1)"; 
                    e.currentTarget.style.boxShadow = "0 3px 10px rgba(0,0,0,0.15)";
                }}
            >
                Back
            </button>
        </div>

        {board && (
            <div className={styles.boardCard}>
            {/* LEFT PANEL */}
            <div className={styles.leftPanel}>
                <div className={styles.boardTitleRow}>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            width: "100%",
                            gap: "12px",
                        }}
                    >
                        {/* LEFT SIDE: TITLE + DATES */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "baseline",
                                gap: "8px",
                                minWidth: 0,
                                flex: 1,
                            }}
                        >
                        <span 
                            className={styles.boardCity}
                            style={{
                                whiteSpace: "nowrap",
                                lineHeight: 1,
                            }}
                        >
                            {board.name}
                        </span>

                        {board.startDate && (
                        <span 
                            className={styles.boardDates}
                            style={{
                                whiteSpace: "nowrap",
                                fontSize: "15px",
                                opacity: 0.8,
                                marginLeft: "10px",
                                marginBottom: "3px"
                            }}
                        >
                            {dayjs(board.startDate).format("D MMM")}
                            {board.endDate &&
                            ` – ${dayjs(board.endDate).format("D MMM")}`}
                        </span>
                        )}
                    </div>
                    {/* RIGHT SIDE: COLLABORATORS */}
                    <div 
                        className={styles.collabSection}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                        }}
                    >  
                        <span className={styles.collabLabel}> 
                            {canEdit 
                                ? "In collaboration with:" 
                                : "Created by:"} 
                        </span>
                        <div className={styles.collabAvatars}>
                            {(canEdit
                            ? Array.from(
                                new Set([board.ownerId, ...(board.memberIds ?? [])])
                                ).slice(0, 5)
                            : [board.ownerId]
                            ).map((uid) => (
                            <AvatarImg key={uid} userId={uid} />
                            ))}
                        </div>
                    </div>
                    </div>
                </div>

                {/* LOCATION */}
                {board.location && (
                    <div
                        style={{
                            display: "flex", 
                            alignItems: "center", 
                            gap: "8px", 
                            fontSize: "14px", 
                            fontWeight: 600, 
                            color: "#355c7d", 
                            marginTop: "10px",
                        }}
                    >
                        📍{" "}{board.location.split("|").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(", ")}
                    </div>
                )}

                {/* GUEST BANNER */}
                {!canEdit && (
                <div
                    style={{
                    marginTop: "16px",
                    padding: "10px 14px",
                    background: "#e8f4fd",
                    borderRadius: "10px",
                    fontSize: "13px",
                    color: "#0d1b8e",
                    }}
                >
                    You are viewing this board as a guest. Join the board to add or remove places.
                </div>
                )}

                {/* SAVED PLACES HEADER */}
                <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "20px",
                    marginBottom: "16px",
                }}
                >
                <p className={styles.sectionLabel}>Saved Places:</p>
                
                {placeToRemove && (
                    <RemoveConfirmModal
                        placeName={placeToRemove.name}
                        onCancel={() => setPlaceToRemove(null)}
                        onConfirm={handleRemovePlace}
                    />
                )}

                {/* ONLY MEMBERS CAN EDIT */}
                {canEdit && (
                    <div style={{ display: "flex", gap: "10px" }}>
                    <button
                        className={styles.iconBtn}
                        style={{ 
                            marginTop: 18, 
                            padding: "8px 14px", 
                            borderRadius: "10px", 
                            border: "1px solid #0d1b8e", 
                            background: "#fff", 
                            color: "#0d1b8e", 
                            fontWeight: 600, 
                            cursor: "pointer", 
                        }}
                        onClick={() =>router.push(`/travelboards/${id}/add`)}
                        onMouseEnter={(e) => { 
                            e.currentTarget.style.transform = "scale(1.04)"; 
                            e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.25)"; 
                        }} 
                        onMouseLeave={(e) => { 
                            e.currentTarget.style.transform = "scale(1)"; 
                            e.currentTarget.style.boxShadow = "0 3px 10px rgba(0,0,0,0.15)";
                        }}
                    >
                        Add a place
                    </button>

                    <button
                        className={styles.iconBtn}
                        onClick={() => setIsRemoveMode(!isRemoveMode)}
                        style={{ 
                            marginTop: 18, 
                            padding: "8px 14px", 
                            borderRadius: "10px", 
                            border: "1px solid #e53935", 
                            background: isRemoveMode ? "#e53935" : "#fff", 
                            color: isRemoveMode ? "#fff" : "#e53935", 
                            fontWeight: 600, 
                            cursor: "pointer", 
                        }}
                        onMouseEnter={(e) => { 
                            e.currentTarget.style.transform = "scale(1.04)"; 
                            e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.25)"; 
                        }} 
                        onMouseLeave={(e) => { 
                            e.currentTarget.style.transform = "scale(1)"; 
                            e.currentTarget.style.boxShadow = "0 3px 10px rgba(0,0,0,0.15)";
                        }}
                    >
                        {isRemoveMode ? "Done" : "Remove a place"}
                    </button>
                    </div>
                )}
                </div>

                {/* PLACES GRID (VISIBLE TO ALL) */}
                <div className={styles.placesGrid}>
                {savedPlaces.map((place) => (
                    <div
                        key={place.id}
                        className={styles.placeCard}
                        style={{ 
                            position: "relative",
                            overflow: "visible"
                        }}
                        onClick={() => {
                            if (isRemoveMode || !place.externalPlaceId) return;
                            router.push(
                                `/users/${board.ownerId}?placeId=${place.externalPlaceId}`
                            );
                        }}
                        onMouseEnter={(e) => { 
                            e.currentTarget.style.transform = "scale(1.04)"; 
                            e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.25)"; 
                        }} 
                        onMouseLeave={(e) => { 
                            e.currentTarget.style.transform = "scale(1)"; 
                            e.currentTarget.style.boxShadow = "0 3px 10px rgba(0,0,0,0.15)";
                        }}
                    >
                        <div 
                            style={{ 
                                position: "absolute", 
                                inset: 0, 
                                borderRadius: "12px", 
                                overflow: "hidden" 
                            }} >
                                <PlaceImage place={place} />
                        </div>
                    
                    {canEdit && isRemoveMode && (
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
                ))}

                {savedPlaces.length === 0 && <p>No places added yet.</p>}
                </div>
            </div>

            {/* RIGHT PANEL — ONLY MEMBERS SEE ACTIVITY */}
            {canEdit && (
                <>
                <div className={styles.divider} />

                <div className={styles.rightPanel}>
                    <p 
                        className={styles.sectionLabel}
                        style={{ marginBottom: "5px" }}
                    >
                        Activities Log:
                    </p>

                    <div className={styles.activityList}>
                    {(board.activityLogs ?? []).length === 0 && (
                        <p 
                            style={{ 
                                color: "#888",
                                fontSize: "13px" 
                            }}
                        >
                            No activity yet.
                        </p>
                    )}

                    {(
                        showAllLogs
                            ? board.activityLogs ?? []
                            : (board.activityLogs ?? []).slice(0, 6)
                        ).map((log) => {
                            const pic = memberPictures[log.userId];
                            const username = memberUsernames[log.userId] ?? `User ${log.userId}`;
                            const { verb, subject, color } = parseAction(log.action);

                            return (
                            <div
                                key={log.id}
                                style={{
                                    display: "flex", 
                                    alignItems: "center", 
                                    gap: "10px", 
                                    padding: "10px 0", 
                                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                                }}
                            >
                                {pic ? (
                                <img
                                    src={pic}
                                    style={{
                                        width: "32px", 
                                        height: "32px", 
                                        borderRadius: "50%", 
                                        objectFit: "cover", 
                                        flexShrink: 0
                                    }}
                                />
                                ) : (
                                    <div 
                                        style={{ 
                                            width: "32px", 
                                            height: "32px", 
                                            borderRadius: "50%", 
                                            backgroundColor: "#e8e8f0", 
                                            display: "flex", 
                                            alignItems: "center", 
                                            justifyContent: "center", 
                                            fontSize: "16px", 
                                            flexShrink: 0 
                                        }} 
                                    > 
                                        👤 
                                    </div>
                                )}
                                <div 
                                    style={{ 
                                        fontSize: "12px", 
                                        lineHeight: "1.5", 
                                        color: "#333" 
                                    }} 
                                > 
                                    <span 
                                        style={{ 
                                            fontWeight: "700", 
                                            color: "#0d1b8e" 
                                        }} 
                                    > 
                                        {username} 
                                    </span> 
                                    {" "} 
                                    <span 
                                        style={{ 
                                            fontWeight: "600", 
                                            color 
                                        }} 
                                    > 
                                        {verb} 
                                    </span> 
                                    {subject && ( 
                                        <> {" "} 
                                            <span 
                                                style={{ 
                                                    color: "#555", 
                                                    fontStyle: "italic" 
                                                }} 
                                            > 
                                                {subject} 
                                            </span> 
                                        </> 
                                    )}
                                </div>
                            </div>
                            );
                        }
                    )}
                    
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
                            {showAllLogs 
                                ? "Show less" 
                                : `See more (${
                                    (board.activityLogs ?? []).length - 6
                                } more)`
                            } 
                        </button> 
                    )}
                        
                    </div>
                </div>
                </>
            )}
            </div>
        )}
        </div>
    </>
    );
};

export default TravelBoardPage;