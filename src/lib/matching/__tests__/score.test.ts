// Unit tests for computeMatch — SRD §8.1 frozen formula.
// score = 100 × (0.35·S + 0.25·D + 0.15·E + 0.15·W + 0.10·T) + bonus
// Run with: bun test src/lib/matching/__tests__/score.test.ts
import { describe, it, expect } from "bun:test";
import { computeMatch, type MatchInput } from "@/lib/matching/score";
import { haversineKm } from "@/lib/matching/haversine";

// Default input — the "perfect match" baseline. Individual tests mutate
// only the field(s) under test so unrelated components stay at 1.0.
function baseInput(): MatchInput {
  return {
    worker: {
      id: "w1",
      tradeId: "trade-1",
      yearsExp: 5,
      lat: 0,
      lng: 0,
      wageMin: 500,
      wageMax: 700, // workerMid = 600 → within [400, 800]
      shiftPref: "day",
      trustTier: "top_pro",
      maxRadiusKm: 15,
      skills: [
        { skillId: "s1", proficiency: 5 },
        { skillId: "s2", proficiency: 4 },
      ],
    },
    job: {
      id: "j1",
      tradeId: "trade-1",
      wageMin: 400,
      wageMax: 800,
      lat: 0,
      lng: 0, // same point → distKm = 0 → D = 1.0
      shift: "day",
      isUrgent: false,
      skills: [
        { skillId: "s1", required: true },
        { skillId: "s2", required: true },
      ],
    },
    requiredYearsExp: 5, // worker.yearsExp = 5 ≥ required → E = 1.0
    embeddingBonus: 0,
  };
}

describe("computeMatch — perfect match", () => {
  it("all components = 1.0 → score = 100", () => {
    const result = computeMatch(baseInput());
    expect(result.breakdown.S).toBe(1);
    expect(result.breakdown.D).toBe(1);
    expect(result.breakdown.E).toBe(1);
    expect(result.breakdown.W).toBe(1);
    expect(result.breakdown.T).toBe(1);
    expect(result.breakdown.bonus).toBe(0);
    // 100 × (0.35 + 0.25 + 0.15 + 0.15 + 0.10) = 100
    expect(result.score).toBe(100);
  });
});

describe("computeMatch — skill overlap (S)", () => {
  it("zero overlap → S = 0", () => {
    const input = baseInput();
    input.worker.skills = [{ skillId: "other-skill", proficiency: 5 }];
    const result = computeMatch(input);
    expect(result.breakdown.S).toBe(0);
  });

  it("partial overlap (1 of 2) → S = 0.5", () => {
    const input = baseInput();
    input.worker.skills = [{ skillId: "s1", proficiency: 5 }];
    const result = computeMatch(input);
    expect(result.breakdown.S).toBe(0.5);
  });

  it("full overlap (all required) → S = 1.0", () => {
    const input = baseInput();
    const result = computeMatch(input);
    expect(result.breakdown.S).toBe(1);
  });

  it("non-required skills ignored in S", () => {
    const input = baseInput();
    // Job has one required + one optional; worker has both + an extra
    input.job.skills = [
      { skillId: "s1", required: true },
      { skillId: "s2", required: false },
    ];
    input.worker.skills = [
      { skillId: "s1", proficiency: 5 },
      { skillId: "s2", proficiency: 4 },
      { skillId: "s3", proficiency: 3 },
    ];
    const result = computeMatch(input);
    // Only s1 is required; worker has it → S = 1/1 = 1
    expect(result.breakdown.S).toBe(1);
  });
});

describe("computeMatch — distance decay (D)", () => {
  it("distance ≤ 5km → D = 1.0", () => {
    const input = baseInput();
    input.worker.lat = 0;
    input.worker.lng = 0;
    input.job.lat = 0; // same point
    input.job.lng = 0;
    const dist = haversineKm(0, 0, 0, 0);
    expect(dist).toBeLessThanOrEqual(5);
    const result = computeMatch(input);
    expect(result.breakdown.D).toBe(1.0);
  });

  it("distance = worker.maxRadiusKm → D = 0", () => {
    const input = baseInput();
    input.worker.maxRadiusKm = 15;
    input.worker.lat = 0;
    input.worker.lng = 0;
    // Find a latitude that produces exactly 15 km.
    const targetKm = 15;
    const lat = (targetKm * 180) / (6371 * Math.PI);
    const actualDist = haversineKm(0, 0, lat, 0);
    // Confirm we landed close to 15 km so the test is meaningful.
    expect(Math.abs(actualDist - targetKm)).toBeLessThan(0.01);
    input.job.lat = lat;
    input.job.lng = 0;
    const result = computeMatch(input);
    // maxDist = max(6, 15) = 15; distKm = 15 → distKm >= maxDist → D = 0
    expect(result.breakdown.D).toBe(0);
  });

  it("distance past worker.maxRadiusKm → D = 0", () => {
    const input = baseInput();
    input.worker.maxRadiusKm = 15;
    input.worker.lat = 0;
    input.worker.lng = 0;
    input.job.lat = 0.5; // ≈ 55 km, way past 15 km
    input.job.lng = 0;
    const dist = haversineKm(0, 0, 0.5, 0);
    expect(dist).toBeGreaterThan(15);
    const result = computeMatch(input);
    expect(result.breakdown.D).toBe(0);
  });

  it("distance midpoint (≈10km with maxRadius=15) → D ≈ 0.5", () => {
    const input = baseInput();
    input.worker.maxRadiusKm = 15;
    input.worker.lat = 0;
    input.worker.lng = 0;
    // maxDist = max(6, 15) = 15. Midpoint between 5 and 15 = 10 km.
    const targetKm = 10;
    const lat = (targetKm * 180) / (6371 * Math.PI);
    const actualDist = haversineKm(0, 0, lat, 0);
    expect(Math.abs(actualDist - targetKm)).toBeLessThan(0.01);
    input.job.lat = lat;
    input.job.lng = 0;
    const result = computeMatch(input);
    // D = 1 - (10 - 5) / (15 - 5) = 0.5
    expect(result.breakdown.D).toBeCloseTo(0.5, 5);
  });
});

