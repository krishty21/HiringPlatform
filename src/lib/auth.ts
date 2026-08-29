// NextAuth config — Credentials provider backed by the seeded users + Demo Login.
// Per directive §12: demo login behind NEXT_PUBLIC_DEMO_MODE=true (default true in dev).
// The "magic-link" concept is preserved by a SigninToken table for future email flows.
import NextAuth, { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";

const DEMO_ACCOUNTS = [
  { id: "demo-worker", email: "ravi@shramsetu.demo", role: "worker" as const, label: "Ravi (Electrician, Skill Verified)" },
  { id: "demo-employer", email: "priya@shramsetu.demo", role: "employer" as const, label: "Priya Manufacturing (Verified)" },
  { id: "demo-admin", email: "admin@shramsetu.demo", role: "admin" as const, label: "Admin Demo" },
];

export const DEMO_LOGINS = DEMO_ACCOUNTS;

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      id: "demo",
      name: "Demo login",
      credentials: { demoId: { label: "Demo account", type: "text" } },
      async authorize(credentials) {
        const id = credentials?.demoId;
        if (!id) return null;
        const account = DEMO_ACCOUNTS.find(d => d.id === id);
        if (!account) return null;
        // upsert the seeded user so we always have a row
        const user = await db.user.upsert({
          where: { email: account.email },
          update: { role: account.role },
          create: { id: account.id, email: account.email, role: account.role, name: account.label.split(" ")[0] },
        });
        return { id: user.id, email: user.email, role: account.role, name: user.name ?? account.label };
      },
    }),
    Credentials({
      id: "email",
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        token: { label: "Magic link token", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const token = credentials?.token;
        if (!email || !token) return null;
        const found = await db.signinToken.findUnique({ where: { token }, include: { user: true } });
        if (!found) return null;
        if (found.email !== email) return null;
        if (found.expiresAt < new Date()) return null;
        if (found.usedAt) return null;
        await db.signinToken.update({ where: { id: found.id }, data: { usedAt: new Date() } });
        return found.user
          ? { id: found.user.id, email: found.user.email, role: found.user.role as any, name: found.user.name ?? undefined }
          : null;
      },
    }),
    Credentials({
      id: "email-only",
      name: "Email only",
      credentials: { email: { label: "Email", type: "email" } },
      async authorize(credentials) {
        // Allow any email to sign in as a fresh worker (demo convenience).
        // In production this would be the magic-link send step; here, we auto-create.
        const email = credentials?.email?.trim().toLowerCase();
        if (!email) return null;
        const user = await db.user.upsert({
          where: { email },
          update: {},
          create: { email, role: "worker" },
        });
        return { id: user.id, email: user.email, role: user.role as any, name: user.name ?? undefined };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id!;
        token.role = (user as any).role ?? "worker";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.uid;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET ?? "shramsetu-dev-secret-please-rotate",
};

export default NextAuth(authOptions);
