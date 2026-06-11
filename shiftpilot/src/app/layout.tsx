import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ShiftPilot — Shift scheduling on autopilot",
    template: "%s · ShiftPilot",
  },
  description:
    "Automated shift scheduling for restaurants, hotels, spas, farms and every business that runs on shifts.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ShiftPilot",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
