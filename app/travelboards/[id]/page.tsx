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
  name: string;
  imageUrl?: string | null;
  addedByUserId: number;
};

type ActivityLog = {
  id: number;
  userId: number;
  action: string; // e.g. 'Added "Big Ben" to the saved places'
};

type BoardDetail = {
  id: number;
  name: string;
  location: string;
  startDate: string | null;
  endDate: string | null;
  ownerId: number;
  memberIds?: number[];
  savedPlaces?: SavedPlace[];
  activityLogs?: ActivityLog[];
};

const TravelBoardPage: React.FC = () => {
  const isAllowed = useProtectedRoute();
  const { id } = useParams();
  const router = useRouter();
  const apiService = new ApiService();

  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [memberPictures, setMemberPictures] = useState<Record<number, string | null>>({});

  useEffect(() => {
    if (!isAllowed || !id) return;
    const fetchBoard = async () => {
        try {
        const allBoards = await apiService.get<BoardDetail[]>("/travelboards");
        const found = allBoards.find((b) => String(b.id) === String(id));
        if (found) setBoard(found);
        } catch (err) {
        console.error("Could not fetch board:", err);
        }
    };
    fetchBoard();
    }, [isAllowed, id]);

  // Fetch profile pictures for all members
  useEffect(() => {
    if (!board) return;
    const allIds = Array.from(new Set([board.ownerId, ...(board.memberIds ?? [])]));
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
  }, [board]);

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

  // Placeholder grid: use real saved places if available, fill rest with empty slots
  const savedPlaces = board?.savedPlaces ?? [];
  const totalSlots = Math.max(24, savedPlaces.length); // at least 4 rows × 6 cols

  return (
    <>
      <Header />
      <div className={styles.page}>
        {/* Page header */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Travel Boards</h1>
          <button className={styles.backBtn} onClick={() => router.back()}>Back</button>
        </div>

        {board && (
          <div className={styles.boardCard}>
            {/* ── LEFT PANEL ── */}
            <div className={styles.leftPanel}>
              {/* Title row */}
              <div className={styles.boardTitleRow}>
                <span className={styles.boardCity}>{board.name}</span>
                {board.startDate && (
                  <span className={styles.boardDates}>
                    {dayjs(board.startDate).format("D MMM")}
                    {board.endDate && ` – ${dayjs(board.endDate).format("D MMM")}`}
                  </span>
                )}
                {/* Collaborators */}
                <div className={styles.collabSection}>
                  <span className={styles.collabLabel}>In collaboration with:</span>
                  <div className={styles.collabAvatars}>
                    {allMemberIds.slice(0, 5).map((uid) => (
                      <AvatarImg key={uid} userId={uid} />
                    ))}
                  </div>
                </div>
                {/* +/− buttons */}
                <div className={styles.iconBtns}>
                  <button className={styles.iconBtn} onClick={() => console.log("Add place")}>Add a place</button>
                  <button className={styles.iconBtn} onClick={() => console.log("Remove place")}>Remove a place</button>
                </div>
              </div>

              <p className={styles.sectionLabel}>Saved Places:</p>

              {/* Places grid */}
              <div className={styles.placesGrid}>
                {Array.from({ length: totalSlots }).map((_, i) => {
                  const place = savedPlaces[i];
                  const ownerPic = place ? memberPictures[place.addedByUserId] : null;
                  return (
                    <div key={i} className={styles.placeCard}>
                      {place?.imageUrl && (
                        <img src={place.imageUrl} alt={place.name} className={styles.placeImg} />
                      )}
                      {place && (
                        ownerPic
                          ? <img src={ownerPic} alt="owner" className={styles.placeOwnerIcon} />
                          : <div className={styles.placeOwnerFallback}>👤</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── DIVIDER ── */}
            <div className={styles.divider} />

            {/* ── RIGHT PANEL: Activity Log ── */}
            <div className={styles.rightPanel}>
              <p className={styles.sectionLabel}>Activities Log:</p>
              <div className={styles.activityList}>
                {(board.activityLogs ?? []).map((log) => {
                  const pic = memberPictures[log.userId];
                  return (
                    <div key={log.id} className={styles.activityItem}>
                      {pic
                        ? <img src={pic} alt="user" className={styles.avatarFallback} style={{ objectFit: "cover" }} />
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