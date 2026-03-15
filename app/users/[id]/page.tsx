// your code here for S2 to display a single user profile after having clicked on it
// each user has their own slug /[id] (/1, /2, /3, ...) and is displayed using this file
// try to leverage the component library from antd by utilizing "Card" to display the individual user
// import { Card } from "antd"; // similar to /app/users/page.tsx

"use client";
// For components that need React hooks and browser APIs,
// SSR (server side rendering) has to be disabled.
// Read more here: https://nextjs.org/docs/pages/building-your-application/rendering/server-side-rendering

import React, { use, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Button, Form, Input, Card, Table } from "antd";
import type { TableProps } from "antd";
import { useApi } from "@/hooks/useApi";

import { useLogout } from "@/hooks/useLogout";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";

// Columns for the antd table of User objects
const columns: TableProps<User>["columns"] = [
  {
    title: "Username",
    dataIndex: "username",
    key: "username",
  },
  {
    title: "Name",
    dataIndex: "name",
    key: "name",
  },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
  },
  {
    title: "Bio",
    dataIndex: "bio",
    key: "bio",
  },
  {
    title: "Creation Date",
    dataIndex: "creationDate",
    key: "creationDate",
  },
];

const Profile: React.FC = () => {   // react component called Profile ; functiional component ; uses that func definded below 
  const logout = useLogout();
  const router = useRouter();   // for naviagtion
  const apiService = useApi();  // for backend endpoint

  const params = useParams();  // to get the id from the url - that way i can extract the id of the user from the url and use it to fetch the user data from the backend
  const userId = Array.isArray(params.id) ? params.id[0] : params.id; // extract the id from the params object - params is the obj and we can extract only the id

  const { value: token} = useLocalStorage<string>("token", ""); // to get the token from localStorage and clear it when logging out  
  const isAllowed = useProtectedRoute();
  const [user, setUser] = useState<User | null>(null); // to store the user data fetched from the backend
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return;

    const currentUser: User = JSON.parse(storedUser);
    setLoggedInUserId(currentUser.id ? currentUser.id.toString() : null);
  }, []);

  // fetch users when they are logged in 
  useEffect(() => {
    if (!isAllowed) return;
    const fetchUsers = async () => {
      try {
        const fetchedUser = await apiService.get<User>(`/users/${userId}`); // call the backend endpoint to get the user data by id
        setUser(fetchedUser); // set the user data in the state -- gave me a error so i had to add the type <User> 
        // to the apiService.get function to specify that the response will be of type User, that way it knows how
        //  to handle the data and set it in the state correctly
      } catch (error) {
        if (error instanceof Error) {
          alert(`Something went wrong while fetching users:\n${error.message}`);
        } else {
          console.error("An unknown error occurred while fetching users.");
        }
      }
    };

    fetchUsers();
  }, [apiService, isAllowed]); // dependency array - this effect will run whenever the userId or apiService changes

  // here was logout func before but as it was duplicating, i moved it as a hook in /app/hooks/useLogout.ts 
  // and imported it here to use it directly without having to define it again - this is the beauty of hooks, 
  // they are reusable functions that can be used across different components without having to repeat the same code
  return (
      <div className="card-container">
        <Card
          title="This is my Profile Page" 
          loading={!user}
          className="dashboard-container"
        >
          {user && (
            <>
              {/* antd Table: pass the columns and data, plus a rowKey for stable row identity */}
              <Table<User>
                columns={columns}
                dataSource={[user]}
                rowKey="id" 
              />
          <Form.Item>
              <Button
              type="primary"
              className="login-button"
              onClick={() => router.push("/users")}
            >
              View all Users
            </Button>
            </Form.Item>
            {loggedInUserId === userId && (
              <Form.Item>
                <Button
                  type="primary"
                  onClick={() => router.push(`/users/${userId}/edit-password`)}
                >
                  Edit Password
                </Button>
              </Form.Item>
            )}
              <Button onClick={logout} type="primary">
                Logout
              </Button>
            </>
          )}
        </Card>
      </div>
    );
  };
  

export default Profile;