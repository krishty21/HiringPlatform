// G4 seed data — SRD §12 P0.3 / G4.
// 20 worker profiles (realistic Telugu names + coastal AP cities)
// 3 employers (one verified), 10 open jobs (2 urgent), 30 applications
// distributed across pipeline stages with realistic timestamps so avg time-to-hire
// computes to a plausible ~26–40 hours.
// Idempotent: delete-then-insert.

import { PrismaClient } from "@prisma/client";
import { computeTrustScore, tierFromScore } from "@/lib/trust/recompute";
import { computeMatch } from "@/lib/matching/score";

const db = new PrismaClient();

// Coastal Andhra Pradesh cities with realistic lat/lng
const CITIES: Record<string, { lat: number; lng: number }> = {
  Bhimavaram: { lat: 16.5417, lng: 81.5233 },
  Tadepalligudem: { lat: 16.8317, lng: 81.5172 },
  Rajahmundry: { lat: 17.0005, lng: 81.8080 },
  Vijayawada: { lat: 16.5062, lng: 80.6480 },
  Visakhapatnam: { lat: 17.6868, lng: 83.2185 },
  Kakinada: { lat: 16.9600, lng: 82.2377 },
};

// Skill taxonomy (en/hi/te)
const SKILLS = [
  { nameEn: "Electrician", nameHi: "बिजलीकार", nameTe: "ఎలక్ట్రీషియన్", category: "electrical" },
  { nameEn: "Plumber", nameHi: "प्लंबर", nameTe: "ప్లంబర్", category: "plumbing" },
  { nameEn: "Welder", nameHi: "वेल्डर", nameTe: "వెల్డర్", category: "welding" },
  { nameEn: "CNC Operator", nameHi: "सीएनसी ऑपरेटर", nameTe: "సీఎన్సీ ఆపరేటర్", category: "machining" },
  { nameEn: "Fitter", nameHi: "फिटर", nameTe: "ఫిటర్", category: "mechanical" },
  { nameEn: "Delivery Executive", nameHi: "डिलीवरी एक्जीक्यूटिव", nameTe: "డెలివరీ ఎగ్జిక్యూటివ్", category: "logistics" },
  { nameEn: "Carpenter", nameHi: "बढ़ई", nameTe: "వడ్రంగి", category: "carpentry" },
  { nameEn: "Mason", nameHi: "राज", nameTe: "కట్టడం", category: "masonry" },
  // sub-skills for richness
  { nameEn: "Wiring", nameHi: "वायरिंग", nameTe: "వైరింగ్", category: "electrical" },
  { nameEn: "Panel Work", nameHi: "पैनल कार्य", nameTe: "పానల్ వర్క్", category: "electrical" },
  { nameEn: "Motor Repair", nameHi: "मोटर रिपेयर", nameTe: "మోటర్ రిపేర్", category: "electrical" },
  { nameEn: "Pipe Fitting", nameHi: "पाइप फिटिंग", nameTe: "పైప్ ఫిట్టింగ్", category: "plumbing" },
  { nameEn: "Arc Welding", nameHi: "आर्क वेल्डिंग", nameTe: "ఆర్క్ వెల్డింగ్", category: "welding" },
  { nameEn: "Gas Welding", nameHi: "गैस वेल्डिंग", nameTe: "గ్యాస్ వెల్డింగ్", category: "welding" },
  { nameEn: "Lathe Operation", nameHi: "लेथ ऑपरेशन", nameTe: "లేత్ ఆపరేషన్", category: "machining" },
  { nameEn: "Cabinet Making", nameHi: "कैबिनेट निर्माण", nameTe: "క్యాబినెట్ మేకింగ్", category: "carpentry" },
];

