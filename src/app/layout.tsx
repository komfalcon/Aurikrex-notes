import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Lexend } from "next/font/google";
import { Bootstrap } from "@/components/Bootstrap";
import "@/styles/tokens.css";
import "./globals.css";
const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });
export const metadata: Metadata = { title: "Aurikrex Notes", description: "A quiet, offline-first notes app.", manifest: "/manifest.json", icons: { icon: "/favicon.ico", apple: "/apple-icon.png" } };
export const viewport: Viewport = { themeColor: "#0F172A", width: "device-width", initialScale: 1, viewportFit: "cover" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" className={`${lexend.variable} ${jetbrainsMono.variable}`}><body><Bootstrap />{children}</body></html>; }
