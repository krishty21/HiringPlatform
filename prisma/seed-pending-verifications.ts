// Round-6 T7 demo seed — pending verification documents.
// Creates realistic PENDING docs (ID + skill cert) for two "new"-tier workers
// so the admin verification queue has reviewable items and the full
// upload → review → approve → trust-tier-badge flow can be demonstrated
// end-to-end without a manual file upload.
//
// Idempotent: skips users who already have pending docs.
// Run: bun run tsx prisma/seed-pending-verifications.ts

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

  // Placeholder document bytes (PII-free demo stand-ins)
  const idPdf = makePdf("ShramSetu demo ID proof", [
    "ShramSetu — DEMO DOCUMENT",
    "Government ID proof (placeholder)",
    "Uploaded for verification review.",
    "No real PII is stored in demo mode.",
  ]);
  const certPdf = makePdf("ShramSetu demo skill certificate", [
    "ShramSetu — DEMO DOCUMENT",
    "Skill certificate (placeholder)",
    "Uploaded for verification review.",
    "No real PII is stored in demo mode.",
  ]);
  await writeFile(path.join(storageDir, "seed-demo-id.pdf"), idPdf, { mode: 0o600 });
  await writeFile(path.join(storageDir, "seed-demo-cert.pdf"), certPdf, { mode: 0o600 });

  // Target workers: "new"-tier seeded workers
  const targets = await db.workerProfile.findMany({
    where: { trustTier: "new" },
    select: { id: true, fullName: true, userId: true, tradeId: true, trade: { select: { nameEn: true } } },
  });
  if (targets.length === 0) {
    console.log("No 'new'-tier workers found — nothing to do.");
    return;
  }

  let created = 0;
  for (const w of targets) {
    const pending = await db.verificationDocument.count({
      where: { ownerUserId: w.userId, status: "pending" },
    });
    if (pending > 0) {
      console.log(`- ${w.fullName}: already has ${pending} pending doc(s), skipped.`);
      continue;
    }

    // Pending ID doc
    await db.verificationDocument.create({
      data: {
        ownerUserId: w.userId,
        docType: "id",
        fileName: "aadhaar-front.pdf",
        fileType: "application/pdf",
        fileUrl: "seed-demo-id.pdf",
        status: "pending",
      },
    });
    created++;

    // Pending skill cert for the first two workers (keeps the queue small)
    if (created <= 2) {
      await db.verificationDocument.create({
        data: {
          ownerUserId: w.userId,
          docType: "skill_cert",
          fileName: `iti-certificate-${w.trade?.nameEn?.toLowerCase().replace(/\s+/g, "-") ?? "trade"}.pdf::skill:${w.tradeId ?? ""}`,
          fileType: "application/pdf",
          fileUrl: "seed-demo-cert.pdf",
          status: "pending",
          extractedJson: JSON.stringify({ cert_type: "ITI", trade: w.trade?.nameEn ?? null }),
        },
      });
      created++;
    }
    console.log(`- ${w.fullName} (${w.trade?.nameEn}): seeded pending ID${created <= 2 ? " + skill cert" : ""} doc.`);
  }

  console.log(`Done. ${created} pending document(s) created. Open /admin/verifications to review.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
