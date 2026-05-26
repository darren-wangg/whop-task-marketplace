import { z } from "zod";

export const TaskCategory = z.enum(["content", "design", "research", "bug-bounty", "other"]);

export const TaskStatusFilter = z.enum(["any", "open", "closed"]);

export const createTaskSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(4000),
  submissionCriteria: z.string().trim().min(10).max(2000),
  rewardDollars: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a number like 12 or 12.50"),
  category: TaskCategory.optional(),
  deadlineISO: z.string().datetime().optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const acceptTaskSchema = z.object({
  taskId: z.string().min(1),
});
export type AcceptTaskInput = z.infer<typeof acceptTaskSchema>;

export const submitWorkSchema = z.object({
  acceptanceId: z.string().min(1),
  submissionUrl: z.url().max(2048),
  notes: z.string().trim().max(2000).optional(),
});
export type SubmitWorkInput = z.infer<typeof submitWorkSchema>;

export const reviewSubmissionSchema = z.object({
  submissionId: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
  reviewerNotes: z.string().trim().max(2000).optional(),
});
export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionSchema>;

export const listTasksFiltersSchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: TaskStatusFilter.optional().default("open"),
  category: TaskCategory.optional(),
  minRewardCents: z.coerce.bigint().nonnegative().optional(),
  maxRewardCents: z.coerce.bigint().nonnegative().optional(),
  cursor: z.string().optional(),
});
export type ListTasksFilters = z.infer<typeof listTasksFiltersSchema>;