const WORKERS = [
  { name: "Ravi Kumar", trade: "Electrician", city: "Bhimavaram", years: 8, wage: [800, 1000], available: true, tier: "skill_verified" as const, skillIds: ["Electrician","Wiring","Panel Work"] },
  { name: "Suresh Babu", trade: "Plumber", city: "Bhimavaram", years: 6, wage: [700, 900], available: true, tier: "skill_verified" as const, skillIds: ["Plumber","Pipe Fitting"] },
  { name: "Venkatesh Rao", trade: "Welder", city: "Tadepalligudem", years: 10, wage: [900, 1200], available: false, tier: "top_pro" as const, skillIds: ["Welder","Arc Welding","Gas Welding"] },
  { name: "Mahesh Reddy", trade: "CNC Operator", city: "Rajahmundry", years: 5, wage: [850, 1100], available: true, tier: "skill_verified" as const, skillIds: ["CNC Operator","Lathe Operation"] },
  { name: "Naveen Kumar", trade: "Fitter", city: "Vijayawada", years: 7, wage: [750, 950], available: true, tier: "id_verified" as const, skillIds: ["Fitter"] },
  { name: "Anil Kumar", trade: "Delivery Executive", city: "Visakhapatnam", years: 3, wage: [600, 800], available: true, tier: "id_verified" as const, skillIds: ["Delivery Executive"] },
  { name: "Phani Kumar", trade: "Carpenter", city: "Bhimavaram", years: 12, wage: [900, 1400], available: false, tier: "top_pro" as const, skillIds: ["Carpenter","Cabinet Making"] },
  { name: "Krishna Murthy", trade: "Mason", city: "Tadepalligudem", years: 9, wage: [700, 900], available: true, tier: "skill_verified" as const, skillIds: ["Mason"] },
  { name: "Gopi Krishna", trade: "Electrician", city: "Rajahmundry", years: 4, wage: [700, 900], available: true, tier: "id_verified" as const, skillIds: ["Electrician","Motor Repair"] },
  { name: "Sai Ram", trade: "Plumber", city: "Vijayawada", years: 5, wage: [700, 850], available: false, tier: "new" as const, skillIds: ["Plumber","Pipe Fitting"] },
  { name: "Prasad Reddy", trade: "Welder", city: "Visakhapatnam", years: 6, wage: [800, 1100], available: true, tier: "skill_verified" as const, skillIds: ["Welder","Arc Welding"] },
  { name: "Ramesh Babu", trade: "CNC Operator", city: "Kakinada", years: 8, wage: [950, 1200], available: true, tier: "skill_verified" as const, skillIds: ["CNC Operator","Lathe Operation"] },
  { name: "Lakshmi Narayana", trade: "Fitter", city: "Bhimavaram", years: 11, wage: [850, 1100], available: true, tier: "top_pro" as const, skillIds: ["Fitter"] },
  { name: "Satish Kumar", trade: "Delivery Executive", city: "Vijayawada", years: 2, wage: [600, 750], available: true, tier: "new" as const, skillIds: ["Delivery Executive"] },
  { name: "Rajesh Babu", trade: "Carpenter", city: "Rajahmundry", years: 7, wage: [800, 1100], available: false, tier: "id_verified" as const, skillIds: ["Carpenter","Cabinet Making"] },
  { name: "Murali Krishna", trade: "Mason", city: "Visakhapatnam", years: 8, wage: [700, 950], available: true, tier: "skill_verified" as const, skillIds: ["Mason"] },
  { name: "Harikrishna", trade: "Electrician", city: "Tadepalligudem", years: 6, wage: [750, 950], available: true, tier: "id_verified" as const, skillIds: ["Electrician","Wiring"] },
  { name: "Vamsi Krishna", trade: "Welder", city: "Kakinada", years: 4, wage: [700, 900], available: true, tier: "new" as const, skillIds: ["Welder","Gas Welding"] },
  { name: "Pavan Kumar", trade: "CNC Operator", city: "Bhimavaram", years: 9, wage: [1000, 1300], available: false, tier: "skill_verified" as const, skillIds: ["CNC Operator"] },
  { name: "Arun Kumar", trade: "Fitter", city: "Visakhapatnam", years: 5, wage: [750, 1000], available: true, tier: "id_verified" as const, skillIds: ["Fitter"] },
];

const EMPLOYERS = [
  { id: "demo-employer", name: "Priya", company: "Sri Venkateswara Manufacturing", industry: "manufacturing", city: "Vijayawada", verified: true },
  { id: "emp-002", name: "Anjali", company: "Krishna Engineering Works", industry: "fabrication", city: "Bhimavaram", verified: true },
  { id: "emp-003", name: "Vijay", company: "Coastal Logistics Pvt Ltd", industry: "logistics", city: "Visakhapatnam", verified: false },
];

