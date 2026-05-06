"use client";

import React, { useEffect, useState } from "react";
import { Button, Modal, Select } from "antd";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import Header from "@/components/Header";
import { ApiService } from "@/api/apiService";
import { useRouter } from "next/navigation";
import styles from "./community.module.css";

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

type Friend = {
  id: number;
  username: string;
  avatar: string | null;
  bio: string | null;
  travelBoards: TravelBoard[];
};

const CommunityPage: React.FC = () => {
  const isAllowed = useProtectedRoute();
  const apiService = new ApiService();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"friends" | "all">("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteTargetFriend, setInviteTargetFriend] = useState<Friend | null>(null);
  const [myBoards, setMyBoards] = useState<TravelBoard[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);

  useEffect(() => {
    if (!isAllowed) return;
    fetchFriends();
  }, [isAllowed]);

  const fetchFriends = async () => {
    setLoading(true);
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
            } catch { /* ignore */ }
          })
      );

      const friendUsers = allUsers.filter((u) => mutualIds.has(Number(u.id)));

      const friendData = await Promise.all(
        friendUsers.map(async (u) => {
          let avatar: string | null = null;
          let bio: string | null = null;
          let travelBoards: TravelBoard[] = [];

          try {
            const prefs = await apiService.get<{ profilePicture?: string | null; bio?: string | null }>(`/users/${u.id}/preferences`);
            avatar = prefs.profilePicture ?? null;
            bio = prefs.bio ?? null;
          } catch { /* ignore */ }

          try {
            const allBoards = await apiService.get<TravelBoard[]>("/travelboards");
            travelBoards = allBoards.filter((b) => {
              const isOwner = Number(b.ownerId) === Number(u.id);
              const isMember = (b.memberIds ?? []).map(Number).includes(Number(u.id));
              const visible = b.privacy === "FRIENDS" || b.privacy === "PUBLIC";
              return (isOwner || isMember) && visible;
            });
          } catch { /* ignore */ }

          return { id: Number(u.id), username: u.username, avatar, bio, travelBoards };
        })
      );

      setFriends(friendData);
    } catch (err) {
      console.error("Could not fetch friends:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInvite = async (friend: Friend) => {
    setInviteTargetFriend(friend);
    setSelectedBoardId(null);
    setIsInviteModalOpen(true);

    try {
      const data = await apiService.get<TravelBoard[]>("/travelboards");
      const storedUser = localStorage.getItem("user");
      const parsedUser = storedUser ? JSON.parse(storedUser) as { id?: number } : {};
      const myId = Number(parsedUser.id);
      setMyBoards(data.filter((b) => Number(b.ownerId) === myId));
    } catch {
      setMyBoards([]);
    }
  };

  if (isAllowed === null) return null;
  if (!isAllowed) return null;

  return (
    <>
      <Header />
      <div className={styles.page}>
        <div className={styles.container}>

          {/* Title + Tabs */}
          <div className={styles.headerRow}>
            <h1 className={styles.title}>Community</h1>
            <div className={styles.tabs}>
              <Button
                className={`${styles.tab} ${activeTab === "friends" ? styles.tabActive : ""}`}
                onClick={() => setActiveTab("friends")}
              >
                Friends
              </Button>
              <Button
                className={`${styles.tab} ${activeTab === "all" ? styles.tabActive : ""}`}
                onClick={() => setActiveTab("all")}
              >
                All
              </Button>
            </div>
          </div>

          {/* Friends tab */}
          {activeTab === "friends" && (
            <>
              {loading ? (
                <div className={styles.empty}>Loading friends...</div>
              ) : friends.length === 0 ? (
                <div className={styles.empty}>
                  <p>No friends yet.</p>
                  <p>Add friends to see them here!</p>
                </div>
              ) : (
                <div className={styles.friendsGrid}>
                  {friends.map((friend) => (
                    <div key={friend.id} className={styles.friendCard}>

                      <div className={styles.friendHeader}>
                        {friend.avatar ? (
                          <img src={friend.avatar} alt={friend.username} className={styles.avatar} />
                        ) : (
                          <div className={styles.avatarFallback}>👤</div>
                        )}
                        <span className={styles.username}>{friend.username}</span>
                      </div>

                      <p className={styles.bio}>{friend.bio || ""}</p>

                      <p className={styles.sectionLabel}>Recent Travel Boards</p>
                      <div className={styles.placeholderGrid}>
                        {friend.travelBoards.length === 0
                          ? [0, 1, 2, 3, 4, 5].map((i) => <div key={i} className={styles.placeBox} />)
                          : friend.travelBoards.slice(0, 6).map((board) => (
                              <div
                                key={board.id}
                                className={styles.boardBox}
                                onClick={() => router.push(`/travelboards/${board.id}`)}
                                title={board.name}
                              >
                                <span className={styles.boardBoxName}>{board.name}</span>
                              </div>
                            ))}
                      </div>

                      <Button className={styles.inviteBtn} onClick={() => handleOpenInvite(friend)}>
                        Invite to travel board
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* All tab - empty */}
          {activeTab === "all" && (
            <div className={styles.empty}>
              <p>Coming soon.</p>
            </div>
          )}

        </div>
      </div>

      {/* Invite Modal - no logic yet */}
      <Modal
        title={
          <span style={{ color: "#3333cc", fontWeight: 800, fontSize: "1.2rem" }}>
            Invite {inviteTargetFriend?.username} to a board
          </span>
        }
        open={isInviteModalOpen}
        onCancel={() => setIsInviteModalOpen(false)}
        footer={
          <Button
            disabled
            style={{
              background: "#0B0696",
              color: "white",
              border: "none",
              borderRadius: "20px",
              opacity: 0.5,
              cursor: "not-allowed",
            }}
          >
            Send Invite
          </Button>
        }
      >
        <p style={{ marginBottom: "0.75rem", color: "#555" }}>Select one of your travel boards:</p>
        <Select
          placeholder="Choose a board..."
          style={{ width: "100%" }}
          value={selectedBoardId ?? undefined}
          onChange={(val) => setSelectedBoardId(val)}
          options={myBoards.map((b) => ({ label: b.name, value: b.id }))}
        />
        <p style={{ fontSize: "0.75rem", color: "#aaa", marginTop: "0.75rem" }}>
          Invite functionality coming soon.
        </p>
      </Modal>
    </>
  );
};

export default CommunityPage;