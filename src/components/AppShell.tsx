"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type AppShellProps = { title: string; eyebrow?: string; children: ReactNode; showNavigation?: boolean };
type IconName = "note" | "trash" | "settings" | "plus" | "back" | "search" | "pin" | "mic" | "summarize" | "check" | "close";

export const Icon = ({ name, size = 22 }: { name: IconName; size?: number }) => {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "plus") return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
  if (name === "back") return <svg {...common}><path d="m15 18-6-6 6-6" /></svg>;
  if (name === "search") return <svg {...common}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>;
  if (name === "pin") return <svg {...common}><path d="m15 4 5 5-3 1-3 6-3-3-6 3 3-6 3-3 1-3Z" /></svg>;
  if (name === "mic") return <svg {...common}><rect x="8" y="3" width="8" height="12" rx="4" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" /></svg>;
  if (name === "summarize") return <svg {...common}><path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>;
  if (name === "check") return <svg {...common}><path d="m5 12 4.5 4.5L19 7" /></svg>;
  if (name === "close") return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>;
  if (name === "trash") return <svg {...common}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>;
  if (name === "settings") return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a2 2 0 0 0 .4 2.2l.1.1-1.4 1.4-.1-.1a2 2 0 0 0-2.2-.4 2 2 0 0 0-1.2 1.8v.2h-2v-.2a2 2 0 0 0-1.2-1.8 2 2 0 0 0-2.2.4l-.1.1-1.4-1.4.1-.1A2 2 0 0 0 8.6 15a2 2 0 0 0-1.8-1.2h-.2v-2h.2A2 2 0 0 0 8.6 10a2 2 0 0 0-.4-2.2l-.1-.1 1.4-1.4.1.1a2 2 0 0 0 2.2.4A2 2 0 0 0 13 5v-.2h2V5a2 2 0 0 0 1.2 1.8 2 2 0 0 0 2.2-.4l.1-.1 1.4 1.4-.1.1a2 2 0 0 0-.4 2.2A2 2 0 0 0 21.2 11h.2v2h-.2a2 2 0 0 0-1.8 1.2Z" /></svg>;
  return <svg {...common}><path d="M6 4.5h12a2 2 0 0 1 2 2V20l-4-2-4 2-4-2-4 2V6.5a2 2 0 0 1 2-2Z" /><path d="M8 8h8M8 12h6" /></svg>;
};

const navItems: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/", label: "Notes", icon: "note" },
  { href: "/trash", label: "Trash", icon: "trash" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export const AppShell = ({ title, eyebrow = "AURIKREX / OFFLINE", children, showNavigation = true }: AppShellProps) => {
  const pathname = usePathname();
  const isEditor = pathname === "/note" || pathname === "/new";

  return (
    <main className="app-frame">
      <header className="app-header">
        <div className="header-title-row">
          {isEditor ? <Link href="/" className="icon-button" aria-label="Back to notes"><Icon name="back" /></Link> : null}
          <Image src="/brand-logo.png" alt="" width={758} height={958} className="brand-logo" priority />
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
          </div>
        </div>
      </header>
      <section className="app-content">{children}</section>
      {showNavigation && !isEditor ? <>
        <Link href="/new" className="fab" aria-label="Create a new note"><Icon name="plus" size={26} /></Link>
        <nav className="bottom-nav" aria-label="Primary navigation">
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return <Link key={item.href} href={item.href} className={active ? "nav-item active" : "nav-item"} aria-current={active ? "page" : undefined}><Icon name={item.icon} size={21} /><span>{item.label}</span></Link>;
          })}
        </nav>
      </> : null}
    </main>
  );
};
