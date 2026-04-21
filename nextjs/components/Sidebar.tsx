"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import React, { useEffect, useState, type ReactNode } from "react";
import { CLLogo } from "@/components/BrandLogo";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: <HomeIcon /> },
  { label: "Resume Lab", href: "/resume-lab", icon: <ResumeIcon /> },
  { label: "Job Finder", href: "/job-finder", icon: <BriefcaseIcon /> },
  { label: "Applications", href: "/applications", icon: <FolderIcon /> },
  { label: "Coach Center", href: "/coach-center", icon: <TargetIcon /> },
  { label: "Settings", href: "/settings", icon: <SettingsIcon /> },
];

function SidebarIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center text-muted transition-colors">
      {children}
    </span>
  );
}

function HomeIcon() {
  return (
    <SidebarIcon>
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10.5 12 3l9 7.5" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5.25 9.75V20h13.5V9.75" />
      </svg>
    </SidebarIcon>
  );
}

function ResumeIcon() {
  return (
    <SidebarIcon>
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 3.75h7.5L19 8.25v12A1.75 1.75 0 0 1 17.25 22h-10.5A1.75 1.75 0 0 1 5 20.25V5.5A1.75 1.75 0 0 1 6.75 3.75Z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 3.75v4.5h4.5M8 12h8M8 16h6" />
      </svg>
    </SidebarIcon>
  );
}

function BriefcaseIcon() {
  return (
    <SidebarIcon>
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8.25 7.5V6a1.5 1.5 0 0 1 1.5-1.5h4.5a1.5 1.5 0 0 1 1.5 1.5v1.5" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.5 9h15A1.5 1.5 0 0 1 21 10.5v7.25A1.75 1.75 0 0 1 19.25 19.5H4.75A1.75 1.75 0 0 1 3 17.75V10.5A1.5 1.5 0 0 1 4.5 9Z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 13h4" />
      </svg>
    </SidebarIcon>
  );
}

function FolderIcon() {
  return (
    <SidebarIcon>
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.75 7.5A1.75 1.75 0 0 1 5.5 5.75h4l1.5 1.5h7A1.75 1.75 0 0 1 19.75 9v9.5A1.75 1.75 0 0 1 18 20.25H5.5A1.75 1.75 0 0 1 3.75 18.5Z" />
      </svg>
    </SidebarIcon>
  );
}

function TargetIcon() {
  return (
    <SidebarIcon>
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
        <circle cx="12" cy="12" r="7.5" strokeWidth={1.8} />
        <circle cx="12" cy="12" r="3.5" strokeWidth={1.8} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 2.75v3M21.25 12h-3M12 21.25v-3M2.75 12h3" />
      </svg>
    </SidebarIcon>
  );
}

function SettingsIcon() {
  return (
    <SidebarIcon>
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.4 4.2a1 1 0 0 1 1.2-.7l1.1.32a1 1 0 0 0 1-.24l.8-.82a1 1 0 0 1 1.34-.08l1.58 1.25a1 1 0 0 1 .27 1.31l-.56.98a1 1 0 0 0 .08 1.02l.68.92a1 1 0 0 0 .91.4l1.12-.1a1 1 0 0 1 1.05.84l.36 1.98a1 1 0 0 1-.62 1.1l-1.04.41a1 1 0 0 0-.62.8l-.12 1.13a1 1 0 0 0 .35.96l.86.72a1 1 0 0 1 .18 1.33l-1.25 1.71a1 1 0 0 1-1.28.32l-1.05-.48a1 1 0 0 0-1.01.1l-.9.66a1 1 0 0 0-.38.93l.1 1.14a1 1 0 0 1-.84 1.05l-1.98.36a1 1 0 0 1-1.1-.62l-.41-1.04a1 1 0 0 0-.8-.62l-1.13-.12a1 1 0 0 0-.96.35l-.72.86a1 1 0 0 1-1.33.18l-1.71-1.25a1 1 0 0 1-.32-1.28l.48-1.05a1 1 0 0 0-.1-1.01l-.66-.9a1 1 0 0 0-.93-.38l-1.14.1a1 1 0 0 1-1.05-.84l-.36-1.98a1 1 0 0 1 .62-1.1l1.04-.41a1 1 0 0 0 .62-.8l.12-1.13a1 1 0 0 0-.35-.96l-.86-.72a1 1 0 0 1-.18-1.33l1.25-1.71a1 1 0 0 1 1.28-.32l1.05.48a1 1 0 0 0 1.01-.1l.9-.66a1 1 0 0 0 .38-.93l-.1-1.14a1 1 0 0 1 .84-1.05Z" />
        <circle cx="12" cy="12" r="2.6" strokeWidth={1.8} />
      </svg>
    </SidebarIcon>
  );
}

function MenuIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      className={`h-5 w-5 transition-transform ${collapsed ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg
      className="h-4.5 w-4.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M15.75 8.25V6.5A1.75 1.75 0 0 0 14 4.75H7.5A1.75 1.75 0 0 0 5.75 6.5v11A1.75 1.75 0 0 0 7.5 19.25H14A1.75 1.75 0 0 0 15.75 17.5v-1.75"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M10.5 12h7.75M15.5 8.25 19.25 12 15.5 15.75"
      />
    </svg>
  );
}

function SidebarNav({
  pathname,
  collapsed,
  onNavigate,
}: {
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1">
      <ul className="space-y-1">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={`nav-item ${active ? "nav-item-active" : ""} ${
                  collapsed ? "justify-center !px-2" : ""
                }`}
                title={collapsed ? item.label : undefined}
                aria-label={collapsed ? item.label : undefined}
              >
                <span aria-hidden>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function DesktopSidebar({
  pathname,
  collapsed,
  onToggleCollapsed,
}: {
  pathname: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const { status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";
  // When the user isn't logged in we always render the sidebar collapsed
  // (logo only) and hide the collapse toggle.
  const effectivelyCollapsed = !isAuthenticated || collapsed;

  return (
    <aside
      className={`hidden shrink-0 py-8 transition-all duration-200 lg:flex lg:flex-col lg:gap-8 glass ${
        effectivelyCollapsed ? "lg:w-[68px] lg:px-3" : "lg:w-72 lg:px-6"
      }`}
    >
      {effectivelyCollapsed ? (
        <div className="flex flex-col items-center gap-2">
          <CLLogo size={36} />
          {isAuthenticated && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="rounded-md p-1.5 text-muted transition-colors hover:bg-[rgba(255,255,255,0.08)] hover:text-foreground"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <CollapseIcon collapsed={collapsed} />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CLLogo size={28} />
            <div className="brand select-none">CareerLift</div>
          </div>
          {isAuthenticated && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="rounded-md p-1.5 text-muted transition-colors hover:bg-[rgba(255,255,255,0.08)] hover:text-foreground"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <CollapseIcon collapsed={collapsed} />
            </button>
          )}
        </div>
      )}

      <SidebarNav pathname={pathname} collapsed={effectivelyCollapsed} />

      <div className="mt-auto flex flex-col gap-2">
        <UserBadge collapsed={effectivelyCollapsed} />
        {!effectivelyCollapsed && (
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted">
            Career workspace
          </div>
        )}
      </div>
    </aside>
  );
}

function UserBadge({ collapsed }: { collapsed: boolean }) {
  const { data: session, status } = useSession();
  if (status !== "authenticated") return null;
  const email = session.user?.email || "user";
  const name = session.user?.name || email;
  return (
    <div
      className={`border border-[var(--border-color)] bg-[rgba(255,255,255,0.03)] shadow-[var(--shadow-1)] ${
        collapsed
          ? "flex justify-center rounded-xl p-2"
          : "rounded-2xl p-3"
      }`}
    >
      {collapsed ? (
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-foreground transition-colors hover:bg-[rgba(255,255,255,0.08)]"
          title="Sign out"
          aria-label="Sign out"
        >
          <SignOutIcon />
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(160deg,rgba(156,205,248,0.14),rgba(144,225,214,0.08))] text-[15px] font-semibold text-foreground shadow-[var(--shadow-1)]">
            {name.trim().charAt(0).toUpperCase() || "U"}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-foreground">{name}</p>
            <p className="truncate text-[11px] text-muted">{email}</p>
          </div>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="shrink-0 rounded-xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-[11px] font-semibold text-muted transition-colors hover:bg-[rgba(255,255,255,0.08)] hover:text-foreground"
            title="Sign out"
            aria-label="Sign out"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function MobileSidebar({
  pathname,
  open,
  onOpen,
  onClose,
}: {
  pathname: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="sticky top-0 z-40 border-b border-[var(--border-color)] bg-[color:color-mix(in_oklab,var(--background)_82%,transparent)] backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <CLLogo size={26} />
            <div className="brand select-none text-[18px]">CareerLift</div>
          </div>
          <button
            type="button"
            onClick={onOpen}
            className="rounded-md border border-[var(--border-color)] bg-[var(--background-alt)] p-2 text-muted transition-colors hover:text-foreground"
            aria-label="Open navigation menu"
          >
            <MenuIcon />
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden">
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/45"
            aria-label="Close navigation menu"
            onClick={onClose}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[min(84vw,320px)] flex-col gap-6 border-r border-[var(--border-color)] px-5 py-6 glass shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CLLogo size={26} />
                <div className="brand select-none text-[18px]">CareerLift</div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-[var(--border-color)] bg-[var(--background-alt)] p-2 text-muted transition-colors hover:text-foreground"
                aria-label="Close navigation menu"
              >
                <CloseIcon />
              </button>
            </div>

            <SidebarNav pathname={pathname} collapsed={false} onNavigate={onClose} />

            <div className="mt-auto text-[10px] uppercase tracking-[0.2em] text-muted">
              Career workspace
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setCollapsed(true);
    window.addEventListener("careerlift:sidebar-collapse", handler);
    return () =>
      window.removeEventListener("careerlift:sidebar-collapse", handler);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  return (
    <>
      <MobileSidebar
        pathname={pathname}
        open={mobileOpen}
        onOpen={() => setMobileOpen(true)}
        onClose={() => setMobileOpen(false)}
      />
      <DesktopSidebar
        pathname={pathname}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
      />
    </>
  );
}

export default Sidebar;
