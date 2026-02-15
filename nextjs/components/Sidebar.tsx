"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState, useEffect } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: string; // emoji for now; could replace with svgs later
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: "\u{1F3E0}" },
  { label: "Resume Lab", href: "/resume-lab", icon: "\u{1F4C4}" },
  { label: "Job Finder", href: "/job-finder", icon: "\u{1F4BC}" },
  { label: "Applications", href: "/applications", icon: "\u{1F5C2}\uFE0F" },
  { label: "Coach Center", href: "/coach-center", icon: "\u{1F3AF}" },
  { label: "Settings", href: "/settings", icon: "\u2699\uFE0F" }
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Listen for auto-collapse event (fired when PDF preview loads)
  useEffect(() => {
    const handler = () => setCollapsed(true);
    window.addEventListener("careerlift:sidebar-collapse", handler);
    return () => window.removeEventListener("careerlift:sidebar-collapse", handler);
  }, []);

  return (
    <aside
      className={`shrink-0 py-8 flex flex-col gap-8 glass transition-all duration-200 ${
        collapsed ? "w-[68px] px-3" : "w-72 px-6"
      }`}
    >
      <div className="flex items-center justify-between">
        {!collapsed && <div className="brand select-none">CareerLift</div>}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.08)] text-muted hover:text-foreground transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            className={`w-5 h-5 transition-transform ${collapsed ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
        </button>
      </div>
      <nav className="flex-1">
        <ul className="space-y-1">
          {navItems.map(item => {
            const active = item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`nav-item ${active ? "nav-item-active" : ""} ${
                    collapsed ? "justify-center !px-2" : ""
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="text-base" aria-hidden>{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {!collapsed && (
        <div className="mt-auto text-[10px] tracking-wide uppercase text-muted">Mock UI</div>
      )}
    </aside>
  );
}

export default Sidebar;
