"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/actions/auth";

const items = [
  ["/admin", "Dashboard"],
  ["/admin/categories", "Categories"],
  ["/admin/participants", "Participants"],
  ["/admin/judges", "Judges"],
  ["/admin/championship", "Championship"],
  ["/admin/criteria", "Criteria"],
  ["/admin/levels", "Levels"],
  ["/admin/library", "Library"],
  ["/admin/events", "Events"],
  ["/admin/settings", "Settings"],
] as const;

export function AdminNav({ adminName, eventName }: { adminName: string; eventName: string | null }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));
  return (
    <aside className="bg-wine text-white md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0">
      <div className="flex items-center justify-between p-4">
        <div>
          <div className="font-bold">Raks Noor Festival</div>
          <div className="text-xs text-white/70">{eventName ?? "No current event"}</div>
        </div>
        <button className="rounded-md border border-white/30 px-2 py-1 text-sm md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
          Menu
        </button>
      </div>
      <nav className={`${open ? "block" : "hidden"} px-2 pb-4 md:block`}>
        {items.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={`block rounded-lg px-3 py-2 text-sm font-medium ${active(href) ? "bg-white/15" : "hover:bg-white/10"}`}
          >
            {label}
          </Link>
        ))}
        <Link href="/results" className="mt-2 block rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10">
          Public results page &rarr;
        </Link>
        <div className="mt-4 border-t border-white/20 px-3 pt-3 text-xs text-white/70">
          <div className="mb-2">{adminName}</div>
          <form action={() => logout("admin")}>
            <button className="rounded-md border border-white/30 px-2 py-1 text-xs">Sign out</button>
          </form>
        </div>
      </nav>
    </aside>
  );
}
