// this code is part of S2 to display a list of all registered users
// clicking on a user in this list will display /app/users/[id]/page.tsx
"use client"; // For components that need React hooks and browser APIs, SSR (server side rendering) has to be disabled. Read more here: https://nextjs.org/docs/pages/building-your-application/rendering/server-side-rendering

import { useLogout } from "@/hooks/useLogout";

import React, { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Button, Card, Table } from "antd";
import type { TableProps } from "antd"; // antd component library allows imports of types
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
// Optionally, you can import a CSS module or file for additional styling:
// import "@/styles/views/Dashboard.scss";

// Columns for the antd table of User objects
// Note: columns is defined outside component, so we need to pass router as parameter or define inside component
// For now, we'll move this inside the component or use a different approach
const getColumns = (router: ReturnType<typeof useRouter>): TableProps<User>["columns"] => [
  // before i didnt had this getColumns func.. but i cdnt use the router
  // i was using router. inside but i never had the react hook outside so i needed to add it
  // 
  {
    title: "Username",
    dataIndex: "username",
    key: "username",
    render: (text, record) => ( 
      <a 
        style={{cursor: "pointer", color: "#fd16a8" }}
        onClick={() => router.push(`/users/${record.id}`)}
      >
        {text}
      </a>  
    ),
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
    title: "Id",
    dataIndex: "id",
    key: "id",
  },
];

const Dashboard: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const logout = useLogout();
  const [users, setUsers] = useState<User[] | null>(null);
  const isAllowed = useProtectedRoute(); // custom hook to protect route and redirect to login if not authenticated
  // useLocalStorage hook example use
  // The hook returns an object with the value and two functions
  // Simply choose what you need from the hook:
/* comment out --- const {
    // value: token, // is commented out because we dont need to know the token value for logout
    // set: setToken, // is commented out because we dont need to set or update the token value
    clear: clearToken, // all we need in this scenario is a method to clear the token
  } = useLocalStorage<string>("token", ""); // if you wanted to select a different token, i.e "lobby", useLocalStorage<string>("lobby", "");

  const handleLogout = (): void => {
    // Clear token using the returned function 'clear' from the hook
    clearToken();
    router.push("/login");
  };
 */
  const { value: token} = useLocalStorage<string>("token", ""); // to get the token from localStorage and clear it when logging out  

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // apiService.get<User[]> returns the parsed JSON object directly,
        // thus we can simply assign it to our users variable.
        const users: User[] = await apiService.get<User[]>("/users");
        setUsers(users);
        console.log("Fetched users:", users);
      } catch (error) {
        if (error instanceof Error) {
          alert(`Something went wrong while fetching users:\n${error.message}`);
        } else {
          console.error("An unknown error occurred while fetching users.");
        }
      }
    };

    fetchUsers();
  }, [apiService, isAllowed]); // dependency apiService does not re-trigger the useEffect on every render because the hook uses memoization (check useApi.tsx in the hooks).
  // if the dependency array is left empty, the useEffect will trigger exactly once
  // if the dependency array is left away, the useEffect will run on every state change. Since we do a state change to users in the useEffect, this results in an infinite loop.
  // read more here: https://react.dev/reference/react/useEffect#specifying-reactive-dependencies

  return (
    <div className="card-container">
      <Card
        title="Get all users from secure endpoint:" 
        loading={!users}
        className="dashboard-container"
      >
        {users && (
          <>
            {/* antd Table: pass the columns and data, plus a rowKey for stable row identity */}
            <Table<User>
              columns={getColumns(router)}
              dataSource={users}
              rowKey="id"
             // remove that it was clickable for every item in the row 
            />
            <Button onClick={logout} type="primary">
              Logout
            </Button>
          </>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
