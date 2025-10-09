"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

interface NavItem {
  label: string;
  href: string;
  icon: string; // emoji for now; could replace with svgs later
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: "🏠" },
  { label: "Resume Lab", href: "/resume-lab", icon: "📄" },
  { label: "Job Finder", href: "/job-finder", icon: "💼" },
  { label: "Applications", href: "/applications", icon: "🗂️" },
  { label: "Coach Center", href: "/coach-center", icon: "🎯" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
  { label: "Admin Ingest", href: "/admin/ingest-jobs", icon: "🛠️" }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-72 shrink-0 px-6 py-8 flex flex-col gap-8 glass">
      <div className="brand select-none">CareerLift</div>
      <nav className="flex-1">
        <ul className="space-y-1">
          {navItems.map(item => {
            const active = item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link href={item.href} className={`nav-item ${active ? "nav-item-active" : ""}`}>
                  <span className="text-base" aria-hidden>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-auto text-[10px] tracking-wide uppercase text-[#546170]">Mock UI</div>
    </aside>
  );
}

export default Sidebar;