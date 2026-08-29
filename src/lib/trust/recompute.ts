// Trust recompute per SRD §8.2 (directive P0.8 + WS4).
// trust = 30 (base) + 20 (ID verified) + 10 × approved skill certs (cap 30)
//       + 5 × completed hires (cap 10) + 4 × employer endorsements (cap 12) → max 100
// Tiers: 0-39 New | 40-59 ID Verified | 60-84 Skill Verified | 85+ Top Pro
import type { PrismaClient } from "@prisma/client";

export interface TrustInputs {
  idVerified: boolean;
  approvedSkillCerts: number;
  completedHires: number;
  endorsements: number;
}

export function computeTrustScore(inputs: TrustInputs): number {
  const base = 30;
  const idBonus = inputs.idVerified ? 20 : 0;
  const skillBonus = Math.min(30, 10 * inputs.approvedSkillCerts);
  const hireBonus = Math.min(10, 5 * inputs.completedHires);
  const endorseBonus = Math.min(12, 4 * inputs.endorsements);
  return Math.min(100, base + idBonus + skillBonus + hireBonus + endorseBonus);
}

export function tierFromScore(score: number): "new" | "id_verified" | "skill_verified" | "top_pro" {
  if (score >= 85) return "top_pro";
  if (score >= 60) return "skill_verified";
  if (score >= 40) return "id_verified";
  return "new";
}

export async function recomputeWorkerTrust(
  db: PrismaClient,
  workerId: string,
): Promise<{ trustScore: number; trustTier: string }> {
  const worker = await db.workerProfile.findUnique({
    where: { id: workerId },
    select: { userId: true },
  });
  if (!worker) return { trustScore: 30, trustTier: "new" };

  const [idApproved, skillCerts, hires, endorsements] = await Promise.all([
    db.verificationDocument.count({
      where: { ownerUserId: worker.userId, docType: "id", status: "approved" },
    }),
    db.verificationDocument.count({
      where: { ownerUserId: worker.userId, docType: "skill_cert", status: "approved" },
    }),
    db.application.count({ where: { workerId, status: "hired" } }),
    db.endorsement.count({ where: { workerId } }),
  ]);

  const trustScore = computeTrustScore({
    idVerified: idApproved > 0,
    approvedSkillCerts: skillCerts,
    completedHires: hires,
    endorsements,
  });
  const trustTier = tierFromScore(trustScore);

  await db.workerProfile.update({ where: { id: workerId }, data: { trustScore, trustTier } });
  return { trustScore, trustTier };
}

export async function recomputeEmployerVerified(
  db: PrismaClient,
  employerProfileId: string,
): Promise<boolean> {
  const employer = await db.employerProfile.findUnique({
    where: { id: employerProfileId },
    select: { userId: true },
  });
  if (!employer) return false;
  const approvedCompany = await db.verificationDocument.count({
    where: { ownerUserId: employer.userId, docType: "company", status: "approved" },
  });
  const isVerified = approvedCompany > 0;
  await db.employerProfile.update({ where: { id: employerProfileId }, data: { isVerified } });
  return isVerified;
}
