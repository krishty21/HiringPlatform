# 🚀 Deployment Guide: ShramSetu

This guide will walk you through deploying your Next.js application to **Vercel** and setting up a production-ready **Supabase (PostgreSQL)** database.

## Prerequisites

1. A [GitHub](https://github.com) account.
2. A [Vercel](https://vercel.com) account.
3. A [Supabase](https://supabase.com) account.
4. Your repository successfully pushed to GitHub.

---

## 1. Set Up Your Supabase Database

Since Vercel is a serverless platform, local SQLite databases cannot be used. We have configured the application to use PostgreSQL.

1. Log in to [Supabase](https://supabase.com) and create a **New Project**.
2. Create a strong database password (save it, you'll need it!).
3. Wait a few minutes for the database to provision.
4. Go to **Project Settings -> Database**.
5. Scroll down to **Connection String** -> **URI**.
6. Note down both the **Transaction pooling** connection string (for `DATABASE_URL`) and the **Session pooling / Direct connection** string (for `DIRECT_URL`).
   - Replace the `[YOUR-PASSWORD]` part of the string with the password you created in Step 2.

## 2. Push Your Database Schema

Before deploying, you need to sync your Prisma schema to your new Supabase database.

1. In your local project, open your `.env` file.
2. Update the variables with your Supabase credentials (you can refer to `.env.example` as a template):
   ```env
   DATABASE_URL="postgresql://postgres.[YOUR_PROJECT_REF]:[YOUR_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.[YOUR_PROJECT_REF]:[YOUR_PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
   ```
3. Open your terminal in the project directory and run:
   ```bash
   npm run db:push
   ```
   *(This applies all your tables and columns to your Supabase project).*
4. (Optional) Seed the database with demo data:
   ```bash
   npm run db:seed
   ```

## 3. Deploy to Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New... -> Project**.
2. Import the GitHub repository for this project.
3. In the **Configure Project** screen, leave the default settings (Framework Preset: Next.js).
4. Expand the **Environment Variables** section. You must add the following variables:
   - `DATABASE_URL`: (Your Supabase pooled connection string)
   - `DIRECT_URL`: (Your Supabase direct connection string)
   - `NEXTAUTH_SECRET`: (A strong random string. E.g., `shramsetu-secret-key` or run `openssl rand -base64 32` to generate a secure one)
   - `NEXTAUTH_URL`: (The URL of your Vercel deployment. E.g., `https://your-project-name.vercel.app`)
5. Click **Deploy**.

Vercel will automatically run the `postinstall` script to generate the Prisma client and then build your Next.js application.

🎉 **Congratulations! Your application is now live.**
