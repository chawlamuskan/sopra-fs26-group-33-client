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

const Login: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const [form] = Form.useForm();

  const { set: setToken } = useLocalStorage<string>("token", "");

  const handleLogin = async (values: FormFieldProps) => {
    try {
      const response = await apiService.post<User>("/login", values);
      if (response.token) {
        setToken(response.token);
        localStorage.setItem("user", JSON.stringify(response));
      }
      router.push(`/users/${response.id}`);
    } catch (error) {
      if (error instanceof Error) {
        alert(`Something went wrong during the login:\n${error.message}`);
      } else {
        console.error("An unknown error occurred during login.");
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
        <h2 className={styles.welcome}>Welcome back!</h2>

        <Form
          form={form}
          name="login"
          onFinish={handleLogin}
          layout="vertical"
        >
          <Form.Item
            name="username"
            label={
              <span className={styles.fieldLabel}>
                Username or email 
              </span>
            }
            rules={[{ required: true, message: "Please input your username!" }]}
          >
            <Input
              placeholder="Enter username"
              className={styles.inputField}
              variant="borderless"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span className={styles.fieldLabel}>Password </span>}
            rules={[{ required: true, message: "Please input your password!" }]}
          >
            <Input.Password placeholder="Enter password" className={styles.inputField} variant="borderless" />
          </Form.Item>
          
          <Form.Item>
            <div className={styles.btnWrapper}>
              <button type="submit" className={styles.btnLogin}> 
                Login
              </button>
            </div>
          </Form.Item>
          
         
          <Form.Item>
            <div className={styles.btnWrapper}>
              <button className={styles.btnLogin} style ={{height:"60px"}} onClick={() => router.push("/register")}>
                Not a user? <br /> Sign up
              </button>
            </div>
          </Form.Item>
            
          
        </Form>
      </div>
    </div>
  );
};

export default Login;