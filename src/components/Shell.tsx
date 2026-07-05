"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { CommandK } from "./CommandK";
import {
  SparkIcon,
  InboxIcon,
  UsersIcon,
  CalendarIcon,
  BookIcon,
  PulseIcon,
  SearchIcon,
  LogoutIcon,
} from "./icons";

const NAV = [
  { href: "/", label: "Assistant", icon: SparkIcon },
  { href: "/inbox", label: "Inbox", icon: InboxIcon },
  { href: "/leads", label: "Leads", icon: UsersIcon },
  { href: "/bookings", label: "Bookings", icon: CalendarIcon },
  { href: "/knowledge", label: "Knowledge", icon: BookIcon },
  { href: "/activity", label: "Activity", icon: PulseIcon },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">C</span> Coco
        </div>
        <button className="search-trigger" onClick={() => setSearchOpen(true)}>
          <SearchIcon size={15} /> Search
          <span className="kbd">⌘K</span>
        </button>
        <nav className="nav">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item${isActive(href) ? " active" : ""}`}
            >
              <Icon /> {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button className="nav-item" onClick={logout} style={{ width: "100%", border: "none", background: "none" }}>
            <LogoutIcon /> Sign out
          </button>
        </div>
      </aside>

      <div className="main">{children}</div>

      <nav className="tabbar">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`tab-item${isActive(href) ? " active" : ""}`}
          >
            <Icon size={19} /> {label}
          </Link>
        ))}
      </nav>

      <CommandK open={searchOpen} onClose={() => setSearchOpen(false)} onOpen={() => setSearchOpen(true)} />
    </div>
  );
}
