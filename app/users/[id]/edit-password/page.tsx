"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button, Form, Input, Card } from "antd";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useApi } from "@/hooks/useApi";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { User } from "@/types/user";

const EditPassword = () => {
  const router = useRouter();
  const params = useParams();
  const userId = Array.isArray(params.id) ? params.id[0] : params.id;

  const apiService = useApi();
  const { value: token } = useLocalStorage<string>("token", "");
  const { clear: clearToken } = useLocalStorage<string>("token", "");
  const isAllowed = useProtectedRoute();

  const [loading, setLoading] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  // Check if this is the user's own profile
  useEffect(() => {
    if (!isAllowed || !userId) return;

    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      router.push("/login");
      return;
    }

    const user: User = JSON.parse(storedUser);
    const loggedInUserId = user.id?.toString();

    if (!loggedInUserId) {
      router.push("/login");
      return;
    }

    if (loggedInUserId !== userId) {
      alert("You can only change your own password");
      router.push(`/users/${loggedInUserId}`);
      return;
    }

    setIsOwnProfile(true);
  }, [isAllowed, userId, router]);

  const onFinish = async (values: { password: string }) => {
    try {
      setLoading(true);

      await apiService.put(`/users/${userId}`, {
        password: values.password,
      });

      // Log user out by removing user profile data
      localStorage.removeItem("user");
      clearToken();

      alert("Password updated successfully. Please log in again with your new password.");
      router.push("/login");

    } catch (error) {
      if (error instanceof Error) {
        alert(`Error: ${error.message}`);
      } else {
        alert("Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isAllowed || !isOwnProfile) return null;


  return (
    <div className="card-container">
      <Card
        title="Edit Your Password"
        className="dashboard-container"
      >
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="New Password"
            name="password"
            rules={[
              { required: true, message: "Please enter a new password" },
            ]}
          >
            <Input.Password placeholder="Enter new password" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              className="login-button"
            >
              Save Password
            </Button>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              onClick={() => router.push(`/users/${userId}`)}
            >
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default EditPassword;