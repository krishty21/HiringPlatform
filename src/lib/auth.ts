// NextAuth config — Demo logins + Email/Password credentials provider.
import NextAuth, { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

const DEMO_ACCOUNTS = [
  { id: "demo-worker", email: "ravi@jobhunt.demo", role: "worker" as const, label: "Ravi (Electrician, Skill Verified)" },
  { id: "demo-employer", email: "priya@jobhunt.demo", role: "employer" as const, label: "Priya Manufacturing (Verified)" },
  { id: "demo-admin", email: "admin@jobhunt.demo", role: "admin" as const, label: "Admin Demo" },
];

export const DEMO_LOGINS = DEMO_ACCOUNTS;

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    // Demo one-click logins (no password)
    Credentials({
      id: "demo",
      name: "Demo login",
      credentials: { demoId: { label: "Demo account", type: "text" } },
      async authorize(credentials) {
        const id = credentials?.demoId;
        if (!id) return null;
        const account = DEMO_ACCOUNTS.find(d => d.id === id);
        if (!account) return null;
        const user = await db.user.upsert({
          where: { id: account.id },
          update: { email: account.email, role: account.role },
          create: { id: account.id, email: account.email, role: account.role, name: account.label.split(" ")[0] },
        });
        return { id: user.id, email: user.email, role: account.role, name: user.name ?? account.label };
      },
    }),

    // Email + Password login
    Credentials({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

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
  secret: process.env.NEXTAUTH_SECRET ?? "jobhunt-dev-secret-please-rotate",
};

export default NextAuth(authOptions);
