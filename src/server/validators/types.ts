import type { Account, Submission, Task } from "@prisma/client";

export type ValidatorVerdict = "approve" | "reject" | "needs_review";

export interface ValidatorInput {
  task: Task;
  submission: Submission;
  reviewer?: Account;
  reviewerDecision?: "approve" | "reject";
  reviewerNotes?: string;
}

export interface ValidatorResult {
  verdict: ValidatorVerdict;
  notes?: string;
  meta?: Record<string, unknown>;
}

export interface Validator {
  readonly id: string;
  run(input: ValidatorInput): Promise<ValidatorResult>;
}

export class ValidatorInputError extends Error {
  readonly status = 400 as const;
  constructor(message: string) {
    super(message);
    this.name = "ValidatorInputError";
  }
}