describe("computeMatch — wage alignment (W)", () => {
  it("worker midrange within job range → W = 1.0", () => {
    const input = baseInput();
    // job: wageMin=400, wageMax=800
    // worker midrange = 600 → within [400, 800] → W = 1.0
    input.worker.wageMin = 500;
    input.worker.wageMax = 700;
    const result = computeMatch(input);
    expect(result.breakdown.W).toBe(1.0);
  });

  it("worker midrange exactly at job.wageMax (just below +10%) → W = 1.0", () => {
    const input = baseInput();
    // job.wageMax = 800 → workerMid = 800 → matches `<= job.wageMax` branch
    input.worker.wageMin = 800;
    input.worker.wageMax = 800;
    const result = computeMatch(input);
    expect(result.breakdown.W).toBe(1.0);
  });

  it("worker midrange exactly at +10% boundary → W = 0.6", () => {
    const input = baseInput();
    // job.wageMax = 800 → +10% = 880 → workerMid = 880 → matches second branch
    input.worker.wageMin = 880;
    input.worker.wageMax = 880;
    const result = computeMatch(input);
    expect(result.breakdown.W).toBe(0.6);
  });

  it("worker midrange just above +10% boundary → W = 0.2", () => {
    const input = baseInput();
    // workerMid = 881 → 881 > 880 → W = 0.2
    input.worker.wageMin = 881;
    input.worker.wageMax = 881;
    const result = computeMatch(input);
    expect(result.breakdown.W).toBe(0.2);
  });
});

describe("computeMatch — experience (E)", () => {
  it("exp ≥ required → E = 1.0", () => {
    const input = baseInput();
    input.worker.yearsExp = 5;
    input.requiredYearsExp = 5;
    const result = computeMatch(input);
    expect(result.breakdown.E).toBe(1.0);
  });

  it("exp within 1 yr below required → E = 0.7", () => {
    const input = baseInput();
    input.worker.yearsExp = 4;
    input.requiredYearsExp = 5; // 4 >= 5-1 = 4 → E = 0.7
    const result = computeMatch(input);
    expect(result.breakdown.E).toBe(0.7);
  });

  it("exp well below required → E = 0.3", () => {
    const input = baseInput();
    input.worker.yearsExp = 1;
    input.requiredYearsExp = 5; // 1 < 4 → E = 0.3
    const result = computeMatch(input);
    expect(result.breakdown.E).toBe(0.3);
  });
});

describe("computeMatch — trust tier (T)", () => {
  it("trust tier 'new' → T = 0.2", () => {
    const input = baseInput();
    input.worker.trustTier = "new";
    const result = computeMatch(input);
    expect(result.breakdown.T).toBe(0.2);
  });

  it("trust tier 'id_verified' → T = 0.5", () => {
    const input = baseInput();
    input.worker.trustTier = "id_verified";
    const result = computeMatch(input);
    expect(result.breakdown.T).toBe(0.5);
  });

  it("trust tier 'skill_verified' → T = 0.8", () => {
    const input = baseInput();
    input.worker.trustTier = "skill_verified";
    const result = computeMatch(input);
    expect(result.breakdown.T).toBe(0.8);
  });

  it("trust tier 'top_pro' → T = 1.0", () => {
    const input = baseInput();
    input.worker.trustTier = "top_pro";
    const result = computeMatch(input);
    expect(result.breakdown.T).toBe(1.0);
  });
});

describe("computeMatch — bonus (MAT-04)", () => {
  it("no embeddingBonus → bonus = 0", () => {
    const input = baseInput();
    delete input.embeddingBonus;
    const result = computeMatch(input);
    expect(result.breakdown.bonus).toBe(0);
  });

  it("embeddingBonus = 3 → bonus = 3 (within cap of 5)", () => {
    const input = baseInput();
    input.embeddingBonus = 3;
    const result = computeMatch(input);
    expect(result.breakdown.bonus).toBe(3);
  });

  it("embeddingBonus capped at +5", () => {
    const input = baseInput();
    input.embeddingBonus = 10;
    const result = computeMatch(input);
    expect(result.breakdown.bonus).toBe(5);
  });

  it("negative embeddingBonus clamped to 0", () => {
    const input = baseInput();
    input.embeddingBonus = -2;
    const result = computeMatch(input);
    expect(result.breakdown.bonus).toBe(0);
  });
});

describe("computeMatch — score clamping", () => {
  it("score never exceeds 100 even with bonus", () => {
    const input = baseInput();
    input.embeddingBonus = 5;
    // raw = 100 (perfect) + bonus = 5 → clamp to 100
    const result = computeMatch(input);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBe(100);
  });

  it("score never goes below 0", () => {
    const input = baseInput();
    // zero everything
    input.worker.skills = [];
    input.worker.yearsExp = 0;
    input.worker.trustTier = "new";
    input.worker.wageMin = 99999;
    input.worker.wageMax = 99999;
    input.worker.lat = 90;
    input.worker.lng = 180;
    input.job.lat = -90;
    input.job.lng = -180;
    const result = computeMatch(input);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});
