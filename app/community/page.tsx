"use client";

import {useProtectedRoute} from "@/hooks/useProtectedRoute";
import Header from "@/components/Header";
import styles from "@/styles/page.module.css";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User, Preferences } from "@/types/user";
import { App } from "antd";
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
    const [expandedBoard, setExpandedBoard] = useState<TravelBoard | null>(null);

    useEffect(() => {
        if (!storedUser.value?.id) return;

        const fetchFriendsData = async () => {
            setLoadingFriends(true);
            try {
                const prefs = await apiService.get<Preferences>(`/users/${storedUser.value?.id}/preferences`);
                if (!prefs.friends || prefs.friends.length === 0) {
                    setFriendsData([]);
                    return;
                }
                const friendsWithData = await Promise.all(
                    prefs.friends.map(async (friendId) => {
                        try {
                            const [friendUser, friendPrefs, friendBoards] = await Promise.all([
                                apiService.get<User>(`/users/${friendId}`),
                                apiService.get<Preferences>(`/users/${friendId}/preferences`).catch(() => null),
                                apiService.get<TravelBoard[]>(`/users/${friendId}/travelboards`).catch(() => []),
                            ]);
                            return {
                                id: String(friendId),
                                username: friendUser.username,
                                profilePicture: friendPrefs?.profilePicture ?? null,
                                bio: friendPrefs?.bio ?? null,
                                boards: Array.isArray(friendBoards) ? friendBoards : [],
                            };
                        } catch {
                            return null;
                        }
                    })
                );

                setFriendsData(friendsWithData.filter(Boolean) as FriendData[]);
            } catch {
                setFriendsData([]);
            } finally {
                setLoadingFriends(false);
            }
        };
        fetchFriendsData();
    }, [storedUser.value?.id]);

    useEffect(() => {
        const fetchPublicBoards = async () => {
            setLoadingPublic(true);
            try {
                const boards = await apiService.get<TravelBoard[]>("/travelboards/public");
                setPublicBoards(Array.isArray(boards) ? boards : []);
            } catch {
                setPublicBoards([]);
            } finally {
                setLoadingPublic(false);
            }
        };

        fetchPublicBoards();
    }, []);

    const handleJoinBoard = (board: TravelBoard) => {
        modal.confirm({
            title: "Join travel board",
            content: `Do you want to join "${board.name}"?`,
            okText: "Join",
            cancelText: "Cancel",
            onOk: async () => {
                try {
                    await apiService.post(`/travelboards/join?inviteCode=${board.inviteCode}`, {}),
                    message.success(`You joined "${board.name}"!`);
                } catch (error: unknown) {
                    if (error instanceof Error) {
                        message.error(error.message);
                    } else {
                        message.error("An unknown error occurred while joining board.");
                    }
                }
            },
        });
    };

    if (isAllowed === null) return null;
    if (!isAllowed) return null;

    const boardCardStyle: React.CSSProperties = {

    }

    if (expandedBoard) {
        return (
            <>
                <Header />
                <main
                    className={styles.main}
                    style={{ 
                            padding: "24px 70px",
                            minHeight: "100vh",
                            boxSizing: "border-box"
                        }}
                >
                    <div 
                        style={{
                            backgroundColor: "#76bdd6",
                            borderRadius: "16px",
                            padding: "32px",
                            minHeight: "70vh",
                        }}
                    >
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "24px"
                        }}
                        >
                            <h2 style={{
                                color: "#0d1b8e",
                                fontWeight: 700,
                                fontSize: "32px",
                                margin: 0
                            }}
                            >
                                {expandedBoard.name}
                            </h2>
                            <button
                                onClick={() => setExpandedBoard(null)}
                                style={{
                                    padding: "8px 24px",
                                    borderRadius: "20px",
                                    border: "none",
                                    background: "#0d1b83",
                                    color: "#ffffff",
                                    fontWeight: "14px",
                                    fontSize: "14px",
                                    fontFamily: "DM Sans",
                                    cursor: "pointer",
                                }}
                            >
                                Minimize
                            </button>
                        </div>
                        <div style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px"
                        }}
                        >
                            {expandedBoard.startDate && (
                                <p style={{
                                    color: "#0d1b8e", margin: 0
                                }}
                                >
                                    <strong>Dates:</strong> {expandedBoard.startDate} → {expandedBoard.endDate ?? "TBD"}
                                </p>
                            )}
                            <p style={{
                                color: "#0d1b8e",
                                margin: 0
                            }}
                            >
                                <strong>Privacy:</strong> {expandedBoard.privacy}
                            </p>
                            <p style={{
                                color: "#0d1b8e",
                                margin: 0
                            }}
                            >
                                <strong>Created:</strong> {expandedBoard.dateCreated}
                            </p>
                            <div style={{
                                marginTop: "24px",
                                display: "flex",
                                gap: "16px"
                            }}
                            >
                                <button
                                    onClick={() => handleJoinBoard(expandedBoard)}
                                    style={{
                                        padding: "10px 28px",
                                        borderRadius: "20px",
                                        border: "none",
                                        background: "#0d1b8e",
                                        color: "#ffffff",
                                        fontWeight: 600,
                                        fontSize: "14px",
                                        fontFamily: "DM Sans",
                                        cursor: "pointer",
                                    }}
                                >
                                    Join board
                                </button>
                                <button
                                    onClick={() => router.push(`/travelboards/${expandedBoard.id}`)}
                                    style={{
                                        padding: "10px 28px",
                                        borderRadius: "20px",
                                        border: "2px solid #0d1b8e",
                                        background: "transparent",
                                        color: "#0d1b8e",
                                        fontWeight: 600,
                                        fontSize: "14px",
                                        fontFamily: "DM Sans",
                                        cursor: "pointer",
                                    }}
                                >
                                    Open full page
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <Header />
            <main
                className={styles.main}
                style={{
                    padding: "24px 70px",
                    minHeight: "100vh",
                    boxSizing: "border-box"
                }}
            >
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "24px",
                    marginBottom: "24px"
                }}
                >
                    <h1 
                        style={{
                            color: "#0d1b8e",
                            fontWeight: 700,
                            fontSize: "48px",
                            fontFamily: "DM Sans",
                            margin: 0
                        }}
                    >
                        Community
                    </h1>
                    <button 
                        onClick={() => setActiveTab("friends")}
                        style={{
                            padding: "8px 24px",
                            borderRadius: "20px",
                            border: "2px solid #0d1b8e",
                            background: activeTab === "friends" ? "#0d1b8e" : "transparent",
                            color: activeTab === "friends" ? "#ffffff" : "#0d1b8e",
                            fontWeight: 600,
                            fontSize: "16px",
                            fontFamily: "DM Sans",
                            cursor: "pointer",
                        }}
                    >
                        Friends
                    </button>
                    <button
                        onClick={() => setActiveTab("all")}
                        style={{
                            padding: "8px 24px",
                            borderRadius: "20px",
                            border: "2px solid #0d1b8e",
                            background: activeTab === "all" ? "#0d1b8e" : "transparent",
                            color: activeTab === "all" ? "#ffffff" : "#0d1b8e",
                            fontWeight: 600,
                            fontSize: "16px",
                            fontFamily: "DM Sans",
                            cursor: "pointer",
                        }}
                    >
                        All
                    </button>
                </div>

                {activeTab === "friends" && (
                    <div 
                        style={{
                            backgroundColor: "#76bdd6",
                            borderRadius: "16px",
                            padding: "24px",
                            minHeight: "400px"
                        }}
                    >
                        {loadingFriends ? (
                            <p style={{ color: "#0d1b8e" }}>
                                Loading friends...
                            </p>
                        ) : friendsData.length === 0 ? (
                            <p style={{ color: "#0d1b8e" }}>
                                No friends added yet. Add friends in your preferences to see their activity here.
                            </p>
                        ) : (
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: `repeat(${friendsData.length}, 1fr)`,
                                    gap: 0,
                                    maxHeight: "600px",
                                    overflowY: "auto",
                                }}
                            >
                                {friendsData.map((friend, index) => (
                                    <div 
                                        key={friend.id}
                                        style={{
                                            padding: "0 24px",
                                            borderRight: 
                                                index < friendsData.length - 1 ? "1px solid #4a90c4" : "none",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "16px",
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {friend.profilePicture ? (
                        <img
                          src={friend.profilePicture}
                          alt={friend.username}
                          style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: "50%",
                            background: "#ccc",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 20,
                          }}
                        >
                          👤
                        </div>
                      )}
                      <button
                        onClick={() => router.push(`/users/${friend.id}`)}
                        style={{
                          padding: "6px 16px",
                          borderRadius: "20px",
                          border: "2px solid #0d1b8e",
                          background: "transparent",
                          color: "#0d1b8e",
                          fontWeight: 700,
                          fontSize: "16px",
                          fontFamily: "DM Sans",
                          cursor: "pointer",
                        }}
                      >
                        {friend.username}
                      </button>
                    </div>
                    
                    {friend.bio && (
                      <p style={{ color: "#0d1b8e", fontStyle: "italic", margin: 0, fontSize: "13px" }}>
                        {friend.bio}
                      </p>
                    )}

                    <div>
                      <p style={{ color: "#0d1b8e", fontWeight: 700, fontStyle: "italic", margin: "0 0 8px 0" }}>
                        Recent Travel Boards
                      </p>
                      {friend.boards.length === 0 ? (
                        <p style={{ color: "#0d1b8e", fontSize: "12px" }}>No boards yet.</p>
                      ) : (
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                          {friend.boards.slice(0, 3).map((board) => (
                            <div key={board.id} style={{ position: "relative" }}>
                              <div
                                style={boardCardStyle}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.backgroundColor = "#e8f4fd")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.backgroundColor = "#ffffff")
                                }
                              >
                                <span style={{ fontWeight: 600, color: "#0d1b8e" }}>
                                  {board.name}
                                </span>
                                {board.startDate && (
                                  <span style={{ color: "#666", fontSize: "10px" }}>
                                    {board.startDate}
                                  </span>
                                )}
                                <button
                                  onClick={() => setExpandedBoard(board)}
                                  style={{
                                    marginTop: "6px",
                                    padding: "2px 8px",
                                    borderRadius: "10px",
                                    border: "1px solid #0d1b8e",
                                    background: "transparent",
                                    color: "#0d1b8e",
                                    fontSize: "9px",
                                    cursor: "pointer",
                                    fontFamily: "DM Sans",
                                  }}
                                >
                                  See More
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        modal.confirm({
                          title: "Invite to travel board",
                          content: `Choose a travel board to invite ${friend.username} to. This feature requires selecting a board from your boards page.`,
                          okText: "Go to my boards",
                          cancelText: "Cancel",
                          onOk: () => router.push("/travelboards"),
                        });
                      }}
                      style={{
                        padding: "10px 0",
                        borderRadius: "20px",
                        border: "none",
                        background: "#0d1b8e",
                        color: "#ffffff",
                        fontWeight: 600,
                        fontSize: "14px",
                        fontFamily: "DM Sans",
                        cursor: "pointer",
                        width: "100%",
                        marginTop: "auto",
                      }}
                    >
                      Invite to travel board
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === "all" && (
          <div
            style={{
              backgroundColor: "#76bdd6",
              borderRadius: "16px",
              padding: "24px",
              minHeight: "400px",
            }}
          >
            {loadingPublic ? (
              <p style={{ color: "#0d1b8e" }}>Loading public boards...</p>
            ) : publicBoards.length === 0 ? (
              <p style={{ color: "#0d1b8e" }}>No public boards available yet.</p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: "16px",
                }}
              >
                {publicBoards.map((board) => (
                  <div
                    key={board.id}
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: "12px",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#e8f4fd")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "#ffffff")
                    }
                  >
                    <span
                      style={{ fontWeight: 700, color: "#0d1b8e", fontSize: "13px" }}
                    >
                      {board.name}
                    </span>
                    {board.startDate && (
                      <span style={{ color: "#666", fontSize: "11px" }}>
                        {board.startDate} → {board.endDate ?? "TBD"}
                      </span>
                    )}

                    <button
                      onClick={() => setExpandedBoard(board)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "10px",
                        border: "1px solid #0d1b8e",
                        background: "transparent",
                        color: "#0d1b8e",
                        fontSize: "11px",
                        cursor: "pointer",
                        fontFamily: "DM Sans",
                      }}
                    >
                      See More
                    </button>

                    <button
                      onClick={() => handleJoinBoard(board)}
                      style={{
                        padding: "6px 0",
                        borderRadius: "20px",
                        border: "none",
                        background: "#0d1b8e",
                        color: "#ffffff",
                        fontWeight: 600,
                        fontSize: "12px",
                        fontFamily: "DM Sans",
                        cursor: "pointer",
                        width: "100%",
                      }}
                    >
                      Join
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
};

const CommunityPage: React.FC = () => {
    return (
        <App>
            <CommunityPageContent />
        </App>
    );
};

export default CommunityPage;