const JOBS = [
  { title: "Urgent Electrician — Wiring & Panel Work", employerIdx: 0, trade: "Electrician", city: "Vijayawada", headcount: 4, wage: [900, 1100], shift: "day" as const, urgent: true, skills: ["Electrician","Wiring","Panel Work"] },
  { title: "Plumber for New Residential Layout", employerIdx: 0, trade: "Plumber", city: "Vijayawada", headcount: 2, wage: [800, 1000], shift: "day" as const, urgent: false, skills: ["Plumber","Pipe Fitting"] },
  { title: "Senior Welder — Fabrication Yard", employerIdx: 1, trade: "Welder", city: "Bhimavaram", headcount: 3, wage: [1000, 1200], shift: "day" as const, urgent: false, skills: ["Welder","Arc Welding","Gas Welding"] },
  { title: "Urgent CNC Operator — Lathe Shop", employerIdx: 1, trade: "CNC Operator", city: "Bhimavaram", headcount: 2, wage: [1000, 1300], shift: "day" as const, urgent: true, skills: ["CNC Operator","Lathe Operation"] },
  { title: "Fitter — Assembly Line", employerIdx: 0, trade: "Fitter", city: "Vijayawada", headcount: 5, wage: [800, 1050], shift: "day" as const, urgent: false, skills: ["Fitter"] },
  { title: "Delivery Executive — Logistics Route", employerIdx: 2, trade: "Delivery Executive", city: "Visakhapatnam", headcount: 6, wage: [700, 900], shift: "day" as const, urgent: false, skills: ["Delivery Executive"] },
  { title: "Carpenter — Furniture Workshop", employerIdx: 1, trade: "Carpenter", city: "Bhimavaram", headcount: 2, wage: [900, 1200], shift: "day" as const, urgent: false, skills: ["Carpenter","Cabinet Making"] },
  { title: "Mason — Construction Site", employerIdx: 0, trade: "Mason", city: "Vijayawada", headcount: 4, wage: [700, 950], shift: "day" as const, urgent: false, skills: ["Mason"] },
  { title: "Electrician — Motor Repair Shop", employerIdx: 1, trade: "Electrician", city: "Bhimavaram", headcount: 2, wage: [800, 1000], shift: "any" as const, urgent: false, skills: ["Electrician","Motor Repair"] },
  { title: "Night-Shift Welder — Shipyard", employerIdx: 2, trade: "Welder", city: "Visakhapatnam", headcount: 3, wage: [950, 1200], shift: "night" as const, urgent: false, skills: ["Welder","Arc Welding"] },
];

const STATUSES = ["applied", "shortlisted", "interview", "offer", "hired", "rejected"] as const;

