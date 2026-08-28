// ShramSetu — frozen zod schemas (shared client/server)
// Per directive P0.4: nothing in the repo hand-rolls these shapes.
import { z } from "zod";

// ---- enums (SQLite has none; zod is the boundary) ----
export const roleEnum = z.enum(["worker", "employer", "admin"]);
export const trustTierEnum = z.enum(["new", "id_verified", "skill_verified", "top_pro"]);
export const applicationStatusEnum = z.enum([
  "applied", "shortlisted", "interview", "offer", "hired", "rejected",
]);
export const docTypeEnum = z.enum(["id", "skill_cert", "company"]);
export const verificationStatusEnum = z.enum(["pending", "approved", "rejected"]);
export const shiftEnum = z.enum(["day", "night", "any"]);
export const languageCodeEnum = z.enum(["en", "hi", "te"]);

// ---- entities ----
export const SkillSchema = z.object({
  id: z.string(),
  nameEn: z.string(),
  nameHi: z.string(),
  nameTe: z.string(),
  category: z.string(),
});
export type Skill = z.infer<typeof SkillSchema>;

export const WorkerProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  fullName: z.string(),
  tradeId: z.string().nullable(),
  yearsExp: z.number().int().min(0).max(50),
  city: z.string(),
  lat: z.number(),
  lng: z.number(),
  wageMin: z.number().int().min(0),
  wageMax: z.number().int().min(0),
  shiftPref: shiftEnum,
  languages: z.array(languageCodeEnum),
  bio: z.string(),
  photoUrl: z.string().nullable(),
  availableToday: z.boolean(),
  trustTier: trustTierEnum,
  trustScore: z.number().int().min(0).max(100),
  passportPublic: z.boolean(),
  profileViews: z.number().int().min(0),
  maxRadiusKm: z.number().int().min(1).max(200),
  trade: SkillSchema.nullable().optional(),
  skills: z.array(z.object({
    skillId: z.string(),
    proficiency: z.number().int().min(1).max(5),
    skill: SkillSchema.optional(),
  })).optional(),
});
export type WorkerProfile = z.infer<typeof WorkerProfileSchema>;

export const EmployerProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  companyName: z.string(),
  industry: z.string(),
  city: z.string(),
  isVerified: z.boolean(),
});
export type EmployerProfile = z.infer<typeof EmployerProfileSchema>;

export const JobSchema = z.object({
  id: z.string(),
  employerId: z.string(),
  postedBy: z.string(),
  title: z.string(),
  tradeId: z.string().nullable(),
  headcount: z.number().int().min(1),
  wageMin: z.number().int().min(0),
  wageMax: z.number().int().min(0),
  city: z.string(),
  lat: z.number(),
  lng: z.number(),
  shift: shiftEnum,
  isUrgent: z.boolean(),
  status: z.enum(["open", "closed"]),
  description: z.string(),
  viewsCount: z.number().int().min(0),
  trade: SkillSchema.nullable().optional(),
  employer: EmployerProfileSchema.optional(),
  skills: z.array(z.object({
    skillId: z.string(),
    required: z.boolean(),
    skill: SkillSchema.optional(),
  })).optional(),
});
export type Job = z.infer<typeof JobSchema>;

export const ApplicationSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  workerId: z.string(),
  status: applicationStatusEnum,
  appliedAt: z.string(),
  shortlistedAt: z.string().nullable(),
  interviewAt: z.string().nullable(),
  offerAt: z.string().nullable(),
  hiredAt: z.string().nullable(),
  rejectedAt: z.string().nullable(),
});
export type Application = z.infer<typeof ApplicationSchema>;

export const MatchScoreSchema = z.object({
  jobId: z.string(),
  workerId: z.string(),
  score: z.number().int().min(0).max(100),
  breakdown: z.object({
    S: z.number(), D: z.number(), E: z.number(),
    W: z.number(), T: z.number(),
    bonus: z.number(),
  }),
});
export type MatchScore = z.infer<typeof MatchScoreSchema>;

