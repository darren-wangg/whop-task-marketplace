import { describe, expect, it } from "vitest";
import type { Account, Submission, Task } from "@prisma/client";
import { ManualValidator } from "@/server/validators/manual";
import { ValidatorInputError } from "@/server/validators/types";

const taskFixture = (overrides: Partial<Task> = {}): Task => ({
  id: "task_1",
  businessId: "biz_1",
  title: "x",
  description: "x",
  submissionCriteria: "x",
  rewardCents: 100n,
  category: null,
  deadline: null,
  status: "open",
  createdAt: new Date(),
  ...overrides,
});

const submissionFixture = (overrides: Partial<Submission> = {}): Submission => ({
  id: "sub_1",
  acceptanceId: "acc_1",
  submissionUrl: "https://example.com/work",
  notes: null,
  submittedAt: new Date(),
  reviewedAt: null,
  reviewerNotes: null,
  ...overrides,
});

const accountFixture = (overrides: Partial<Account> = {}): Account => ({
  id: "biz_1",
  name: "Acme",
  kind: "business",
  avatarUrl: null,
  createdAt: new Date(),
  ...overrides,
});

describe("ManualValidator", () => {
  const validator = new ManualValidator();

  it("returns the reviewer's decision verbatim", async () => {
    const result = await validator.run({
      task: taskFixture(),
      submission: submissionFixture(),
      reviewer: accountFixture(),
      reviewerDecision: "approve",
      reviewerNotes: "looks great",
    });
    expect(result.verdict).toBe("approve");
    expect(result.notes).toBe("looks great");
    expect(result.meta?.validator).toBe("manual");
  });

  it("rejects when the reviewer is missing", async () => {
    await expect(
      validator.run({
        task: taskFixture(),
        submission: submissionFixture(),
        reviewerDecision: "approve",
      }),
    ).rejects.toBeInstanceOf(ValidatorInputError);
  });

  it("rejects when the reviewer is not a business", async () => {
    await expect(
      validator.run({
        task: taskFixture(),
        submission: submissionFixture(),
        reviewer: accountFixture({ kind: "user", id: "usr_1" }),
        reviewerDecision: "approve",
      }),
    ).rejects.toBeInstanceOf(ValidatorInputError);
  });

  it("rejects when the reviewer is a different business", async () => {
    await expect(
      validator.run({
        task: taskFixture({ businessId: "biz_owner" }),
        submission: submissionFixture(),
        reviewer: accountFixture({ id: "biz_other" }),
        reviewerDecision: "approve",
      }),
    ).rejects.toBeInstanceOf(ValidatorInputError);
  });

  it("rejects when decision is missing", async () => {
    await expect(
      validator.run({
        task: taskFixture(),
        submission: submissionFixture(),
        reviewer: accountFixture(),
      }),
    ).rejects.toBeInstanceOf(ValidatorInputError);
  });
});