async function main() {
  // Wipe (idempotent)
  await db.notification.deleteMany();
  await db.matchScore.deleteMany();
  await db.endorsement.deleteMany();
  await db.rating.deleteMany();
  await db.application.deleteMany();
  await db.jobSkill.deleteMany();
  await db.workerSkill.deleteMany();
  await db.verificationDocument.deleteMany();
  await db.job.deleteMany();
  await db.workerProfile.deleteMany();
  await db.employerProfile.deleteMany();
  await db.signinToken.deleteMany();
  await db.skill.deleteMany();
  await db.user.deleteMany();

  // Skills
  const skillMap = new Map<string, string>();
  for (const s of SKILLS) {
    const created = await db.skill.create({ data: s });
    skillMap.set(s.nameEn, created.id);
  }

  // Users + Employers
  const employerProfileIds: string[] = [];
  for (const e of EMPLOYERS) {
    const user = await db.user.create({
      data: {
        id: e.id === "demo-employer" ? "demo-employer" : undefined,
        email: e.id === "demo-employer" ? "priya@shramsetu.demo" : `${e.id}@shramsetu.demo`,
        role: "employer",
        name: e.name,
      },
    });
    const emp = await db.employerProfile.create({
      data: {
        userId: user.id,
        companyName: e.company,
        industry: e.industry,
        city: e.city,
        isVerified: e.verified,
      },
    });
    employerProfileIds.push(emp.id);

    // If employer is verified, insert a verification doc to back it
    if (e.verified) {
      await db.verificationDocument.create({
        data: {
          ownerUserId: user.id,
          docType: "company",
          fileName: "company-registration.pdf",
          fileType: "application/pdf",
          fileUrl: "seed/company-cert.pdf",
          status: "approved",
          reviewerNote: "Auto-approved in seed.",
          reviewedAt: new Date(),
          reviewedBy: "demo-admin",
        },
      });
    }
  }

  // Demo admin user
  await db.user.upsert({
    where: { email: "admin@shramsetu.demo" },
    update: {},
    create: { id: "demo-admin", email: "admin@shramsetu.demo", role: "admin", name: "Admin" },
  });

  // Workers
  const workerProfileIds: string[] = [];
  for (let i = 0; i < WORKERS.length; i++) {
    const w = WORKERS[i];
    const cityData = CITIES[w.city];
    const isDemo = i === 0;
    const user = await db.user.create({
      data: {
        id: isDemo ? "demo-worker" : undefined,
        email: isDemo ? "ravi@shramsetu.demo" : `worker${i+1}@shramsetu.demo`,
        role: "worker",
        name: w.name,
      },
    });

    const tradeId = skillMap.get(w.trade)!;
    // Compute trust score:
    // demo worker (Ravi) gets an approved skill_cert + ID for "skill_verified"
    const idApproved = i === 0;
    const skillCertsApproved = i === 0 ? 1 : (w.tier === "skill_verified" || w.tier === "top_pro" ? 1 : 0);
    const hiresCount = w.tier === "top_pro" ? 2 : w.tier === "skill_verified" ? 1 : 0;
    const endorsements = w.tier === "top_pro" ? 3 : w.tier === "skill_verified" ? 1 : 0;
    const trustScore = computeTrustScore({
      idVerified: idApproved || w.tier !== "new",
      approvedSkillCerts: skillCertsApproved,
      completedHires: hiresCount,
      endorsements,
    });
    const trustTier = tierFromScore(trustScore);

    const wp = await db.workerProfile.create({
      data: {
        userId: user.id,
        fullName: w.name,
        tradeId,
        yearsExp: w.years,
        city: w.city,
        lat: cityData.lat,
        lng: cityData.lng,
        wageMin: w.wage[0],
        wageMax: w.wage[1],
        shiftPref: "day",
        languages: JSON.stringify(["te","en"]),
        bio: `${w.trade} with ${w.years} years of experience in ${w.city}. Available for daily-wage work.`,
        availableToday: w.available,
        trustTier,
        trustScore,
        passportPublic: true,
        profileViews: Math.floor(Math.random() * 12),
        maxRadiusKm: 20,
      },
    });
    workerProfileIds.push(wp.id);

    // Worker skills
    for (const skillName of w.skillIds) {
      const sid = skillMap.get(skillName);
      if (!sid) continue;
      await db.workerSkill.create({
        data: {
          workerId: wp.id,
          skillId: sid,
          proficiency: skillName === w.trade ? 5 : Math.floor(Math.random() * 2) + 3,
        },
      }).catch(() => {});
    }

    // Verification docs for verified workers
    if (idApproved || w.tier !== "new") {
      await db.verificationDocument.create({
        data: {
          ownerUserId: user.id,
          docType: "id",
          fileName: "id-proof.pdf",
          fileType: "application/pdf",
          fileUrl: "seed/id.pdf",
          status: "approved",
          reviewerNote: "Auto-approved in seed.",
          reviewedAt: new Date(),
          reviewedBy: "demo-admin",
        },
      });
    }
    if (skillCertsApproved > 0) {
      await db.verificationDocument.create({
        data: {
          ownerUserId: user.id,
          docType: "skill_cert",
          fileName: "iti-certificate.pdf",
          fileType: "application/pdf",
          fileUrl: "seed/cert.pdf",
          status: "approved",
          reviewerNote: "Auto-approved in seed.",
          reviewedAt: new Date(),
          reviewedBy: "demo-admin",
        },
      });
    }
  }

  // Jobs
  const jobIds: string[] = [];
  for (let i = 0; i < JOBS.length; i++) {
    const j = JOBS[i];
    const cityData = CITIES[j.city];
    const employer = await db.employerProfile.findFirst({ where: { companyName: EMPLOYERS[j.employerIdx].company } });
    if (!employer) continue;
    const tradeId = skillMap.get(j.trade)!;
    const job = await db.job.create({
      data: {
        employerId: employer.id,
        postedBy: employer.userId,
        title: j.title,
        tradeId,
        headcount: j.headcount,
        wageMin: j.wage[0],
        wageMax: j.wage[1],
        city: j.city,
        lat: cityData.lat,
        lng: cityData.lng,
        shift: j.shift,
        isUrgent: j.urgent,
        status: "open",
        description: `${j.urgent ? "Urgent: " : ""}Looking for ${j.headcount} ${j.trade.toLowerCase()} in ${j.city}. Wage ₹${j.wage[0]}-${j.wage[1]}/day, ${j.shift} shift. Verified Skill Passport holders preferred.`,
        viewsCount: Math.floor(Math.random() * 40) + 5,
      },
    });
    jobIds.push(job.id);

    for (const sn of j.skills) {
      const sid = skillMap.get(sn);
      if (!sid) continue;
      await db.jobSkill.create({
        data: { jobId: job.id, skillId: sid, required: sn === j.trade },
      }).catch(() => {});
    }
  }

  // Applications — 30 distributed across pipeline stages with realistic timestamps
  // aim: avg(hired_at - applied_at) over hired apps ≈ 26-40 hours
  const now = Date.now();
  let made = 0;
  for (let i = 0; i < 30 && made < 30; i++) {
    const workerIdx = i % WORKERS.length;
    const jobIdx = (i + Math.floor(i / WORKERS.length)) % JOBS.length;
    const wId = workerProfileIds[workerIdx];
    const jId = jobIds[jobIdx];
    if (!wId || !jId) continue;

    // Distribute statuses roughly: 8 applied, 6 shortlisted, 5 interview, 4 offer, 5 hired, 2 rejected
    let status: typeof STATUSES[number];
    if (i < 8) status = "applied";
    else if (i < 14) status = "shortlisted";
    else if (i < 19) status = "interview";
    else if (i < 23) status = "offer";
    else if (i < 28) status = "hired";
    else status = "rejected";

    const appliedAt = new Date(now - (1 + (i % 14)) * 24 * 60 * 60 * 1000); // 1-14 days ago
    const stageLag = (hours: number) => new Date(appliedAt.getTime() + hours * 60 * 60 * 1000);

    try {
      await db.application.create({
        data: {
          jobId: jId,
          workerId: wId,
          status,
          appliedAt,
          shortlistedAt: status !== "applied" ? stageLag(6 + (i % 8)) : null,
          interviewAt: ["interview","offer","hired"].includes(status) ? stageLag(18 + (i % 12)) : null,
          offerAt: ["offer","hired"].includes(status) ? stageLag(24 + (i % 18)) : null,
          hiredAt: status === "hired" ? stageLag(28 + (i % 14)) : null,
          rejectedAt: status === "rejected" ? stageLag(12 + (i % 10)) : null,
        },
      });
      made++;
    } catch {
      // unique violation (already applied) — skip
    }
  }

  // Pre-compute match scores for the demo path (Ravi × urgent electrician job)
  // and a handful of high-quality matches for the dashboard sparklines.
  const raviId = workerProfileIds[0];
  const ravi = await db.workerProfile.findUnique({
    where: { id: raviId },
    include: { skills: true, trade: true },
  });
  if (ravi) {
    for (const jId of jobIds) {
      const job = await db.job.findUnique({ where: { id: jId }, include: { skills: true } });
      if (!job || !ravi) continue;
      const score = computeMatch({
        worker: {
          id: ravi.id,
          tradeId: ravi.tradeId,
          yearsExp: ravi.yearsExp,
          lat: ravi.lat,
          lng: ravi.lng,
          wageMin: ravi.wageMin,
          wageMax: ravi.wageMax,
          shiftPref: ravi.shiftPref,
          trustTier: ravi.trustTier,
          maxRadiusKm: ravi.maxRadiusKm,
          skills: ravi.skills.map(s => ({ skillId: s.skillId, proficiency: s.proficiency })),
        },
        job: {
          id: job.id,
          tradeId: job.tradeId,
          wageMin: job.wageMin,
          wageMax: job.wageMax,
          lat: job.lat,
          lng: job.lng,
          shift: job.shift,
          isUrgent: job.isUrgent,
          skills: job.skills.map(s => ({ skillId: s.skillId, required: s.required })),
        },
        requiredYearsExp: 1,
      });
      await db.matchScore.upsert({
        where: { jobId_workerId: { jobId: jId, workerId: raviId } },
        update: { score: score.score, breakdownJson: JSON.stringify(score.breakdown), computedAt: new Date() },
        create: { jobId: jId, workerId: raviId, score: score.score, breakdownJson: JSON.stringify(score.breakdown) },
      });
    }
  }

  console.log(`Seed complete: ${WORKERS.length} workers, ${EMPLOYERS.length} employers, ${JOBS.length} jobs, ${made} applications.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