// ---- API request bodies ----
export const OnboardWorkerBody = z.object({
  fullName: z.string().min(2).max(80),
  tradeId: z.string().min(1),
  yearsExp: z.number().int().min(0).max(50),
  city: z.string().min(2),
  lat: z.number(),
  lng: z.number(),
  wageMin: z.number().int().min(0).max(10000),
  wageMax: z.number().int().min(0).max(10000),
  shiftPref: shiftEnum,
  languages: z.array(languageCodeEnum).min(1),
  bio: z.string().max(500).optional().default(""),
  photoUrl: z.string().url().nullable().optional(),
  availableToday: z.boolean().optional().default(false),
  maxRadiusKm: z.number().int().min(1).max(200).optional().default(15),
  skills: z.array(z.object({
    skillId: z.string(),
    proficiency: z.number().int().min(1).max(5),
  })).default([]),
});
export type OnboardWorkerInput = z.infer<typeof OnboardWorkerBody>;

export const CreateJobBody = z.object({
  title: z.string().min(3).max(120),
  tradeId: z.string().min(1),
  headcount: z.number().int().min(1).max(100).default(1),
  wageMin: z.number().int().min(0),
  wageMax: z.number().int().min(0),
  city: z.string().min(2),
  lat: z.number(),
  lng: z.number(),
  shift: shiftEnum.default("any"),
  isUrgent: z.boolean().default(false),
  description: z.string().max(2000).default(""),
  skills: z.array(z.object({
    skillId: z.string(),
    required: z.boolean().default(true),
  })).default([]),
});
export type CreateJobInput = z.infer<typeof CreateJobBody>;

export const UpdateJobBody = z.object({
  status: z.enum(["open", "closed"]).optional(),
  title: z.string().min(3).max(120).optional(),
  description: z.string().max(2000).optional(),
});
export type UpdateJobInput = z.infer<typeof UpdateJobBody>;

export const PatchApplicationBody = z.object({
  status: applicationStatusEnum,
});
export type PatchApplicationInput = z.infer<typeof PatchApplicationBody>;

export const SearchCandidatesQuery = z.object({
  tradeId: z.string().optional(),
  experienceMin: z.coerce.number().int().min(0).max(50).optional(),
  experienceMax: z.coerce.number().int().min(0).max(50).optional(),
  distanceKm: z.coerce.number().int().min(1).max(200).optional(),
  trustTier: trustTierEnum.optional(),
  wageMin: z.coerce.number().int().min(0).optional(),
  wageMax: z.coerce.number().int().min(0).optional(),
  availableToday: z.coerce.boolean().optional(),
  language: languageCodeEnum.optional(),
  urgentJobId: z.string().optional(),
});
export type SearchCandidatesInput = z.infer<typeof SearchCandidatesQuery>;

export const FeedJobsQuery = z.object({
  tradeId: z.string().optional(),
  distanceKm: z.coerce.number().int().min(1).max(200).optional(),
  wageMin: z.coerce.number().int().min(0).optional(),
  wageMax: z.coerce.number().int().min(0).optional(),
  shift: shiftEnum.optional(),
  urgentOnly: z.coerce.boolean().optional(),
  availableOnly: z.coerce.boolean().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type FeedJobsInput = z.infer<typeof FeedJobsQuery>;

export const UploadVerificationBody = z.object({
  docType: z.enum(["id", "skill_cert", "company"]),
  fileName: z.string().min(3).max(200),
  fileType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
  fileSize: z.number().int().min(1).max(5 * 1024 * 1024),
  skillId: z.string().optional(),
});
export type UploadVerificationInput = z.infer<typeof UploadVerificationBody>;

export const PatchVerificationBody = z.object({
  status: verificationStatusEnum,
  reviewerNote: z.string().max(500).optional().default(""),
  extractedJson: z.string().optional(),
});
export type PatchVerificationInput = z.infer<typeof PatchVerificationBody>;

export const VoiceProfileBody = z.object({
  transcript: z.string().min(5).max(2000),
  lang: languageCodeEnum,
});
export type VoiceProfileInput = z.infer<typeof VoiceProfileBody>;

export const VoiceProfileResult = z.object({
  trade: z.string().nullable(),
  yearsExp: z.number().int().nullable(),
  wageMin: z.number().int().nullable(),
  wageMax: z.number().int().nullable(),
  bio: z.string(),
  languages: z.array(languageCodeEnum),
  city: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});
export type VoiceProfileJSON = z.infer<typeof VoiceProfileResult>;

export const JobDescriptionBody = z.object({
  title: z.string().min(3).max(120),
  tradeId: z.string(),
  headcount: z.number().int().min(1).max(100),
  wageMin: z.number().int().min(0),
  wageMax: z.number().int().max(10000),
  city: z.string().min(2),
  shift: shiftEnum,
  isUrgent: z.boolean(),
});
export type JobDescriptionInput = z.infer<typeof JobDescriptionBody>;
