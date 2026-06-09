import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";
import type { Session } from "next-auth";
import { ApiError } from "./api";

export async function getSession(): Promise<Session | null> {
  return getServerSession(authOptions);
}

/* ---------------- Page helpers (use in Server Components) -------------- */
/* These redirect on failure, which is what users expect when navigating.  */

export async function requirePageSession(): Promise<Session> {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requirePageAdmin(): Promise<Session> {
  const session = await requirePageSession();
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  return session;
}

export async function requirePageTenant(): Promise<Session> {
  const session = await requirePageSession();
  if (session.user.role !== "TENANT") redirect("/admin");
  if (!session.user.apartmentId) redirect("/dashboard");
  return session;
}

/* --------- API/Route-handler helpers — throw ApiError on failure ------- */
/* These return proper JSON 401/403 responses via errorResponse().         */

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session?.user) throw new ApiError("UNAUTHORIZED", "נדרשת התחברות.");
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (session.user.role !== "ADMIN")
    throw new ApiError("FORBIDDEN", "נדרשת הרשאת מנהל.");
  return session;
}

export async function requireTenant(): Promise<Session> {
  const session = await requireSession();
  if (session.user.role !== "TENANT" || !session.user.apartmentId) {
    throw new ApiError("FORBIDDEN", "נדרשת הרשאת דייר.");
  }
  return session;
}
