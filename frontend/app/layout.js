import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/shell/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "CarbonX — Carbon Intelligence, Exchange & Circular Optimization Platform",
  description:
    "Track emissions, characterize material streams, match circular economy partners, and verify outcomes with CarbonX.",
  icons: {
    icon: "/logo 2.0.png",
    shortcut: "/logo 2.0.png",
    apple: "/logo 2.0.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
