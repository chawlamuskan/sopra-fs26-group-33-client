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

  const TravelBoardPage: React.FC = () => {
    const isAllowed = useProtectedRoute();
    const { id } = useParams();
    const router = useRouter();
    const apiService = new ApiService();

    const [board, setBoard] = useState<BoardDetail | null>(null);
    const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
    const [memberPictures, setMemberPictures] = useState<Record<number, string | null>>({});
    const [accessDenied, setAccessDenied] = useState(false);

    // track if user came from community page
    const [fromCommunity, setFromCommunity] = useState(false);

    // track current user ID and membership to show only allowed page content 
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [isMember, setIsMember] = useState(false);

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
                objectFit: "cover",
              }}
            />
          ) : (
            <div style={{
              position: "absolute",
              inset: 0,
              background: "#eaf5fb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }} />
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
          }}>
            {place.name}
          </div>
        </>
      );
    };
    
    // get current user from localStorage
    useEffect(() => {
      const stored = localStorage.getItem("user");
      if (stored) {
        try {
          const user = JSON.parse(stored);
          setCurrentUserId(Number(user.id));
        } catch {
          setCurrentUserId(null);
        }
      }
      // check if came from community page
      const came = sessionStorage.getItem("fromCommunity") === "true";
      setFromCommunity(came);
      // clear it so it doesn't persist on refresh
      sessionStorage.removeItem("fromCommunity");
    }, []);

    useEffect(() => {
      if (!isAllowed || !id) return;

      const fetchData = async () => {
        try {
          // first try the normal endpoint (works for members)
          const boardData = await apiService.get<BoardDetail>(`/travelboards/${id}`);
          const dto = boardData as BoardDetail & { memberIds?: number[] };
          console.log("Board data:", boardData);
          console.log("Member IDs from backend:", dto.memberIds);
          setBoard(dto);

          // fetch places — available to all logged-in users
          try {
            const places = await apiService.get<SavedPlace[]>(`/travelboards/${id}/places`);
            setSavedPlaces(places);
          } catch {
            // places might be restricted — show empty
            setSavedPlaces([]);
          }

        } catch (err: unknown) {
          const appError = err as { status?: number };
          console.log("Main endpoint failed with status:", appError.status);
          if (appError.status === 401 || appError.status === 403) {
            console.log("Trying public endpoint...");
            // not a member — try the public endpoint
            try {
              const boardData = await apiService.get<BoardDetail>(`/travelboards/${id}/public`);
              console.log("Public board data:", boardData);
              setBoard(boardData);
              setIsMember(false); // explicitly not a member

              // try to fetch places for public board
              try {
                const places = await apiService.get<SavedPlace[]>(
                    `/travelboards/${id}/places`
                );
                setSavedPlaces(places);
              } catch {
                setSavedPlaces([]);
              }
            } catch (publicErr: unknown) {
              const publicError = publicErr as { status?: number };
              if (publicError.status === 403) {
                // private board and not a member
                setAccessDenied(true);
              } else {
                console.error("Could not fetch public board:", publicErr);
              }
            }
          } else {
            console.error("Could not fetch board:", err);
          }
        }
    };
      fetchData();
    }, [isAllowed, id]);

    // check membership once board and currentUserId are known
    useEffect(() => {
    if (!board || currentUserId === null) return;

      const allMembers = [board.ownerId, ...(board.memberIds ?? [])];
      console.log("All member IDs:", allMembers);
      console.log("Current user ID:", currentUserId);
      const memberStatus = allMembers.includes(currentUserId);
      console.log("Is member:", memberStatus);
      setIsMember(memberStatus);
    }, [board, currentUserId]);

    useEffect(() => {
      if (!board) return;

      const placeUserIds = savedPlaces.map((p) => p.addedByUserId);

      const allIds = Array.from(
          new Set([
          board.ownerId,
          ...(board.memberIds ?? []),
          ...placeUserIds,
          ])
      );

      const idsToFetch = allIds.filter((uid) => !(uid in memberPictures));
      if (idsToFetch.length === 0) return;
      let cancelled = false;

      const fetchPics = async () => {
        const results = await Promise.all(
        idsToFetch.map(async (uid) => {
          try {
            const prefs = await apiService.get<Preferences>(`/users/${uid}/preferences`);
            return [uid, prefs.profilePicture ?? null] as const;
          } catch {
            return [uid, null] as const;
          }
        })
        );

        if (cancelled) return;
        setMemberPictures((prev) => {
          const next = { ...prev };
          for (const [uid, pic] of results) next[uid] = pic;
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
    // ACCESS DENIED VIEW (non-member trying to access private board) ─────────
    if (accessDenied) {
      return (
        <>
          <Header />
          <div className={styles.page}
            style={{
              padding: "24px 70px",
              minHeight: "100vh",
              boxSizing: "border-box",
              overflow: "visible",  // prevents clipping the header dropdown
            }}>
              {/* Header row */}
              <h1 className={styles.pageTitle}>Travel Boards</h1>
              {/* minimize button */}
              {fromCommunity && (
                <button className={styles.backBtn} onClick={() => router.back()}>
                  Minimize
                </button>
              )}
            </div>
            <div style={{
              backgroundColor: "#76bdd6",
              borderRadius: "16px",
              padding: "32px",
              textAlign: "center",
            }}>
              <p style={{ color: "#0d1b8e", fontSize: "18px", fontWeight: 600 }}>
                This is a private board.
              </p>
              <p style={{ color: "#0d1b8e", fontSize: "14px" }}>
                You need to be a member to view this board&apos;s content.
              </p>
              <button
                onClick={() => router.back()}
                style={{
                  marginTop: "16px",
                  padding: "10px 28px",
                  borderRadius: "20px",
                  border: "none",
                  background: "#0d1b8e",
                  color: "#ffffff",
                  fontWeight: 600,
                  fontFamily: "DM Sans",
                  cursor: "pointer",
                }}
              >
                Go back
              </button>
            </div>
        </>
      );
    }
  
    // ── MAIN VIEW ─────────────────────────────────────────────────────────────
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
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Travel Boards</h1>
            {/* minimize only if from community, otherwise show Back */}
            <button className={styles.backBtn} onClick={() => router.back()}>
              {fromCommunity ? "Minimize" : "Back"}
            </button>
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

                    {/* Members */}
                    <div className={styles.collabSection}>
                      <span className={styles.collabLabel}>
                        {isMember ? "In collaboration with:" : "Created by:"}
                      </span>

                      <div className={styles.collabAvatars}>
                        {(isMember
                          ? allMemberIds.slice(0, 5)
                          : [board.ownerId]
                        ).map((uid) => (
                          <AvatarImg key={uid} userId={uid} />
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* only show add/remove buttons to members */}
                  {!isMember && (
                    <div
                      style={{
                        marginTop: "16px",
                        marginBottom: "16px",
                        padding: "12px 16px",
                        backgroundColor: "#e8f4fd",
                        borderRadius: "10px",
                        color: "#0d1b8e",
                        fontSize: "13px",
                        lineHeight: "1.5",
                      }}
                    >
                      You are viewing this board as a guest. Join the board to add or remove places.
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      width: "100%",
                      marginBottom: "14px",
                    }}
                  >
                    <p
                      className={styles.sectionLabel}
                      style={{
                        margin: 0,
                        textAlign: "left",
                      }}
                    >
                      Saved Places:
                    </p>

                    {isMember && (
                      <div className={styles.iconBtns}>
                        <button className={styles.iconBtn}>Add a place</button>
                        <button className={styles.iconBtn}>Remove a place</button>
                      </div>
                    )}
                  </div>
                  <div className={styles.placesGrid}>
                    {savedPlaces.map((place) => {
                      const ownerPic = memberPictures[place.addedByUserId];
                      return (
                        <div key={place.id} className={styles.placeCard}>
                          <PlaceImage place={place} />
                          {ownerPic ? (
                            <img src={ownerPic} alt="owner" className={styles.placeOwnerIcon} />
                          ) : (
                            <div className={styles.placeOwnerFallback}>👤</div>
                          )}
                      </div>
                      );
                    })}

                    {savedPlaces.length === 0 && (
                      <p>No places added yet.</p>
                    )}
                  </div>
                </div>
                  
                {/* only show Divider/ActivityLog to members */}
                {isMember ? (
                  <>
                    {/* DIVIDER */}
                    <div className={styles.divider} />
                    {/* RIGHT PANEL */}
                    <div className={styles.rightPanel}>
                      <p className={styles.sectionLabel}>Activities Log:</p>
                      <div className={styles.activityList}>
                        {(board.activityLogs ?? []).map((log) => {
                          const pic = memberPictures[log.userId];
                          return (
                            <div key={log.id} className={styles.activityItem}>
                              {pic
                                ? <img src={pic} className={styles.avatarFallback} />
                                : <div className={styles.avatarFallback}>👤</div>
                              }
                              <span className={styles.activityText}>{log.action}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </>
    );
};

export default TravelBoardPage;