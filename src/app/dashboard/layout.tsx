import { requirePageSession } from "@/lib/session";
import { Topbar } from "@/components/shared/Topbar";
import { TENANT_NAV } from "@/lib/nav";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

export default async function TenantLayout({ children }: { children: ReactNode }) {
  const session = await requirePageSession();
  if (session.user.role === "ADMIN") redirect("/admin");

  return (
    <div className="min-h-screen">
      <Topbar
        name={session.user.name}
        username={session.user.username}
        role="TENANT"
        nav={TENANT_NAV}
      />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
