import Link from "next/link";
import type { ReactNode } from "react";

type AppShellProps = {
  title: string;
  children: ReactNode;
};

export const AppShell = ({ title, children }: AppShellProps)=> {
  return (
    <main className="h-[100dvh] bg-bg text-text flex flex-col">
      <header className="p-4 border-b border-slate-800 flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">{title}</h1>
        <nav className="flex gap-2 text-sm">
          <Link href="/" className="px-2 py-1 rounded bg-deeper">
            Notes
          </Link>
          <Link href="/trash" className="px-2 py-1 rounded bg-deeper">
            Trash
          </Link>
          <Link href="/settings" className="px-2 py-1 rounded bg-deeper">
            Settings
          </Link>
        </nav>
      </header>
      <section className="flex-1 min-h-0">{children}</section>
    </main>
  );
};
