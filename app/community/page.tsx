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

interface FriendData {
  id: string;
  username: string;
  profilePicture: string | null;
  bio: string | null;
  boards: TravelBoard[];
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

            return {
              id: String(f.id),
              username: f.username,
              profilePicture: prefs?.profilePicture ?? null,
              bio: prefs?.bio ?? null,
              boards: boards ?? [],
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
        setPublicBoards(boards ?? []);
      } finally {
        setLoadingPublic(false);
      }
    };

    fetchPublic();
  }, []);

  if (isAllowed === null || !isAllowed) return null;

  return (
    <>
      <Header />

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
            All
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

                    <div className={styles.boardPreviewGrid}>
                      {f.boards.slice(0, 3).map((b) => (
                        <div key={b.id} className={styles.miniBoard}>
                          {b.name}
                        </div>
                      ))}
                    </div>

                    <button className={styles.inviteBtn}>
                      Invite to travel board
                    </button>

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
            <div className={styles.allGrid}>
              {loadingPublic ? (
                <p>Loading...</p>
              ) : (
                publicBoards.map((b) => (
                  <div key={b.id} className={styles.publicCard}>
                    <h3>{b.name}</h3>
                    <p>{b.privacy}</p>

                    <button className={styles.joinBtn}>Join</button>
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