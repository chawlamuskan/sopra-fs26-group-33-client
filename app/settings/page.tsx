"use client";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import Header from "@/components/Header";
import styles from "@/styles/page.module.css";
import { App, ConfigProvider, Form, Input, Select, theme } from "antd";
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

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return;

    try {
      const parsedUser: User = JSON.parse(storedUser);
      if (parsedUser?.id != null) {
        setUserId(String(parsedUser.id));
      }
    } catch {
      // ignore malformed user state and keep the page empty
    }
  }, []);

  useEffect(() => {
    if (!isAllowed || !userId) return;
    const loadPrefs = async () => {
      try {
        const prefs = await apiService.get<{
          bio?: string;
          profilePicture?: string;
          visitedCountries?: string[];
          wishlistCountries?: string[];
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
      } catch {
        // no preferences yet
      }
    };
    loadPrefs();
  }, [isAllowed, userId, form]);

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
      } catch {
        // silently fail
      }
    };
    fetchCountries();
  }, []);

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

      if (!initialPreferences || values.bio !== initialPreferences.bio) {
        payload.bio = values.bio ?? null;
      }

      if (!initialPreferences || imageBase64 !== initialPreferences.profilePicture) {
        payload.profilePicture = imageBase64 ?? null;
      }

      if (!initialPreferences || JSON.stringify(values.countries_visited ?? []) !== JSON.stringify(initialPreferences.visitedCountries)) {
        payload.visitedCountries = values.countries_visited ?? [];
      }

      if (!initialPreferences || JSON.stringify(values.countries_wishlist ?? []) !== JSON.stringify(initialPreferences.wishlistCountries)) {
        payload.wishlistCountries = values.countries_wishlist ?? [];
      }

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
            label={<span style={{ fontWeight: 600, color: "#000" }}>Write a bio</span>}
            style={{ flex: 1 }}
          >
            <Input.TextArea
              placeholder="Enter bio"
              rows={3}
              style={{
                background: "#F4EBEB",
                border: "none",
                borderRadius: "12px",
                resize: "none",
                fontSize: "14px",
              }}
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ fontWeight: 600, color: "#000" }}>Pick a profile picture</span>}
            style={{ flex: 1 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleImageUpload}
              />
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Profile preview"
                  style={{
                    width: 56, height: 56, borderRadius: "50%",
                    objectFit: "cover", border: "2px solid #e0e0e0",
                  }}
                />
              ) : (
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: "#f0f0f0", display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 22,
                }}>👤</div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "6px 16px", borderRadius: "20px",
                    border: "1px solid #e0e0e0", background: "#faf9f8",
                    color: "#222", fontSize: "14px", cursor: "pointer", fontWeight: 500,
                  }}
                >
                  <span>⬆</span> Upload
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
                      display: "flex", alignItems: "center", gap: "6px",
                      padding: "6px 16px", borderRadius: "20px",
                      border: "1px solid #ffd6d6", background: "#fff5f5",
                      color: "#d9534f", fontSize: "14px", cursor: "pointer", fontWeight: 500,
                    }}
                  >
                    <span>✕</span> Remove
                  </button>
                )}
              </div>
            </div>
          </Form.Item>
        </div>

        {/* Row 2: Visited countries */}
        <Form.Item
          name="countries_visited"
          label={<span style={{ fontWeight: 600, color: "#000" }}>Select countries you have visited</span>}
        >
          <Select
            mode="multiple"
            placeholder="Select countries"
            options={countryOptions}
            showSearch
            style={{ width: "100%" }}
            styles={{ popup: { root: { background: "#ffffff" } } }}
          />
        </Form.Item>

        {/* Row 3: Wishlist countries */}
        <Form.Item
          name="countries_wishlist"
          label={<span style={{ fontWeight: 600, color: "#000" }}>Select countries you want to visit</span>}
        >
          <Select
            mode="multiple"
            placeholder="Select countries"
            options={countryOptions}
            showSearch
            style={{ width: "100%" }}
            styles={{ popup: { root: { background: "#ffffff" } } }}
          />
        </Form.Item>

        {/* Save button */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              background: "#0B0696", color: "white", border: "none",
              borderRadius: "20px", padding: "10px 32px",
              fontSize: "16px", fontWeight: 600, cursor: "pointer",
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </Form>

      {/* ── Change your account details ── */}
      <h2 style={{ color: "#000000", fontWeight: 700, fontSize: "28px", margin: "0 0 24px 0" }}>
        Change your account details
      </h2>
      <p style={{ color: "#aaa", fontSize: "14px" }}>Coming soon.</p>

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