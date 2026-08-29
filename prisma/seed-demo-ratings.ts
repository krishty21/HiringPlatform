// Seed demo ratings (R16) — backdate one HIRED application for the demo worker
// (Ravi) at Priya's job so the worker→employer rating prompt is visible
// immediately (bypasses the 24h cooldown for demo purposes).
//
// This script:
//   1. Finds Ravi (demo worker) + their HIRED application at one of Priya's jobs
//      (creates one if none exists — marks an existing application as hired +
//      backdates hiredAt to 25h ago).
//   2. Optionally inserts a sample employer→worker rating for the same
//      application so both directions are demonstrable on the same page.
//
// Idempotent: skips if Ravi already has a hired application that's 24h+ old.
// Run: bun run tsx prisma/seed-demo-ratings.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  // Find Ravi (worker demo) — the seeded demo account uses ravi@shramsetu.demo
  const raviUser = await db.user.findFirst({
    where: { email: "ravi@shramsetu.demo" },
  });
  if (!raviUser) {
    console.log("✗ Demo worker user not found. Run `bun run db:seed` first.");
    return;
  }
  const raviProfile = await db.workerProfile.findUnique({
    where: { userId: raviUser.id },
  });
  if (!raviProfile) {
    console.log("✗ Ravi worker profile not found.");
    return;
  }

  // Find Priya (employer demo)
  const priyaUser = await db.user.findFirst({
    where: { email: "priya@shramsetu.demo" },
  });
  if (!priyaUser) {
    console.log("✗ Demo employer user not found. Run `bun run db:seed` first.");
    return;
  }
  const priyaProfile = await db.employerProfile.findUnique({
    where: { userId: priyaUser.id },
  });
  if (!priyaProfile) {
    console.log("✗ Priya employer profile not found.");
    return;
  }

  // Look for an existing hired application at one of Priya's jobs where Ravi
  // is the worker. If none, take the most recent Ravi×Priya application and
  // mark it as hired (backdated 25h ago).
  let app = await db.application.findFirst({
    where: {
      workerId: raviProfile.id,
      status: "hired",
      job: { employerId: priyaProfile.id },
    },
    orderBy: { hiredAt: "desc" },
  });

  if (!app) {
    // Find any Ravi×Priya application to promote.
    const candidate = await db.application.findFirst({
      where: {
        workerId: raviProfile.id,
        job: { employerId: priyaProfile.id },
      },
      orderBy: { appliedAt: "desc" },
    });
    if (!candidate) {
      console.log("✗ No Ravi×Priya application to promote. Run `bun run db:seed` first.");
      return;
    }
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
    app = await db.application.update({
      where: { id: candidate.id },
      data: {
        status: "hired",
        shortlistedAt: candidate.shortlistedAt ?? new Date(twentyFiveHoursAgo.getTime() - 3 * 60 * 60 * 1000),
        interviewAt: candidate.interviewAt ?? new Date(twentyFiveHoursAgo.getTime() - 2 * 60 * 60 * 1000),
        offerAt: candidate.offerAt ?? new Date(twentyFiveHoursAgo.getTime() - 1 * 60 * 60 * 1000),
        hiredAt: twentyFiveHoursAgo,
      },
    });
    console.log(`✓ Promoted application ${app.id} to HIRED (hiredAt = 25h ago).`);
  } else {
    // Backdate if hired less than 24h ago so the prompt is visible.
    const hiredAt = app.hiredAt!;
    if (Date.now() - hiredAt.getTime() < 25 * 60 * 60 * 1000) {
      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
      app = await db.application.update({
        where: { id: app.id },
        data: { hiredAt: twentyFiveHoursAgo },
      });
      console.log(`✓ Backdated existing HIRED application ${app.id} (hiredAt = 25h ago).`);
    } else {
      console.log(`✓ HIRED application ${app.id} already exists with hiredAt 24h+ ago.`);
    }
  }

  // Seed a sample employer→worker rating (Priya rates Ravi) if not yet present.
  const existingEmployerRating = await db.rating.findFirst({
    where: { applicationId: app.id, raterId: priyaUser.id },
  });

  if (!existingEmployerRating) {
    await db.rating.create({
      data: {
        applicationId: app.id,
        raterId: priyaUser.id,
        rateeId: raviUser.id,
        score: 5,
        comment: "Skilled electrician. Showed up on time and finished the panel work ahead of schedule. Would hire again.",
      },
    });
    console.log(`✓ Seeded sample employer→worker rating (Priya→Ravi, 5 stars).`);
  } else {
    console.log(`✓ Employer→worker rating already exists for app ${app.id}.`);
  }

  console.log("\nDemo rating seed complete. Visit /applications/[id] as Ravi or /employer/candidates/[ravi-profile-id] as Priya to see the rating UI.");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
