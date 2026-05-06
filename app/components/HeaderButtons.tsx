"use client";
import { useRouter, usePathname } from "next/navigation";
import { Button, Modal, App } from "antd";
import { BellOutlined } from "@ant-design/icons";
import { useEffect, useState, useRef } from "react";
import { User, Preferences } from "@/types/user";
import { useLogout } from "@/hooks/useLogout";
import { useApi } from "@/hooks/useApi";

type InvitationNotification = {
  id: number;
  boardId: number;
  senderId: number;
  receiverId: number;
  status: string;
  boardName: string;
  senderUsername: string;
};

export default function HeaderButtons() {
  const router = useRouter();
  const pathname = usePathname();
  const logout = useLogout();
  const apiService = useApi();
  const { message } = App.useApp();
  const [user, setUser] = useState<User | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isBellModalOpen, setIsBellModalOpen] = useState(false);
  const [joinNotifications, setJoinNotifications] = useState<InvitationNotification[]>([]);
  const [notifAvatars, setNotifAvatars] = useState<Record<number, string | null>>({});

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    if (storedUser?.id) {
      setUser(storedUser);

      const fetchProfilePicture = async () => {
        try {
          const prefs = await apiService.get<Preferences>(
            `/users/${storedUser.id}/preferences`
          );
          setProfilePicture(prefs.profilePicture ?? null);
        } catch {
          setProfilePicture(null);
        }
      };
      fetchProfilePicture();
    }
  }, [pathname]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch notifications when bell modal opens
  const handleOpenBellModal = async () => {
    setIsBellModalOpen(true);
    try {
      const data = await apiService.get<InvitationNotification[]>("/invitations");
      setJoinNotifications(data);

      // fetch profile pictures for all senders in parallel
      const avatarEntries = await Promise.all(
        data.map(async (notif) => {
          try {
            const prefs = await apiService.get<{ profilePicture?: string | null }>(`/users/${notif.senderId}/preferences`);
            return [notif.senderId, prefs.profilePicture ?? null] as const;
          } catch {
            return [notif.senderId, null] as const;
          }
        })
      );
      setNotifAvatars(Object.fromEntries(avatarEntries));
    } catch {
      setJoinNotifications([]);
    }
  };

  const handleAcceptInvite = async (notif: InvitationNotification) => {
    try {
      await apiService.put(`/invitations/${notif.id}/accept`, {});
      setJoinNotifications((prev) => prev.filter((n) => n.id !== notif.id));
      message.success(`You joined "${notif.boardName}".`);
    } catch {
      message.error("Could not accept invite.");
    }
  };

  const handleDeclineInvite = async (notif: InvitationNotification) => {
    try {
      await apiService.put(`/invitations/${notif.id}/decline`, {});
      setJoinNotifications((prev) => prev.filter((n) => n.id !== notif.id));
      message.success(`You declined the invitation to "${notif.boardName}".`);
    } catch {
      message.error("Could not decline invite.");
    }
  };

  if (pathname === "/") {
    return (
      <div style={{ display: "flex", gap: "16px", marginLeft: "auto" }}>
        <Button
          onClick={() => router.push("/login")}
          style={{
            width: "106px",
            height: "50px",
            borderRadius: "40px",
            background: "white",
            border: "none",
            color: "black",
            fontSize: "32px",
            fontFamily: "DM Sans",
            fontWeight: 700,
          }}
        >
          Login
        </Button>
        <Button
          onClick={() => router.push("/register")}
          style={{
            height: "50px",
            borderRadius: "40px",
            background: "white",
            border: "none",
            color: "black",
            fontSize: "32px",
            fontFamily: "DM Sans",
            fontWeight: 700,
            padding: "0 16px",
          }}
        >
          Register
        </Button>
      </div>
    );
  }

  return (
    <div style={{ marginLeft: "auto", position: "relative" }} ref={menuRef}>
      {/* Profile picture + username — clickable */}
      <div
        style={{ display: "flex", alignItems: "center", gap: "16px", cursor: "pointer" }}
        onClick={() => setMenuOpen((prev) => !prev)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {user?.id && (
            <BellOutlined 
              onClick={(e) => {
                e.stopPropagation();
                handleOpenBellModal();
              }}
              style={{
                color: "white",
                fontSize: "24px",
                cursor: "pointer",
              }}
            />
          )}
          <span style={{
            color: "white",
            fontSize: "36px",
            fontFamily: "DM Sans",
            fontWeight: 700,
          }}>
            {user?.username ?? ""}
          </span>
        </div>
        {profilePicture ? (
          <img
            src={profilePicture}
            alt={user?.username ?? ""}
            style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover" }}
          />
        ) : (
          <div style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "#ccc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "32px",
          }}>
            👤
          </div>
        )}
      </div>

      {/* Dropdown menu */}
      {menuOpen && (
        <div style={{
          position: "absolute",
          top: "100px",
          right: 0,
          width: "260px",
          background: "white",
          borderRadius: "16px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          zIndex: 2000,
          overflow: "hidden",
        }}>
          {/* Menu items */}
          {[
            { label: "Countries Overview", path: `/countryOverview` },
            { label: "Saved Places", path: `/places` },
            { label: "Travel boards", path: `/travelboards` },
            { label: "Community", path: `/community` },//need to change these paths once the pages are implemented
            { label: "Posts", path: `/posts` },//need to change these paths once the pages are implemented
            { label: "Settings", path: `/settings` },//need to change these paths once the pages are implemented
          ].map((item) => (
            <div
              key={item.label}
              onClick={() => { router.push(item.path); setMenuOpen(false); }}
              style={{
                padding: "16px 24px",
                fontSize: "18px",
                fontFamily: "DM Sans",
                fontWeight: 600,
                color: "#0B0696",
                cursor: "pointer",
                borderBottom: "1px solid #f0f0f0",
                textAlign: "center",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f4f4f4")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
            >
              {item.label}
            </div>
          ))}

          {/* Logout */}
          <div style={{ padding: "16px", display: "flex", justifyContent: "center" }}>
            <button
              onClick={logout}
              style={{
                padding: "10px 32px",
                borderRadius: "40px",
                border: "none",
                background: "#0B0696",
                color: "white",
                fontSize: "18px",
                fontFamily: "DM Sans",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Bell Notifications Modal */}
      <Modal
        title={<span style={{ color: "#0B0696", fontWeight: 800, fontSize: "1.4rem" }}>Notifications</span>}
        open={isBellModalOpen}
        onCancel={() => setIsBellModalOpen(false)}
        footer={null}
      >
        {/* Friend Requests section */}
        <p style={{ color: "#0B0696", fontWeight: 700, fontSize: "1rem", marginBottom: "0.75rem" }}>Friend Requests</p>
        <p style={{ color: "#030000", fontSize: "0.9rem", marginBottom: "1.5rem" }}>Coming soon...</p>

        {/* Travelboard Notifications section */}
        <p style={{ color: "#0B0696", fontWeight: 700, fontSize: "1rem", marginBottom: "0.75rem" }}>Travelboard Invitations</p>

        {joinNotifications.length === 0 ? (
          <p style={{ color: "#030000", fontSize: "0.9rem", marginBottom: "1.5rem" }}>No pending invitations.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
            {joinNotifications.map((notif) => (
              <div key={notif.id} style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                background: "#f4ebeb", borderRadius: "30px", padding: "0.5rem 1rem"
              }}>
                {notifAvatars[notif.senderId] ? (
                  <img
                    src={notifAvatars[notif.senderId]!}
                    alt={notif.senderUsername}
                    style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                  />
                ) : (
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "50%",
                    background: "#d6cece", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                  }}>👤</div>
                )}
                <span style={{ flex: 1, fontSize: "0.9rem", fontStyle: "italic" }}>
                  <strong>{notif.senderUsername}</strong> invited you to &quot;{notif.boardName}&quot;
                </span>
                <Button
                  size="small"
                  onClick={() => handleAcceptInvite(notif)}
                  style={{ background: "#0B0696", color: "white", border: "none", borderRadius: "20px" }}
                >Accept</Button>
                <Button
                  size="small"
                  onClick={() => handleDeclineInvite(notif)}
                  style={{ background: "#0B0696", color: "white", border: "none", borderRadius: "20px" }}
                >Decline</Button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}