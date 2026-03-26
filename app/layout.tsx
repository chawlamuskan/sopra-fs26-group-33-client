import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { App as AntdApp, ConfigProvider, theme } from "antd";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import "@/styles/globals.css";
import { Layout } from "antd";
import { DM_Sans } from "next/font/google";
import HeaderButtons from "./HeaderButtons";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
});

const {Header} = Layout;

export const metadata: Metadata = {
  title: "Student XX-XXX-XXX",
  description: "sopra-fs26-template-client",
};




export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${dmSans.className}`}>
        <ConfigProvider
          theme={{
            algorithm: theme.defaultAlgorithm,
            token: {
              colorPrimary: "#22426b",
              borderRadius: 8,
              colorText: "#fff",
              fontSize: 16,
              colorBgContainer: "#16181D",
            },
            components: {
              Button: {
                colorPrimary: "#75bd9d",
                algorithm: true,
                controlHeight: 38,
              },
              Input: {
                colorBorder: "gray",
                colorTextPlaceholder: "#888888",
                algorithm: false,
              },
              Form: {
                labelColor: "#fff",
                algorithm: theme.defaultAlgorithm,
              },
            },
          }}
        >
          <AntdRegistry>
            <AntdApp>
              <Layout>
                <header
                  style={{
                    background: "#0B0696",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 24px",
                    position: "sticky",
                    top: 0,
                    zIndex: 1000,
                    height: "107px",
                  }}
                >
                  <h1
                    style={{
                      color: "#FFF",
                      fontSize: "48px",
                      fontFamily: "DM Sans",
                      fontWeight: 700,
                      letterSpacing: "-0.293px",
                      margin: 0,
                    }}
                  >
                    Worldtura
                  </h1>
                  {<HeaderButtons />}
                </header>

                {children}
              </Layout>

            </AntdApp>
          </AntdRegistry>
        </ConfigProvider>
      </body>
    </html>
  );
}
