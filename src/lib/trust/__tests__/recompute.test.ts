// Unit tests for computeTrustScore + tierFromScore — SRD §8.2 frozen formula.
// trust = 30 (base) + 20 (ID verified) + 10 × approved skill certs (cap 30)
//       + 5 × completed hires (cap 10) + 4 × employer endorsements (cap 12)
//       → max 100
// Tiers: 0-39 New | 40-59 ID Verified | 60-84 Skill Verified | 85+ Top Pro
//
// Run with: bun test src/lib/trust/__tests__/recompute.test.ts
import { describe, it, expect } from "bun:test";
import {
  computeTrustScore,
  tierFromScore,
  type TrustInputs,
} from "@/lib/trust/recompute";

function baseInputs(): TrustInputs {
  return {
    idVerified: false,
    approvedSkillCerts: 0,
    completedHires: 0,
    endorsements: 0,
  };
}

describe("computeTrustScore — base", () => {
  it("no inputs → 30 (base only)", () => {
    expect(computeTrustScore(baseInputs())).toBe(30);
  });
});

describe("computeTrustScore — ID verification", () => {
  it("ID verified only → 50 (30 + 20)", () => {
    const i = baseInputs();
    i.idVerified = true;
    expect(computeTrustScore(i)).toBe(50);
  });
});

describe("computeTrustScore — skill certs", () => {
  it("ID + 1 skill cert → 60 (30 + 20 + 10)", () => {
    const i = baseInputs();
    i.idVerified = true;
    i.approvedSkillCerts = 1;
    expect(computeTrustScore(i)).toBe(60);
  });

  it("ID + 2 skill certs → 70", () => {
    const i = baseInputs();
    i.idVerified = true;
    i.approvedSkillCerts = 2;
    expect(computeTrustScore(i)).toBe(70);
  });

  it("ID + 3 skill certs (cap 30) → 80", () => {
    const i = baseInputs();
    i.idVerified = true;
    i.approvedSkillCerts = 3;
    // 30 + 20 + min(30, 10*3=30) = 80
    expect(computeTrustScore(i)).toBe(80);
  });

  it("ID + 4 skill certs still capped at 80 (cap 30 on skill bonus)", () => {
    const i = baseInputs();
    i.idVerified = true;
    i.approvedSkillCerts = 4; // would be 40 uncapped
    // 30 + 20 + min(30, 40) = 80
    expect(computeTrustScore(i)).toBe(80);
  });
});

describe("computeTrustScore — completed hires", () => {
  it("ID + 1 hire → 55 (30 + 20 + 5)", () => {
    const i = baseInputs();
    i.idVerified = true;
    i.completedHires = 1;
    expect(computeTrustScore(i)).toBe(55);
  });

  it("ID + 2 hires (cap 10 reached) → 60", () => {
    const i = baseInputs();
    i.idVerified = true;
    i.completedHires = 2; // 5*2 = 10, at cap
    expect(computeTrustScore(i)).toBe(60);
  });

  it("ID + 5 hires still capped at 60 (cap 10 on hire bonus)", () => {
    const i = baseInputs();
    i.idVerified = true;
    i.completedHires = 5; // would be 25 uncapped
    expect(computeTrustScore(i)).toBe(60);
  });
});

describe("computeTrustScore — endorsements", () => {
  it("ID + 1 endorsement → 54 (30 + 20 + 4)", () => {
    const i = baseInputs();
    i.idVerified = true;
    i.endorsements = 1;
    expect(computeTrustScore(i)).toBe(54);
  });

  it("ID + 3 endorsements (cap 12 reached) → 62", () => {
    const i = baseInputs();
    i.idVerified = true;
    i.endorsements = 3; // 4*3 = 12, at cap
    expect(computeTrustScore(i)).toBe(62);
  });

  it("ID + 5 endorsements still capped at 62 (cap 12 on endorse bonus)", () => {
    const i = baseInputs();
    i.idVerified = true;
    i.endorsements = 5; // would be 20 uncapped
    expect(computeTrustScore(i)).toBe(62);
  });
});

describe("computeTrustScore — full combo + clamp", () => {
  it("ID + 3 certs + 2 hires + 3 endorsements → 102 → clamped to 100", () => {
    const i: TrustInputs = {
      idVerified: true, // +20
      approvedSkillCerts: 3, // +30 (at cap)
      completedHires: 2, // +10 (at cap)
      endorsements: 3, // +12 (at cap)
    };
    // 30 + 20 + 30 + 10 + 12 = 102 → clamp to 100
    expect(computeTrustScore(i)).toBe(100);
  });

  it("absurd over-cap inputs still clamp to 100", () => {
    const i: TrustInputs = {
      idVerified: true,
      approvedSkillCerts: 100,
      completedHires: 100,
      endorsements: 100,
    };
    expect(computeTrustScore(i)).toBe(100);
  });

  it("3 certs without ID → 60 (no ID bonus)", () => {
    const i = baseInputs();
    i.approvedSkillCerts = 3; // +30
    // 30 + 0 + 30 = 60
    expect(computeTrustScore(i)).toBe(60);
  });
});

describe("tierFromScore — boundaries", () => {
  it("score 0 → new", () => {
    expect(tierFromScore(0)).toBe("new");
  });

  it("score 39 → new", () => {
    expect(tierFromScore(39)).toBe("new");
  });

  it("score 40 → id_verified", () => {
    expect(tierFromScore(40)).toBe("id_verified");
  });

  it("score 59 → id_verified", () => {
    expect(tierFromScore(59)).toBe("id_verified");
  });

  it("score 60 → skill_verified", () => {
    expect(tierFromScore(60)).toBe("skill_verified");
  });

  it("score 84 → skill_verified", () => {
    expect(tierFromScore(84)).toBe("skill_verified");
  });

  it("score 85 → top_pro", () => {
    expect(tierFromScore(85)).toBe("top_pro");
  });

  it("score 100 → top_pro", () => {
    expect(tierFromScore(100)).toBe("top_pro");
  });
});
