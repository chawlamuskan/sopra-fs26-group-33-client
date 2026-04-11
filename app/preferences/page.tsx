"use client";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { ConfigProvider, Form, Input, Select, theme } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import styles from "@/styles/register.module.css";
import { useState, useRef, useEffect } from "react";

interface FormFieldProps {
  label: string;
  value: string;
}

const Preferences: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const [form] = Form.useForm();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [countryOptions, setCountryOptions] = useState<{ label: string; value: string }[]>([]);

  const { set: setToken } = useLocalStorage<string>("token", "");

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch("https://restcountries.com/v3.1/all?fields=name");
        const data = await res.json();
        const options = data
          .map((c: any) => ({ label: c.name.common, value: c.name.common }))
          .sort((a: any, b: any) => a.label.localeCompare(b.label));
        setCountryOptions(options);
      } catch (error) {
        console.error("Error fetching countries:", error);
      }
    };
    fetchCountries();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const image = e.target.files?.[0];
    if (!image) return;

    if (!image.type.includes("image")) {
      return alert("Only images are allowed!");
    }

    if (image.size > 10_000_000) {
      return alert("Maximum upload size is 10MB!");
    }

    const fileReader = new FileReader();
    fileReader.readAsDataURL(image);
    fileReader.onload = () => {
      const result = fileReader.result as string;
      setPreviewUrl(result);
      setImageBase64(result);
    };
  };

  const handleEndRegistration = async (values: FormFieldProps) => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      const payload = { ...values, profilePicture: imageBase64, friends: selectedFriends};
      const response = await apiService.put<User>(`/users/${storedUser.id}`, payload);
      if (response.token) {
        setToken(response.token);
        localStorage.setItem("user", JSON.stringify(response));
      }
      router.push(`/users/${storedUser.id}`);
    } catch (error) {
      if (error instanceof Error) {
        alert(`Something went wrong during the update:\n${error.message}`);
      } else {
        console.error("An unknown error occurred during update.");
      }
    }
  };

  const [friendSearch, setFriendSearch] = useState("");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiService.get<User[]>("/users");
        setAllUsers(response);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, []);


  const filteredUsers = allUsers.filter((user) =>
    user.username?.toLowerCase().includes(friendSearch.toLowerCase())
  );

  return (
    <ConfigProvider
    theme={{
      algorithm: theme.defaultAlgorithm,
      token: {
        colorBgContainer: "#F4EBEB",
        colorText: "#000000",
        colorBgElevated: "#ffffff",  // this fixes the dropdown background
        colorTextPlaceholder: "#aaa",
      },
    }}
  >
    <div className={styles.container}>
      <div style={{
        height: "107px",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 1000,
      }}>
        <h1
          style={{
            color: "#0B0696",
            fontSize: "48px",
            fontFamily: "DM Sans",
            fontWeight: 700,
            letterSpacing: "-0.293px",
            margin: 0,
            cursor: "pointer",
          }}
          onClick={() => router.push("/")}
        >
          Worldtura
        </h1>
      </div>

      {/* Card */}
      <div className={styles.card}>
        <h2 className={styles.welcome}>Personalize your profile</h2>

        <Form
          form={form}
          name="register"
          onFinish={handleEndRegistration}
          layout="vertical"
          style={{ width: "100%" }}
        >
          <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>

            {/* Row 1: Bio + Profile picture */}
            <div style={{ display: "flex", gap: "24px" }}>
              <Form.Item
                name="bio"
                label={<span className={styles.fieldLabel}>Write your bio</span>}
                style={{ flex: 1 }}
              >
                <Input
                  placeholder="Enter bio"
                  className={styles.inputField}
                  variant="borderless"
                  style={{ width: "100%" }}
                />
              </Form.Item>

              <Form.Item
                label={<span className={styles.fieldLabel}>Pick a profile picture</span>}
                style={{ flex: 1, textAlign: "center" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "16px", justifyContent: "center" }}>

                  {/* Hidden native file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleImageUpload}
                  />

                  {/* Preview or placeholder avatar */}
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Profile preview"
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "2px solid #e0e0e0",
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      background: "#f0f0f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                    }}>
                      👤
                    </div>
                  )}

                  {/* Buttons */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 16px",
                        borderRadius: "20px",
                        border: "1px solid #e0e0e0",
                        background: "#faf9f8",
                        color: "#222",
                        fontSize: "14px",
                        fontFamily: "DM Sans",
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      <span style={{ fontSize: "14px" }}>⬆</span>
                      Upload
                    </button>

                    {previewUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewUrl(null);
                          setImageBase64(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 16px",
                          borderRadius: "20px",
                          border: "1px solid #ffd6d6",
                          background: "#fff5f5",
                          color: "#d9534f",
                          fontSize: "14px",
                          fontFamily: "DM Sans",
                          cursor: "pointer",
                          fontWeight: 500,
                        }}
                      >
                        <span style={{ fontSize: "14px" }}>✕</span>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </Form.Item>
            </div>

            {/* Row 2: Countries */}
            <div style={{ display: "flex", gap: "24px" , background: "white"}}>
              <Form.Item
                name="countries_visited"
                label={<span className={styles.fieldLabel}>Select the countries you've visited</span>}
                style={{ flex: 1 }}
              >
                <Select
                  mode="multiple"
                  placeholder="Select countries"
                  options={countryOptions}
                  style={{ width: "100%" }}
                  showSearch
                  className={styles.countrySelect}
                />
              </Form.Item>

              <Form.Item
                name="countries_wishlist"
                label={<span className={styles.fieldLabel}>Select the countries you want to visit</span>}
                style={{ flex: 1 }}
              >
                <Select
                  mode="multiple"
                  placeholder="Select countries"
                  options={countryOptions}
                  style={{ width: "100%" }}
                  showSearch
                  className={styles.countrySelect}
                />
              </Form.Item>
            </div>

            {/* Row 3: Add friends*/}
            <Form.Item
              label={<span className={styles.fieldLabel}>Add friends</span>}
              style={{ width: "100%" }}
            >
              {/* Search input */}
              <Input
                placeholder="Search by username"
                className={styles.inputField}
                style={{ width: "100%" }}
                variant="borderless"
                prefix={<SearchOutlined style={{ color: "#7D7D7D", marginRight: "4px" }} />}
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
              />

              {/* Results list — only show when typing */}
              {friendSearch.length > 0 && (
                <div style={{
                  marginTop: "8px",
                  background: "white",
                  borderRadius: "8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  maxHeight: "200px",
                  overflowY: "auto",
                }}>
                  {filteredUsers.length === 0 ? (
                    <div style={{ padding: "12px 16px", color: "#aaa" }}>No users found</div>
                  ) : (
                    filteredUsers.map((user) => {
                      const isSelected = selectedFriends.includes(user.id);
                      return (
                        <div
                          key={user.id}
                          onClick={() => {
                            setSelectedFriends((prev) =>
                              isSelected ? prev.filter((id) => id !== user.id) : [...prev, user.id as string]
                            );
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "10px 16px",
                            cursor: "pointer",
                            background: isSelected ? "#F4EBEB" : "white",
                            borderBottom: "1px solid #f0f0f0",
                          }}
                        >
                          {/* Profile picture */}
                          {user.profilePicture ? (
                            <img
                              src={user.profilePicture}
                              alt={user.username}
                              style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }}
                            />
                          ) : (
                            <div style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              background: "#f0f0f0",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 16,
                            }}>
                              👤
                            </div>
                          )}

                          {/* Username */}
                          <span style={{ fontFamily: "DM Sans", fontSize: "16px", color: "#000" }}>
                            {user.username}
                          </span>

                          {/* Checkmark if selected */}
                          {isSelected && (
                            <span style={{ marginLeft: "auto", color: "#0B0696", fontWeight: 700 }}>✓</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Selected friends chips */}
              {selectedFriends.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
                  {selectedFriends.map((id) => {
                    const user = allUsers.find((u) => u.id === id);
                    return (
                      <div key={id} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "4px 10px",
                        background: "#F4EBEB",
                        borderRadius: "20px",
                        fontSize: "14px",
                        fontFamily: "DM Sans",
                      }}>
                        {user?.username}
                        <span
                          style={{ cursor: "pointer", color: "#d9534f", fontWeight: 700 }}
                          onClick={() => setSelectedFriends((prev) => prev.filter((i) => i !== id))}
                        >
                          ✕
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Form.Item>

            {/* Row 4: Buttons */}
            <div style={{ display: "flex", justifyContent: "right", alignItems: "center", gap: "24px", marginTop: "16px" }}>
              <h3
                style={{ margin: 0, color: "#7D7D7D", fontSize: "18px", fontFamily: "DM Sans", fontWeight: 500, cursor: "pointer" }}
                onClick={() => {
                  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
                  router.push(`/users/${storedUser.id}`);
                }}
              >
                Skip
              </h3>

              <button type="submit" className={styles.btnLogin} style={{ width: "179px" }}>
                Save profile
              </button>
            </div>

          </div>
        </Form>
      </div>
    </div>\
     </ConfigProvider>
  );
};

export default Preferences;