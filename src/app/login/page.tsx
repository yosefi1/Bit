import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "./LoginForm";
import { Zap } from "lucide-react";
import { he } from "@/lib/i18n/he";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await getSession();
  if (session?.user) {
    redirect(session.user.role === "ADMIN" ? "/admin" : "/dashboard");
  }
  const { callbackUrl } = await searchParams;

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-brand-50 via-white to-brand-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <div className="rounded-2xl bg-brand-600 p-3 text-white shadow-lg shadow-brand-200">
            <Zap className="h-7 w-7" />
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">
            {he.login.title}
          </h1>
          <p className="text-sm text-slate-500">{he.login.subtitle}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <LoginForm callbackUrl={callbackUrl} />
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">
          {he.login.help}
        </p>
      </div>
    </div>
  );
}
