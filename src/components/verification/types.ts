// Shared types for verification components.
export type DocType = "id" | "skill_cert" | "company";

export interface VerificationItem {
  id: string;
  docType: DocType;
  maskedLabel: string;
  displayFileName: string;
  fileType: string;
  status: "pending" | "approved" | "rejected";
  reviewerNote: string | null;
  reviewedAt: string | null;
  submittedAt: string;
  previewToken: string;
  skillName: string | null;
}

export interface AdminVerificationItem extends Omit<VerificationItem, "previewToken" | "skillName"> {
  extractedJson: string;
  owner: {
    id: string;
    email: string;
    role: string;
    name: string;
    trade: string | null;
    city: string | null;
  };
}
