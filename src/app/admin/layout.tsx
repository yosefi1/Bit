import { requirePageAdmin } from "@/lib/session";
import { Topbar } from "@/components/shared/Topbar";
import { ADMIN_NAV } from "@/lib/nav";
import type { ReactNode } from "react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requirePageAdmin();
  return (
    <div className="min-h-screen">
      <Topbar
        name={session.user.name}
        username={session.user.username}
        role="ADMIN"
        nav={ADMIN_NAV}
      />
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
