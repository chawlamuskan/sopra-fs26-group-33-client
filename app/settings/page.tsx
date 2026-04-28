"use client";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import Header from "@/components/Header";
import styles from "@/styles/page.module.css";
import { App, ConfigProvider, Form, Input, Select, theme } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useState, useRef, useEffect } from "react";
import { ApiService } from "@/api/apiService";
import { User } from "@/types/user";

interface FormFieldProps {
  bio: string;
  countries_visited: string[];
  countries_wishlist: string[];
}

interface CountryApiItem {
  name?: { common?: string };
}

const SettingsPageInner: React.FC = () => {
  const isAllowed = useProtectedRoute();
  const apiService = new ApiService();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [userId, setUserId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [countryOptions, setCountryOptions] = useState<{ label: string; value: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [initialPreferences, setInitialPreferences] = useState<{
    bio: string;
    profilePicture: string | null;
    visitedCountries: string[];
    wishlistCountries: string[];
  } | null>(null);

  // password change
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // friends search
  const [friendSearch, setFriendSearch] = useState("");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [userPreferences, setUserPreferences] = useState<Record<string, string | null>>({});
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [currentFriendIds, setCurrentFriendIds] = useState<number[]>([]);
  const [savingFriends, setSavingFriends] = useState(false);

  // get userId from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return;
    try {
      const parsedUser: User = JSON.parse(storedUser);
      if (parsedUser?.id != null) setUserId(String(parsedUser.id));
    } catch {
      // ignore
    }
  }, []);

  // load existing preferences
  useEffect(() => {
    if (!isAllowed || !userId) return;
    const loadPrefs = async () => {
      try {
        const prefs = await apiService.get<{
          bio?: string;
          profilePicture?: string;
          visitedCountries?: string[];
          wishlistCountries?: string[];
          friends?: number[];
        }>(`/users/${userId}/preferences`);

        const nextPreferences = {
          bio: prefs.bio ?? "",
          profilePicture: prefs.profilePicture ?? null,
          visitedCountries: prefs.visitedCountries ?? [],
          wishlistCountries: prefs.wishlistCountries ?? [],
        };

        form.setFieldsValue({
          bio: nextPreferences.bio,
          countries_visited: nextPreferences.visitedCountries,
          countries_wishlist: nextPreferences.wishlistCountries,
        });
        setInitialPreferences(nextPreferences);
        if (nextPreferences.profilePicture) {
          setPreviewUrl(nextPreferences.profilePicture);
          setImageBase64(nextPreferences.profilePicture);
        }

        // store existing friend ids so we can merge on save
        setCurrentFriendIds((prefs.friends ?? []).map(Number));
        setSelectedFriends((prefs.friends ?? []).map(String));
      } catch {
        // no preferences yet
      }
    };
    loadPrefs();
  }, [isAllowed, userId, form]);

  // fetch countries
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch("https://restcountries.com/v3.1/all?fields=name");
        const data: CountryApiItem[] = await res.json();
        const options = data
          .map((c) => c.name?.common)
          .filter((name): name is string => Boolean(name))
          .map((name) => ({ label: name, value: name }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setCountryOptions(options);
      } catch { /* silently fail */ }
    };
    fetchCountries();
  }, []);

  // fetch all users + their profile pictures for the friends search
  useEffect(() => {
    if (!isAllowed) return;
    const fetchUsers = async () => {
      try {
        const response = await apiService.get<User[]>("/users");
        setAllUsers(response);
        const preferencesMap: Record<string, string | null> = {};
        await Promise.all(
          response.map(async (user) => {
            try {
              const prefs = await apiService.get<{ profilePicture: string }>(
                `/users/${user.id}/preferences`
              );
              preferencesMap[user.id] = prefs.profilePicture ?? null;
            } catch {
              preferencesMap[user.id] = null;
            }
          })
        );
        setUserPreferences(preferencesMap);
      } catch { /* silently fail */ }
    };
    fetchUsers();
  }, [isAllowed]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const image = e.target.files?.[0];
    if (!image) return;
    if (!image.type.includes("image")) return alert("Only images are allowed!");
    if (image.size > 10_000_000) return alert("Maximum upload size is 10MB!");
    const reader = new FileReader();
    reader.readAsDataURL(image);
    reader.onload = () => {
      const result = reader.result as string;
      setPreviewUrl(result);
      setImageBase64(result);
    };
  };

  const handleSave = async (values: FormFieldProps) => {
    if (!userId) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (!initialPreferences || values.bio !== initialPreferences.bio)
        payload.bio = values.bio ?? null;
      if (!initialPreferences || imageBase64 !== initialPreferences.profilePicture)
        payload.profilePicture = imageBase64 ?? null;
      if (!initialPreferences || JSON.stringify(values.countries_visited ?? []) !== JSON.stringify(initialPreferences.visitedCountries))
        payload.visitedCountries = values.countries_visited ?? [];
      if (!initialPreferences || JSON.stringify(values.countries_wishlist ?? []) !== JSON.stringify(initialPreferences.wishlistCountries))
        payload.wishlistCountries = values.countries_wishlist ?? [];

      if (Object.keys(payload).length === 0) {
        message.info("No changes to save.");
        return;
      }
      await apiService.put(`/users/${userId}/preferences`, payload);
      message.success("Preferences updated successfully!");
      setInitialPreferences({
        bio: values.bio ?? "",
        profilePicture: imageBase64,
        visitedCountries: values.countries_visited ?? [],
        wishlistCountries: values.countries_wishlist ?? [],
      });
    } catch {
      message.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword.trim() || !newPassword.trim()) {
      message.warning("Please fill in both password fields.");
      return;
    }
    setSavingPassword(true);
    try {
      await apiService.put(`/users/${userId}/password`, {
        oldPassword,
        newPassword,
      });
      message.success("Password changed successfully!");
      setOldPassword("");
      setNewPassword("");
    } catch {
      message.error("Could not change password. Check your old password and try again.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveFriends = async () => {
    if (!userId) return;
    setSavingFriends(true);
    try {
      await apiService.put(`/users/${userId}/preferences`, {
        friends: selectedFriends.map(Number),
      });
      setCurrentFriendIds(selectedFriends.map(Number));
      message.success("Friends updated successfully!");
    } catch {
      message.error("Could not update friends.");
    } finally {
      setSavingFriends(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This cannot be undone.")) return;
    try {
      await apiService.delete(`/users/${userId}`);
      localStorage.clear();
      window.location.href = "/";
    } catch {
      message.error("Could not delete account.");
    }
  };

  const filteredUsers = allUsers.filter((user) => {
    return (
      user.username?.toLowerCase().includes(friendSearch.toLowerCase()) &&
      String(user.id) !== userId
    );
  });

  if (isAllowed === null || !isAllowed || !userId) return null;

  return (
    <>
      <Header />
      <main style={{
        padding: "24px 70px",
        minHeight: "100vh",
        boxSizing: "border-box",
        background: "#ffffff",
      }}>
        <h1 className={styles.title} style={{ margin: "0 0 32px 0" }}>
          Settings
        </h1>

        {/* ── Change your preferences ── */}
        <h2 style={{ color: "#000000", fontWeight: 700, fontSize: "28px", margin: "0 0 24px 0" }}>
          Change your preferences
        </h2>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          style={{ width: "100%", maxWidth: "900px", marginBottom: "48px" }}
        >
          {/* Row 1: Bio + Profile picture */}
          <div style={{ display: "flex", gap: "24px" }}>
            <Form.Item
              name="bio"
              label={<span style={{ fontWeight: 600, color: "#000", fontSize: "18px" }}>Write a bio</span>}
              style={{ flex: 1 }}
            >
              <Input.TextArea
                placeholder="Enter bio"
                rows={3}
                style={{
                  background: "#F4EBEB", border: "none",
                  borderRadius: "12px", resize: "none", fontSize: "16px",
                }}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontWeight: 600, color: "#000", fontSize: "18px" }}>Pick a profile picture</span>}
              style={{ flex: 1 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
                {previewUrl ? (
                  <img src={previewUrl} alt="Profile preview" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid #e0e0e0" }} />
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>👤</div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button type="button" onClick={() => fileInputRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 16px", borderRadius: "20px", border: "1px solid #e0e0e0", background: "#faf9f8", color: "#222", fontSize: "14px", cursor: "pointer", fontWeight: 500 }}>
                    <span>⬆</span> Upload
                  </button>
                  {previewUrl && (
                    <button type="button" onClick={() => { setPreviewUrl(null); setImageBase64(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 16px", borderRadius: "20px", border: "1px solid #ffd6d6", background: "#fff5f5", color: "#d9534f", fontSize: "14px", cursor: "pointer", fontWeight: 500 }}>
                      <span>✕</span> Remove
                    </button>
                  )}
                </div>
              </div>
            </Form.Item>
          </div>

          <Form.Item
            name="countries_visited"
            label={<span style={{ fontWeight: 600, color: "#000", fontSize: "18px" }}>Select countries you have visited</span>}
          >
            <Select mode="multiple" placeholder="Select countries" options={countryOptions} showSearch style={{ width: "100%", fontSize: "16px" }} styles={{ popup: { root: { background: "#ffffff" } } }} />
          </Form.Item>

          <Form.Item
            name="countries_wishlist"
            label={<span style={{ fontWeight: 600, color: "#000", fontSize: "18px" }}>Select countries you want to visit</span>}
          >
            <Select mode="multiple" placeholder="Select countries" options={countryOptions} showSearch style={{ width: "100%", fontSize: "16px" }} styles={{ popup: { root: { background: "#ffffff" } } }} />
          </Form.Item>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
            <button type="submit" disabled={saving} style={{ background: "#0B0696", color: "white", border: "none", borderRadius: "20px", padding: "10px 32px", fontSize: "16px", fontWeight: 600, cursor: "pointer" }}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </Form>

        {/* ── Change account details ── */}
        <h2 style={{ color: "#000000", fontWeight: 700, fontSize: "28px", margin: "0 0 24px 0" }}>
          Change account details
        </h2>

        <div style={{ width: "100%", maxWidth: "900px", marginBottom: "48px" }}>

          {/* Change password */}
          <span style={{ fontWeight: 600, color: "#000", fontSize: "18px" }}>Change password</span>
          <div style={{ display: "flex", gap: "24px", marginTop: "8px", marginBottom: "24px" }}>
            <Input.Password
              placeholder="Insert old password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              style={{ flex: 1, background: "#F4EBEB", border: "none", borderRadius: "12px", fontSize: "16px", height: "48px" }}
              variant="borderless"
            />
            <Input.Password
              placeholder="Insert new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ flex: 1, background: "#F4EBEB", border: "none", borderRadius: "12px", fontSize: "16px", height: "48px" }}
              variant="borderless"
            />
          </div>

          {/* Add friends */}
          <h2 style={{ color: "#000000", fontWeight: 700, fontSize: "28px", margin: "0 0 16px 0" }}>
            Add friends
          </h2>
          <span style={{ fontWeight: 600, color: "#000", fontSize: "18px" }}>Search for friends by username</span>
          <div style={{ position: "relative", marginTop: "8px", marginBottom: "16px" }}>
            <Input
              placeholder="Search by username"
              variant="borderless"
              prefix={<SearchOutlined style={{ color: "#7D7D7D", marginRight: "4px" }} />}
              style={{ background: "#F4EBEB", borderRadius: "12px", width: "100%", fontSize: "16px", height: "48px" }}
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
            />
            {friendSearch.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0,
                background: "white", borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                maxHeight: "200px", overflowY: "auto", zIndex: 100,
              }}>
                {filteredUsers.length === 0 ? (
                  <div style={{ padding: "12px 16px", color: "#aaa" }}>No users found</div>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelected = selectedFriends.includes(String(user.id));
                    const profilePicture = userPreferences[user.id];
                    return (
                      <div
                        key={user.id}
                        onClick={() => {
                          setSelectedFriends((prev) =>
                            isSelected ? prev.filter((id) => id !== String(user.id)) : [...prev, String(user.id)]
                          );
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: "12px",
                          padding: "10px 16px", cursor: "pointer",
                          background: isSelected ? "#F4EBEB" : "white",
                          borderBottom: "1px solid #f0f0f0",
                        }}
                      >
                        {profilePicture ? (
                          <img src={profilePicture} alt={user.username} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👤</div>
                        )}
                        <span style={{ fontSize: "16px", color: "#000" }}>{user.username}</span>
                        {isSelected && <span style={{ marginLeft: "auto", color: "#0B0696", fontWeight: 700 }}>✓</span>}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Selected friends chips */}
          {selectedFriends.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "24px" }}>
              {selectedFriends.map((id) => {
                const user = allUsers.find((u) => String(u.id) === id);
                return (
                  <div key={id} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 10px", background: "#F4EBEB", borderRadius: "20px", fontSize: "14px" }}>
                    {user?.username}
                    <span style={{ cursor: "pointer", color: "#d9534f", fontWeight: 700 }} onClick={() => setSelectedFriends((prev) => prev.filter((i) => i !== id))}>✕</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom buttons: Delete account + Save changes */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
            <button
              type="button"
              onClick={handleDeleteAccount}
              style={{ background: "#0B0696", color: "white", border: "none", borderRadius: "20px", padding: "10px 32px", fontSize: "16px", fontWeight: 600, cursor: "pointer" }}
            >
              Delete my account
            </button>
            <button
              type="button"
              disabled={savingPassword || savingFriends}
              onClick={async () => {
                if (oldPassword.trim() || newPassword.trim()) await handleChangePassword();
                await handleSaveFriends();
              }}
              style={{ background: "#0B0696", color: "white", border: "none", borderRadius: "20px", padding: "10px 32px", fontSize: "16px", fontWeight: 600, cursor: "pointer" }}
            >
              {savingPassword || savingFriends ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>

      </main>
    </>
  );
};

const SettingsPage: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorBgContainer: "#F4EBEB",
          colorText: "#000000",
          colorBgElevated: "#ffffff",
          colorTextPlaceholder: "#aaa",
        },
      }}
    >
      <App>
        <SettingsPageInner />
      </App>
    </ConfigProvider>
  );
};

export default SettingsPage;