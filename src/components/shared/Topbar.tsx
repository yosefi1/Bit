"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Zap, LogOut, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { he } from "@/lib/i18n/he";

interface NavItem {
  href: string;
  label: string;
}

export function Topbar({
  name,
  username,
  role,
  nav,
}: {
  name?: string | null;
  username: string;
  role: "ADMIN" | "TENANT";
  nav: NavItem[];
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link
          href={role === "ADMIN" ? "/admin" : "/dashboard"}
          className="flex items-center gap-2 font-semibold text-slate-900"
        >
          <span className="rounded-lg bg-brand-600 p-1.5 text-white">
            <Zap className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">{he.appName}</span>
        </Link>

        <nav className="me-2 hidden gap-1 md:flex">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-3">
          <div className="hidden text-start text-xs leading-tight text-slate-600 sm:block">
            <div className="font-medium text-slate-900">{name ?? username}</div>
            <div className="text-slate-500">
              {he.roles[role]} · @{username}
            </div>
          </div>
          <UserCircle2 className="h-8 w-8 text-slate-400 sm:hidden" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
            title={he.nav.signOut}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{he.nav.signOut}</span>
          </Button>
        </div>
      </div>
      <div className="border-t border-slate-100 md:hidden">
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 py-2">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
