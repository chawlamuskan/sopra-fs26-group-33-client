"use client";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Form, Input } from "antd";
import styles from "@/styles/login.module.css";

interface FormFieldProps {
  label: string;
  value: string;
}

const Register: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const [form] = Form.useForm();

  const { set: setToken } = useLocalStorage<string>("token", "");

  const handleRegister = async (values: FormFieldProps) => {
    try {
      const response = await apiService.post<User>("/users", values);
      if (response.token) {
        setToken(response.token);
        localStorage.setItem("user", JSON.stringify(response));
        sessionStorage.setItem("justRegistered", "true");
      }
      router.push("/preferences");
    } catch (error) {
      if (error instanceof Error) {
        alert(`Something went wrong during the registration:\n${error.message}`);
      } else {
        console.error("An unknown error occurred during registration.");
      }
    }
  };

  return (
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
        <h2 className={styles.welcome}>Create your profile</h2>

        <Form
          form={form}
          name="register"
          onFinish={handleRegister}
          layout="vertical"
        >
          {/* Row: Name + Username side by side */}
          <div style={{ display: "flex", gap: "24px" }}>
            <Form.Item
              name="name"
              label={<span className={styles.fieldLabel}>Name <span className={styles.required}></span></span>}
              rules={[{ required: true, message: "Please input your name!" }]}
            >
              <Input placeholder="Enter name" className={styles.inputField} variant="borderless" />
            </Form.Item>

            <Form.Item
              name="username"
              label={<span className={styles.fieldLabel}>Pick a username </span>}
              rules={[{ required: true, message: "Please input your username!" }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="Enter username" className={styles.inputField} style={{ width: "100%" }} variant="borderless" />
            </Form.Item>
          </div>

           <div style={{ display: "flex", gap: "24px" }}>
          <Form.Item
            name="email"
            label={<span className={styles.fieldLabel}>Email </span>}
            rules={[{ required: true, message: "Please input your email!" }]}
          >
            <Input placeholder="Enter email" className={styles.inputField} style={{ width: "100%" }} variant="borderless" />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span className={styles.fieldLabel}>Password </span>}
            rules={[{ required: true, message: "Please input your password!" }]}
          >
            <Input.Password placeholder="Enter password" className={styles.inputField} style={{ width: "100%" }} variant="borderless" />
          </Form.Item>
          </div>

          {/* Buttons row */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px" }}>
            <button
              type="button"
              className={styles.btnLogin}
              style={{ width: "270px" }}
              onClick={() => router.push("/login")}
            >
              Already registered? Login
            </button>

            <button type="submit" className={styles.btnLogin} style={{ width: "179px" }}>
              Register
            </button>
          </div>

        </Form>
      </div>
    </div>
  );
};

export default Register;
