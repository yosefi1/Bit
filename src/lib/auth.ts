import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { writeAuditLog } from "./audit";
import { normalizeUsername } from "./username";
import type { Role } from "@prisma/client";

/**
 * NextAuth configuration. Uses Credentials provider (username + password).
 * Sessions are JWT-based (works on Vercel edge & serverless without a DB
 * session store).
 */
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials.password) return null;

        const user = await prisma.user.findUnique({
          where: { username: normalizeUsername(credentials.username) },
        });
        if (!user) return null;
        if (user.status !== "ACTIVE") return null;

        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) return null;

        // Fire and forget audit log
        writeAuditLog({
          userId: user.id,
          action: "user.login",
          entityType: "User",
          entityId: user.id,
        }).catch(() => {});

        return {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
          apartmentId: user.apartmentId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role: Role }).role;
        token.username = (user as { username: string }).username;
        token.apartmentId =
          (user as { apartmentId: string | null }).apartmentId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.username = token.username as string;
        session.user.apartmentId =
          (token.apartmentId as string | null | undefined) ?? null;
      }
      return session;
    },
  },
};
