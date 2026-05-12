"use client";

import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import Header from "@/components/Header";
import styles from "@/styles/community.module.css";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User, Preferences } from "@/types/user";
import { App, Button } from "antd";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface TravelBoard {
  id: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  privacy: string;
  ownerId: number;
  inviteCode: string;
  dateCreated: string;
}

interface FriendBoard extends TravelBoard {
  memberIds?: number[];
  places?: { 
    id: number;
    name: string;
    photoReference: string | null 
  }[];
}

interface FriendData {
  id: string;
  name: string;
  username: string;
  profilePicture: string | null;
  bio: string | null;
  boards: FriendBoard[];
}

const CommunityPageContent: React.FC = () => {
  const isAllowed = useProtectedRoute();
  const apiService = useApi();
  const router = useRouter();
  const { message, modal } = App.useApp();
  const storedUser = useLocalStorage<User | null>("user", null);

  const [activeTab, setActiveTab] = useState<"friends" | "all">("friends");
  const [friendsData, setFriendsData] = useState<FriendData[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingPublic, setLoadingPublic] = useState(true);
  const [memberProfilePictures, setMemberProfilePictures] = useState<Record<number, string | null>>({});
  const [publicBoardsWithMembers, setPublicBoardsWithMembers] = useState<FriendBoard[]>([]);
  const [expandedPublic, setExpandedPublic] = useState<Record<number, boolean>>({});  

  const FriendColumns: FriendData[][] = [[], [], []];
  friendsData.forEach((friend, index) => {
    FriendColumns[index % 3].push(friend);
  });
  const PublicColumns: FriendBoard[][] = [[], [], []];
  publicBoardsWithMembers.forEach((board, index) => {
    PublicColumns[index % 3].push(board);
  });

  const requestJoinBoard = async (board: FriendBoard) => {
    try {
      await apiService.post(`/joinRequests/${board.id}`, {
        receiverId: board.ownerId,
      });
      message.success(`Request sent to join "${board.name}"`);
    } catch (error) {
      console.error("Error sending join request:", error);
      if (error instanceof Error) {
        message.error(error.message);
      } else {
        message.error("Failed to send join request. Please try again.");
      }
    }
  };
  
  useEffect(() => {
    if (!storedUser.value?.id) return;

    const fetchFriends = async () => {
      setLoadingFriends(true);
      try {
        const friends = await apiService.get<User[]>(`/friends`);

        const enriched = await Promise.all(
          friends.map(async (f) => {
            const boards = await apiService.get<FriendBoard[]>(`/travelboards/friends`);

            const prefs = await apiService
              .get<Preferences>(`/users/${f.id}/preferences`)
              .catch(() => null);

            const boardsWithPlaces: FriendBoard[] = await Promise.all(
              boards.map(async (b) => {
                try {
                  const places = await apiService.get<
                    { id: number; name: string; photoReference?: string | null }[]
                  >(`/travelboards/${b.id}/places`);

                  return {
                    ...b,
                    places: (places?? [])
                      .slice(0, 6)
                      .map((p)=>({
                        id: p.id,
                        name: p.name,
                        photoReference: p.photoReference ?? null,
                      })),
                  };
                } catch {
                  return {
                    ...b,
                    places: [],
                  };
                }
              })
            );

            return {
              id: String(f.id),
              name: f.name ?? f.username,
              username: f.username,
              profilePicture: prefs?.profilePicture ?? null,
              bio: prefs?.bio ?? null,
              boards: boardsWithPlaces,
            };
          })
        );

        setFriendsData(
          enriched.filter((f) => f.boards.length > 0)
        );
      } finally {
        setLoadingFriends(false);
      }
    };

    fetchFriends();
  }, [storedUser.value?.id]);

  useEffect(() => {
    const userId = storedUser.value?.id;
    if (!userId) return;

    const fetchPublic = async () => {
      setLoadingPublic(true);

      try {
        const boards = await apiService.get<FriendBoard[]>("/travelboards/public");

        const currentUserId = Number(userId);

        const cleanedBoards: FriendBoard[] = boards
          .filter((b) => b.ownerId !== currentUserId)
          .map((b) => ({
            ...b,
            memberIds: Array.isArray(b.memberIds) ? b.memberIds : [],
            places: [],
          }));

        setPublicBoardsWithMembers(cleanedBoards);
      } finally {
        setLoadingPublic(false);
      }
    };

    fetchPublic();
  }, [storedUser.value?.id]);

  useEffect(() => {
    if (!friendsData.length) return;

    const ids = Array.from(
      new Set(
        friendsData.flatMap((f) =>
          f.boards.flatMap((b) => [b.ownerId, ...(b.memberIds ?? [])])
        )
      )
    );

    const idsToFetch = ids.filter((id) => !(id in memberProfilePictures));

    if (idsToFetch.length === 0) return;

    let cancelled = false;

    const fetchPictures = async () => {
      const results = await Promise.all(
        idsToFetch.map(async (userId) => {
          try {
            const prefs = await apiService.get<Preferences>(
              `/users/${userId}/preferences`
            );
            return [userId, prefs.profilePicture ?? null] as const;
          } catch {
            return [userId, null] as const;
          }
        })
      );

      if (cancelled) return;

      setMemberProfilePictures((prev) => {
        const next = { ...prev };
        for (const [id, pic] of results) {
          next[id] = pic;
        }
        return next;
      });
    };

    fetchPictures();

    return () => {
      cancelled = true;
    };
  }, [friendsData]);

  if (isAllowed === null || !isAllowed) return null;

  return (
    <>
      <Header />

      <div className={styles.page}>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>Community</h1>

          <div className={styles.tabRow}>
            <button
              className={`${styles.tab} ${
                activeTab === "friends" ? styles.tabFriendsActive : ""
              }`}
              onClick={() => setActiveTab("friends")}
            >
              Friends
            </button>

            <button
              className={`${styles.tab} ${
                activeTab === "all" ? styles.tabAllActive : ""
              }`}
              onClick={() => setActiveTab("all")}
            >
              Public
            </button>
          </div>
        </div>

        {/* PANEL */}
        <div
          className={`${styles.panel} ${
            activeTab === "friends"
              ? styles.panelFriends
              : styles.panelAll
          }`}
        >
          {/* FRIENDS VIEW */}
          {activeTab === "friends" && (
            <>
              {loadingFriends ? (
                <p>Loading...</p>
              ) : friendsData.length === 0 ? (
                <div className={styles.emptyState}>
                  <p className={styles.emptyTitle}>
                    You don't have friends yet
                  </p>
                  <p className={styles.emptyText}>
                    Add friends in your profile settings to see their travel boards here!
                  </p>
                </div>
              ) : (
                <div className={styles.friendsGrid}>
                  {FriendColumns.map((col, colIndex) => (
                    <div key={colIndex} className={styles.friendColumnWrapper}>
                      {col.map((f) => (
                        <div key={f.id} className={styles.friendColumn}>

                          {/* HEADER */}
                          <div className={styles.friendHeader}>
                            {f.profilePicture ? (
                              <img
                                src={f.profilePicture}
                                className={styles.avatar}
                              />
                            ) : (
                              <div className={styles.avatarFallback}>👤</div>
                            )}

                            <button
                              className={styles.friendBtn}
                              onClick={() => router.push(`/users/${f.id}`)}
                            >
                              <div className={styles.friendTextBlock}>
                                <span className={styles.friendName}>
                                  {f.name}
                                </span>
                                <span className={styles.friendUsername}>
                                  @{f.username}
                                </span>
                              </div>
                            </button>
                          </div>

                          {/* BIO */}
                          {f.bio && <p className={styles.bio}>{f.bio}</p>}

                          {/* SECTION TITLE */}
                          <div className={styles.sectionTitle}>
                            Recent Travel Boards
                          </div>

                          {/* BOARDS */}
                          <div className={styles.friendBoards}>
                            {(f.boards).map((board) => (
                              <div key={board.id}
                                className={styles.friendBoardCard}
                              >
                                {/* HEADER */}
                                <div className={styles.friendBoardHeader}>
                                  <span className={styles.friendBoardName}>
                                    {board.name}
                                  </span>

                                  <button
                                    className={`${styles.inviteBtn} ${styles.inviteBtnSmall}`}
                                    onClick={() => requestJoinBoard(board)}
                                  >
                                    Ask to join
                                  </button>
                                </div>

                                {/* MEMBERS */}
                                <div className={styles.memberRow}>
                                  <span className={styles.memberLabel}>
                                    Board members:
                                  </span>

                                  <div className={styles.memberCircles}>
                                    {[
                                      board.ownerId,
                                      ...Array.isArray(board.memberIds) ? board.memberIds : []
                                    ]
                                      .slice(0, 4)
                                      .map((userId) => {
                                        const profilePicture =
                                          memberProfilePictures[userId];

                                        return profilePicture ? (
                                          <img
                                            key={userId}
                                            src={profilePicture}
                                            className={styles.memberCircleImg}
                                          />
                                        ) : (
                                          <div
                                            key={userId}
                                            className={styles.memberCircleFallback}
                                          >
                                            👤
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>

                                {/* PLACES */}
                                <div className={styles.placesGrid}>
                                  {Array.from({ length: 3 }).map((_, idx) => {
                                    const place = board.places?.[idx];

                                    const photoUrl = place?.photoReference
                                      ? `https://places.googleapis.com/v1/${place.photoReference}/media?maxWidthPx=200&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
                                      : null;

                                    return (
                                      <div
                                        key={`place-${board.id}-${idx}`}
                                        className={styles.placeBox}
                                      >
                                        {photoUrl ? (
                                          <img
                                            src={photoUrl}
                                            alt={place?.name ?? ""}
                                            style={{
                                              width: "100%",
                                              height: "100%",
                                              objectFit: "cover",
                                            }}
                                          />
                                        ) : (
                                          <div
                                            className={styles.placePlaceholder}
                                          />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* SEE MORE */}
                                <div className={styles.seeMoreRow}>
                                  <a
                                    className={styles.seeMore}
                                    
                                    onClick={() => {
                                      sessionStorage.setItem("fromCommunity", "true");
                                      router.push(`/travelboards/${board.id}`)}
                                    }
                                  >see more</a>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* PUBLIC VIEW */}
          {activeTab === "all" && (
              <>
                {loadingPublic ? (
                  <p>Loading...</p>
                ) : publicBoardsWithMembers.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p className={styles.emptyTitle}>
                      No public travel boards yet
                    </p>
                    <p className={styles.emptyText}>
                      Be the first to create or join a public travel board and start exploring together!
                    </p>
                  </div>
                ) : (
                  <div className={styles.friendsGrid}>
                    {PublicColumns.map((col, colIndex) => (
                      <div key={colIndex} className={styles.friendColumnWrapper}>
                        {col.map((board) => (
                          <div key={board.id} className={styles.friendColumn}>
                            {/* BOARD CARD */}
                            <div className={styles.friendBoardCard}>
                                
                              {/* HEADER */}
                              <div className={styles.friendBoardHeader}>
                                <span className={styles.friendBoardName}>
                                  {board.name}
                                </span>

                                <button
                                  className={`${styles.inviteBtn} ${styles.inviteBtnSmall}`}
                                  onClick={() => requestJoinBoard(board)}
                                >
                                  Ask to Join
                                </button>
                              </div>

                              {/* MEMBERS */}
                              <div className={styles.memberRow}>
                                <span className={styles.memberLabel}>
                                  Board members:
                                </span>

                                <div className={styles.memberCircles}>
                                  {[
                                    board.ownerId,
                                    ...Array.isArray(board.memberIds) ? board.memberIds : []
                                  ]
                                    .slice(0, 4)
                                    .map((userId) => {
                                      const profilePicture =
                                        memberProfilePictures[userId];

                                      return profilePicture ? (
                                        <img
                                          key={userId}
                                          src={profilePicture}
                                          className={styles.memberCircleImg}
                                        />
                                      ) : (
                                        <div
                                          key={userId}
                                          className={styles.memberCircleFallback}
                                        >
                                          👤
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>

                              {/* PLACES */}
                              <div className={styles.placesGrid}>
                                {Array.from({ length: 3 }).map((_, idx) => (
                                  <div
                                    key={`public-${board.id}-${idx}`}
                                    className={styles.placeBox}
                                  >
                                    <div className={styles.placePlaceholder} />
                                  </div>
                                ))}
                              </div>
                                
                              {/* SEE MORE */}
                                <div className={styles.seeMoreRow}>
                                  <a
                                    className={styles.seeMore}
                                    onClick={() => {
                                      sessionStorage.setItem("fromCommunity", "true");
                                      router.push(`/travelboards/${board.id}`);
                                    }}
                                  >see more</a>
                                </div>
                            </div>
                          </div>
                          ))};
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
        </div>
      </div>
    </>
  );
};

export default function CommunityPage() {
  return (
    <App>
      <CommunityPageContent />
    </App>
  );
}