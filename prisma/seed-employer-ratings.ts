// Seed employer ratings (round 8) — fills BOTH directions on every HIRED
// application that lacks them, so employer reputation chips + the
// /jobs "Top employers" filter have real data to show.
//
// Result on the demo dataset:
//   - Priya (Sri Venkateswara Manufacturing): ~3 ratings, avg ~4.7  → Highly rated ✓
//   - Krishna Engineering Works:              ~3 ratings, avg ~5.0  → Highly rated ✓
//   - Coastal Logistics:                      ~2 ratings, avg ~4.5
//   - Every hired worker gets a rating summary on their candidate page.
//
// Idempotent: one rating per (applicationId, raterId) — skips existing rows.
// Run: bun run tsx prisma/seed-employer-ratings.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Deterministic, realistic comments keyed by score.
const WORKER_TO_EMPLOYER_COMMENTS: Record<number, string> = {
  5: "Paid on time, clear instructions, and treated me with respect. Would happily work here again.",
  4: "Good experience overall. Slight delay in wage settlement but fair otherwise.",
  3: "Decent. Site conditions could be better organised.",
};
const EMPLOYER_TO_WORKER_COMMENTS: Record<number, string> = {
  5: "Skilled, punctual and finished the work ahead of schedule. Would hire again.",
  4: "Solid work. Needed a bit of supervision initially but delivered.",
  3: "Adequate. Attendance was inconsistent.",
};

async function main() {
  const hiredApps = await db.application.findMany({
    where: { status: "hired" },
    include: {
      worker: { select: { userId: true, fullName: true } },
      job: { select: { employer: { select: { userId: true, companyName: true } } } },
    },
    orderBy: { hiredAt: "asc" },
  });

  if (hiredApps.length === 0) {
    console.log("✗ No hired applications found. Run `bun run db:seed` first.");
    return;
  }

  let createdW2E = 0;
  let createdE2W = 0;

  for (const app of hiredApps) {
    const workerUserId = app.worker.userId;
    const employerUserId = app.job.employer.userId;

    // Deterministic score per (worker, employer) pair — stable across re-runs.
    const pairHash = [...(workerUserId + employerUserId)].reduce((a, c) => a + c.charCodeAt(0), 0);
    const score = pairHash % 5 === 0 ? 4 : 5; // mostly 5s, some 4s — keeps avgs high

    // Worker → Employer rating
    const hasW2E = await db.rating.findFirst({
      where: { applicationId: app.id, raterId: workerUserId },
    });
    if (!hasW2E) {
      await db.rating.create({
        data: {
          applicationId: app.id,
          raterId: workerUserId,
          rateeId: employerUserId,
          score,
          comment: WORKER_TO_EMPLOYER_COMMENTS[score] ?? "",
        },
      });
      createdW2E++;
    }

    // Employer → Worker rating
    const hasE2W = await db.rating.findFirst({
      where: { applicationId: app.id, raterId: employerUserId },
    });
    if (!hasE2W) {
      await db.rating.create({
        data: {
          applicationId: app.id,
          raterId: employerUserId,
          rateeId: workerUserId,
          score,
          comment: EMPLOYER_TO_WORKER_COMMENTS[score] ?? "",
        },
      });
      createdE2W++;
    }
  }

  console.log(`✓ Created ${createdW2E} worker→employer ratings and ${createdE2W} employer→worker ratings across ${hiredApps.length} hired applications.`);

  // Summary per employer (ratee) for quick verification.
  const employers = await db.employerProfile.findMany({ select: { userId: true, companyName: true } });
  for (const e of employers) {
    const rows = await db.rating.findMany({ where: { rateeId: e.userId }, select: { score: true } });
    if (rows.length > 0) {
      const avg = Math.round((rows.reduce((a, r) => a + r.score, 0) / rows.length) * 10) / 10;
      console.log(`  · ${e.companyName}: ${avg.toFixed(1)} avg from ${rows.length} rating(s)`);
    }
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
