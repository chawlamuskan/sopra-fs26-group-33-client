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
import InfoButton from "@/components/InfoButton";

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
  const [publicBoards, setPublicBoards] = useState<TravelBoard[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(true);
  const [memberProfilePictures, setMemberProfilePictures] = useState<Record<number, string | null>>({});
  const [publicBoardsWithMembers, setPublicBoardsWithMembers] = useState<FriendBoard[]>([]);
  const [showMoreFriends, setShowMoreFriends] = useState(false);
  const [showMorePublic, setShowMorePublic] = useState(false);  

  useEffect(() => {
    if (!storedUser.value?.id) return;

    const fetchFriends = async () => {
      setLoadingFriends(true);
      try {
        const friends = await apiService.get<User[]>(`/friends`);

        const enriched = await Promise.all(
          friends.map(async (f) => {
            const boards = await apiService.get<TravelBoard[]>(
              `/users/${f.id}/travelboards`
            );

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
              username: f.username,
              profilePicture: prefs?.profilePicture ?? null,
              bio: prefs?.bio ?? null,
              boards: boardsWithPlaces,
            };
          })
        );

        setFriendsData(enriched);
      } finally {
        setLoadingFriends(false);
      }
    };

    fetchFriends();
  }, [storedUser.value?.id]);

  useEffect(() => {
    const fetchPublic = async () => {
      setLoadingPublic(true);
      try {
        const boards = await apiService.get<TravelBoard[]>(
          "/travelboards/public"
        );

        const enriched: FriendBoard[] = await Promise.all(
          boards.map(async (b) => {
            try {
              const members = await apiService.get<number[]>(
                `/travelboards/${b.id}/members`
              );

              return {
                ...b,
                memberIds: members ?? [],
                places: [],
              };
            } catch {
              return {
                ...b,
                memberIds: [],
                places: [],
              };
            }
          })
        );

        setPublicBoardsWithMembers(enriched);
      } finally {
        setLoadingPublic(false);
      }
    };

    fetchPublic();
  }, []);

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
      <InfoButton />

      <div className={styles.page}>
        <h1 className={styles.title}>Community</h1>

        {/* Tabs */}
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
            <div className={styles.friendsGrid}>
              {loadingFriends ? (
                <p>Loading...</p>
              ) : (
                friendsData.map((f, i) => (
                  <div key={f.id} className={styles.friendColumn}>
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
                        {f.username}
                      </button>
                    </div>

                    {f.bio && <p className={styles.bio}>{f.bio}</p>}

                    <div className={styles.sectionTitle}>
                      Recent Travel Boards
                    </div>

                    <div className={styles.friendBoards}>
                      {(f.boards.slice(0, showMoreFriends ? undefined : 2)).map((board) => (
                        <div key={board.id} className={styles.friendBoardCard}>
                          
                          {/* Board name */}
                          <div className={styles.friendBoardHeader}>
                            <span className={styles.friendBoardName}>{board.name}</span>

                            <button
                              className={`${styles.inviteBtn} ${styles.inviteBtnSmall}`}
                              onClick={() => {
                                message.info(`Request sent to join "${board.name}"`);
                              }}
                            >
                              Ask to join
                            </button>
                          </div>

                          {/* Members */}
                          <div className={styles.memberRow}>
                            <span className={styles.memberLabel}>
                              Board members:
                            </span>

                            <div className={styles.memberCircles}>
                              {[
                                board.ownerId,
                                ...(board.memberIds ?? [])
                              ]
                                .slice(0, 4)
                                .map((userId) => {
                                  const profilePicture = memberProfilePictures[userId];

                                  return profilePicture ? (
                                    <img
                                      key={userId}
                                      src={profilePicture}
                                      className={styles.memberCircleImg}
                                    />
                                  ) : (
                                    <div key={userId} className={styles.memberCircleFallback}>
                                      👤
                                    </div>
                                  );
                                })}

                              {[
                                board.ownerId,
                                ...(board.memberIds ?? [])
                              ].length > 4 && (
                                <div className={styles.memberMore}>
                                  +
                                  {[
                                    board.ownerId,
                                    ...(board.memberIds ?? [])
                                  ].length - 4}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Places preview */}
                          {/* Places preview */}
                          <div className={styles.placesGrid}>
                            {Array.from({ length: 3 }).map((_, idx) => {
                              const place = board.places?.[idx];

                              const photoUrl = place?.photoReference
                                ? `https://places.googleapis.com/v1/${place.photoReference}/media?maxWidthPx=200&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
                                : null;

                              return (
                                <div key={`place-${idx}`} className={styles.placeBox}>
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
                                    <div className={styles.placePlaceholder} />
                                  )}
                                </div>
                              );
                            })}
                          </div>

                        </div>
                      ))}
                    </div>
                    
                    {f.boards.length > 2 && (
                      <button
                        className={styles.seeMoreBtn}
                        onClick={() => setShowMoreFriends((prev) => !prev)}
                      >
                        {showMoreFriends ? "Show less" : "See more"}
                      </button>
                    )}
                    {i < friendsData.length - 1 && (
                      <div className={styles.separator} />
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ALL VIEW */}
          {activeTab === "all" && (
            <div className={styles.friendsGrid}>
              {loadingPublic ? (
                <p>Loading...</p>
              ) : (
                publicBoardsWithMembers
                  .slice(0, showMorePublic ? undefined : 2)
                  .map((board) => (
                  <div key={board.id} className={styles.friendColumn}>
                    
                    {/* Board Card wrapper (IMPORTANT: matches friends structure) */}
                    <div className={styles.friendBoardCard}>
                      
                      {/* Header */}
                      <div className={styles.friendBoardHeader}>
                        <span className={styles.friendBoardName}>
                          {board.name}
                        </span>

                        <button
                          className={`${styles.inviteBtn} ${styles.inviteBtnSmall}`}
                          onClick={() => {
                            message.info(`Request sent to join "${board.name}"`);
                          }}
                        >
                          Ask to Join
                        </button>
                      </div>

                      {/* Members row */}
                      <div className={styles.memberRow}>
                        <span className={styles.memberLabel}>
                          Board members:
                        </span>

                        <div className={styles.memberCircles}>
                          {[
                            board.ownerId,
                            ...(board.memberIds ?? [])
                          ]
                            .slice(0, 4)
                            .map((userId) => {
                              const profilePicture = memberProfilePictures[userId];

                              return profilePicture ? (
                                <img
                                  key={userId}
                                  src={profilePicture}
                                  className={styles.memberCircleImg}
                                />
                              ) : (
                                <div key={userId} className={styles.memberCircleFallback}>
                                  👤
                                </div>
                              );
                            })}
                        </div>
                      </div>

                      {/* 3 preview boxes */}
                      <div className={styles.placesGrid}>
                        {Array.from({ length: 3 }).map((_, idx) => (
                          <div key={`public-${board.id}-${idx}`} className={styles.placeBox}>
                            <div className={styles.placePlaceholder} />
                          </div>
                        ))}
                      </div>

                      {publicBoardsWithMembers.length > 2 && (
                        <button
                          className={styles.seeMoreBtn}
                          onClick={() => setShowMorePublic((prev) => !prev)}
                        >
                          {showMorePublic ? "Show less" : "See more"}
                        </button>
                      )}

                    </div>
                  </div>
                ))
              )}
            </div>
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