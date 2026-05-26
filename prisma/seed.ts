import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Set DATABASE_URL (or DIRECT_URL) before running the seed.");
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  console.log("Seeding accounts...");
  await db.account.upsert({
    where: { id: "biz_acme" },
    create: { id: "biz_acme", name: "Acme Studios", kind: "business" },
    update: { name: "Acme Studios" },
  });
  await db.account.upsert({
    where: { id: "biz_pixel" },
    create: { id: "biz_pixel", name: "Pixel Forge", kind: "business" },
    update: { name: "Pixel Forge" },
  });
  await db.account.upsert({
    where: { id: "usr_ada" },
    create: { id: "usr_ada", name: "Ada Lin", kind: "user" },
    update: { name: "Ada Lin" },
  });
  await db.account.upsert({
    where: { id: "usr_lin" },
    create: { id: "usr_lin", name: "Lin Park", kind: "user" },
    update: { name: "Lin Park" },
  });

  console.log("Seeding tasks...");
  const tasks: Array<{
    id: string;
    businessId: string;
    title: string;
    description: string;
    submissionCriteria: string;
    rewardCents: bigint;
    category: string;
    deadline?: Date;
  }> = [
    {
      id: "task_demo_blog",
      businessId: "biz_acme",
      title: "Write a 600-word launch announcement",
      description:
        "We're launching our new SDK. Need a 600-word post explaining what it does, why developers should try it, and a code example.",
      submissionCriteria:
        "Public URL to the published post. Must be 500–800 words and include at least one runnable code snippet.",
      rewardCents: 7500n,
      category: "content",
    },
    {
      id: "task_logo_iter",
      businessId: "biz_pixel",
      title: "Iterate on our marketing logo",
      description:
        "Take our current SVG logo and produce 3 variations that maintain brand identity but feel more modern.",
      submissionCriteria: "URL to a Figma file or GitHub repo with all 3 SVG variants.",
      rewardCents: 12500n,
      category: "design",
    },
    {
      id: "task_bug_search",
      businessId: "biz_acme",
      title: "Find and report a bug in our search endpoint",
      description:
        "Our /api/search endpoint occasionally returns duplicates. Reproduce, report with steps + suggested fix.",
      submissionCriteria: "URL to a public Gist or GitHub Issue with reproduction steps.",
      rewardCents: 25000n,
      category: "bug-bounty",
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    {
      id: "task_user_research",
      businessId: "biz_pixel",
      title: "Run a 30-min user interview",
      description:
        "We need feedback from a designer who has used Figma + Sketch in the last year. 30-min recorded interview.",
      submissionCriteria: "URL to a transcript or recording (Loom, YouTube unlisted, etc.).",
      rewardCents: 5000n,
      category: "research",
    },
    {
      id: "task_landing_copy",
      businessId: "biz_acme",
      title: "Rewrite our landing page hero copy",
      description: "Punchy headline + 2-line subhead. Target audience: indie developers.",
      submissionCriteria: "URL to a Google Doc with 3 variations.",
      rewardCents: 3500n,
      category: "content",
    },
    {
      id: "task_icon_pack",
      businessId: "biz_pixel",
      title: "Design 12 sidebar icons",
      description: "Outline-style icons, 24px, consistent stroke width.",
      submissionCriteria: "URL to a public Figma file with all 12 icons exported as SVG.",
      rewardCents: 18000n,
      category: "design",
      deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    },
    {
      id: "task_typo_audit",
      businessId: "biz_acme",
      title: "Find and report typos in our docs",
      description: "Read through docs.example.com, list every typo or grammar issue you find.",
      submissionCriteria: "URL to a Google Doc with a numbered list (page + correction).",
      rewardCents: 1500n,
      category: "content",
    },
    {
      id: "task_perf_audit",
      businessId: "biz_pixel",
      title: "Lighthouse audit of our pricing page",
      description: "Run Lighthouse on pricing.example.com and report top 3 perf wins.",
      submissionCriteria: "URL to a Gist with full Lighthouse output + your top-3 prioritized list.",
      rewardCents: 6000n,
      category: "research",
    },
    {
      id: "task_competitor_grid",
      businessId: "biz_acme",
      title: "Build a competitor feature grid",
      description: "Compare us against 5 competitors across 8 features. Spreadsheet.",
      submissionCriteria: "URL to a Google Sheet with all rows filled in and sources cited.",
      rewardCents: 4000n,
      category: "research",
    },
    {
      id: "task_animated_promo",
      businessId: "biz_pixel",
      title: "Produce a 15-second animated promo",
      description: "Short looping animation for social media. Vertical 9:16, no audio required.",
      submissionCriteria: "URL to MP4 (Dropbox, Google Drive, etc.).",
      rewardCents: 22500n,
      category: "design",
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const t of tasks) {
    await db.task.upsert({
      where: { id: t.id },
      create: t,
      update: {
        title: t.title,
        description: t.description,
        submissionCriteria: t.submissionCriteria,
        rewardCents: t.rewardCents,
        category: t.category,
        deadline: t.deadline ?? null,
      },
    });
  }

  console.log("Seeding acceptances + submissions + payments...");

  // 1. Ada accepted task_landing_copy — status accepted, no submission yet
  await db.taskAcceptance.upsert({
    where: { taskId_userId: { taskId: "task_landing_copy", userId: "usr_ada" } },
    create: {
      id: "acc_ada_landing",
      taskId: "task_landing_copy",
      userId: "usr_ada",
      status: "accepted",
    },
    update: { status: "accepted" },
  });

  // 2. Lin submitted task_typo_audit — awaiting review
  const linTypo = await db.taskAcceptance.upsert({
    where: { taskId_userId: { taskId: "task_typo_audit", userId: "usr_lin" } },
    create: {
      id: "acc_lin_typo",
      taskId: "task_typo_audit",
      userId: "usr_lin",
      status: "submitted",
    },
    update: { status: "submitted" },
  });
  await db.submission.upsert({
    where: { acceptanceId: linTypo.id },
    create: {
      id: "sub_lin_typo",
      acceptanceId: linTypo.id,
      submissionUrl: "https://docs.google.com/document/d/seed-lin-typo",
      notes: "Found 12 typos across the auth and pricing pages.",
    },
    update: {},
  });

  // 3. Ada completed task_user_research — approved + paid
  const adaResearch = await db.taskAcceptance.upsert({
    where: { taskId_userId: { taskId: "task_user_research", userId: "usr_ada" } },
    create: {
      id: "acc_ada_research",
      taskId: "task_user_research",
      userId: "usr_ada",
      status: "approved",
    },
    update: { status: "approved" },
  });
  const adaResearchSubmission = await db.submission.upsert({
    where: { acceptanceId: adaResearch.id },
    create: {
      id: "sub_ada_research",
      acceptanceId: adaResearch.id,
      submissionUrl: "https://loom.com/share/seed-ada-research",
      notes: "Interviewed a senior designer with 8 years Figma + 4 years Sketch.",
      reviewedAt: new Date(),
      reviewerNotes: "Great quality, exactly what we needed.",
    },
    update: {},
  });
  await db.payment.upsert({
    where: { submissionId: adaResearchSubmission.id },
    create: {
      id: "pay_ada_research",
      submissionId: adaResearchSubmission.id,
      userId: "usr_ada",
      businessId: "biz_pixel",
      amountCents: 5000n,
    },
    update: {},
  });

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
