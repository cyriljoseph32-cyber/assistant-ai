import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Samui AI Assistant",
  description: "AI WhatsApp assistant + CRM for Koh Samui service businesses",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
