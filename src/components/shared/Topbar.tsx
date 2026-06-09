"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Zap, LogOut, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { he } from "@/lib/i18n/he";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
}

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ href, label }: NavItem) {
  const pathname = usePathname();
  const active = isNavActive(pathname, href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition",
        active
          ? "bg-brand-600 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      {label}
    </Link>
  );
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
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-3 py-3 sm:px-4">
        <Link
          href={role === "ADMIN" ? "/admin" : "/dashboard"}
          className="flex shrink-0 items-center gap-2 font-semibold text-slate-900"
        >
          <span className="rounded-lg bg-brand-600 p-1.5 text-white">
            <Zap className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">{he.appName}</span>
        </Link>

        <nav className="me-2 hidden min-w-0 flex-1 gap-1 overflow-x-auto md:flex">
          {nav.map((n) => (
            <NavLink key={n.href} {...n} />
          ))}
        </nav>

        <div className="ms-auto flex shrink-0 items-center gap-2 sm:gap-3">
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
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 py-2 [&_a]:text-xs">
          {nav.map((n) => (
            <NavLink key={n.href} {...n} />
          ))}
        </nav>
      </div>
    </header>
  );
}
