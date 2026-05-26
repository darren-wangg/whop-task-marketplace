import { ManualValidator } from "./manual";
import type { Validator } from "./types";

let cached: Validator | undefined;

/**
 * The single switch point for the validation strategy.
 * To plug in an LLM validator later: instantiate it here. Callers don't change.
 */
export function getValidator(): Validator {
  if (!cached) cached = new ManualValidator();
  return cached;
}

export type { Validator, ValidatorInput, ValidatorResult, ValidatorVerdict } from "./types";
export { ValidatorInputError } from "./types";
