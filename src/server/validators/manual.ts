import {
  ValidatorInputError,
  type Validator,
  type ValidatorInput,
  type ValidatorResult,
} from "./types";

export class ManualValidator implements Validator {
  readonly id = "manual";

  async run(input: ValidatorInput): Promise<ValidatorResult> {
    if (!input.reviewer) {
      throw new ValidatorInputError("Manual validation requires a reviewer.");
    }
    if (input.reviewer.kind !== "business") {
      throw new ValidatorInputError("Only a business actor can manually review submissions.");
    }
    if (input.reviewer.id !== input.task.businessId) {
      throw new ValidatorInputError("Reviewer is not the owner of this task.");
    }
    if (!input.reviewerDecision) {
      throw new ValidatorInputError("Manual validation requires reviewerDecision.");
    }
    return {
      verdict: input.reviewerDecision,
      notes: input.reviewerNotes,
      meta: { validator: this.id, reviewerId: input.reviewer.id },
    };
  }
}
