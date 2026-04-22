import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { App as AntdApp, ConfigProvider, theme } from "antd";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import "@/styles/globals.css";
import { Layout } from "antd";
import { DM_Sans } from "next/font/google";

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


export const metadata: Metadata = {
  title: "Worldtura",
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
              colorText: "#000000",
              fontSize: 16,
              colorBgContainer: "#16181D",
            },
            components: {
              Button: {
                colorPrimary: "#0B0696",
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

                {children}
              </Layout>

            </AntdApp>
          </AntdRegistry>
        </ConfigProvider>
      </body>
    </html>
  );
}
