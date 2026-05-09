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

  useEffect(() => {
    if (!isAllowed || !id) return;

    const fetchData = async () => {
      try {
        const boardData = await apiService.get<BoardDetail>(`/travelboards/${id}`);
        const places = await apiService.get<SavedPlace[]>(`/travelboards/${id}/places`);

        console.log("BOARD:", boardData);
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
            const prefs = await apiService.get<Preferences>(
                `/users/${uid}/preferences`
            );
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

    return () => {
        cancelled = true;
    };
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

  return (
    <>
      <Header />
      <div className={styles.page}
  style={{
    padding: "24px 70px",
    minHeight: "100vh",
    boxSizing: "border-box",
    overflow: "visible",  // prevents clipping the header dropdown
  }}
>
        {/* Header */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Travel Boards</h1>
          <button className={styles.backBtn} onClick={() => router.back()}>
            Back
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
                  <span className={styles.collabLabel}>In collaboration with:</span>
                  <div className={styles.collabAvatars}>
                    {allMemberIds.slice(0, 5).map((uid) => (
                      <AvatarImg key={uid} userId={uid} />
                    ))}
                  </div>
                </div>

                <div className={styles.iconBtns}>
                  <button className={styles.iconBtn}>Add a place</button>
                  <button className={styles.iconBtn}>Remove a place</button>
                </div>
              </div>

              <p className={styles.sectionLabel}>Saved Places:</p>

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
          </div>
        )}
      </div>
    </>
  );
};

export default TravelBoardPage;