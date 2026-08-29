// Round-9 T7 demo seed — pending EMPLOYER company verification documents.
// Mirrors prisma/seed-pending-verifications.ts (which targeted workers).
// Creates realistic PENDING `company` docType VerificationDocuments for every
// employer that doesn't already have a pending company doc, so the admin
// verification queue has employer-side reviewable items and the full
// "employer company-doc → review → approve → isVerified=true" flow can be
// demonstrated end-to-end without a manual file upload.
//
// Idempotent: skips employers that already have a pending company doc.
// Run: bun run tsx prisma/seed-employer-pending-verifications.ts

import { PrismaClient } from "@prisma/client";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const db = new PrismaClient();

/** Build a minimal, structurally-valid one-page PDF with a text line. */
function makePdf(title: string, lines: string[]): Buffer {
  const esc = (s: string) => s.replace(/([()\\])/g, "\\$1");
  let content = "BT /F1 16 Tf 72 720 Td\n";
  for (const line of lines) {
    content += `(${esc(line)}) Tj 0 -24 Td\n`;
  }
  content += "ET\n";
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}endstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = `%PDF-1.4\n% ${title}\n`;
  const offsets: number[] = [];
  for (let i = 0; i < objs.length; i++) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

async function main() {
  const storageDir = path.join(process.cwd(), "storage");
  await mkdir(storageDir, { recursive: true });

  // Placeholder PDF bytes (PII-free demo stand-ins)
  const companyPdf = makePdf("ShramSetu demo company proof", [
    "ShramSetu — DEMO DOCUMENT",
    "Employer company proof (GST / Udyam / Shop Act)",
    "Uploaded for verification review.",
    "No real PII is stored in demo mode.",
  ]);
  await writeFile(path.join(storageDir, "seed-demo-company.pdf"), companyPdf, { mode: 0o600 });

  // Target every employer
  const employers = await db.employerProfile.findMany({
    select: { id: true, userId: true, companyName: true, city: true, isVerified: true },
  });
  if (employers.length === 0) {
    console.log("No employers found — nothing to do.");
    return;
  }

  let created = 0;
  for (const emp of employers) {
    const pendingCompany = await db.verificationDocument.count({
      where: { ownerUserId: emp.userId, docType: "company", status: "pending" },
    });
    if (pendingCompany > 0) {
      console.log(`- ${emp.companyName}: already has ${pendingCompany} pending company doc, skipped.`);
      continue;
    }

    await db.verificationDocument.create({
      data: {
        ownerUserId: emp.userId,
        docType: "company",
        fileName: `gst-certificate-${emp.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.pdf`,
        fileType: "application/pdf",
        fileUrl: "seed-demo-company.pdf",
        status: "pending",
        extractedJson: JSON.stringify({
          company_name: emp.companyName,
          city: emp.city,
          doc_kind: "GST",
        }),
      },
    });
    created++;
    console.log(`- ${emp.companyName} (${emp.city}): seeded pending company-proof doc.`);
  }

  console.log(`Done. ${created} pending company document(s) created. Open /admin/verifications to review.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
