import type { Metadata } from "next";
import { JetBrains_Mono, Lexend } from "next/font/google";
import { Bootstrap } from "@/components/Bootstrap";
import "@/styles/tokens.css";
import "./globals.css";

const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  title: "Aurikrex Notes",
  description: "Offline-first notes PWA",
  manifest: "/manifest.json"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lexend.variable} ${jetbrainsMono.variable}`}>
      <body>
        <Bootstrap />
        {children}
      </body>
    </html>
  );
}
