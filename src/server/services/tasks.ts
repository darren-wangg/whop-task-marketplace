import "server-only";
import { Prisma, type Account, type Task, type TaskAcceptance } from "@prisma/client";
import { db } from "@/server/db";
import { badRequest, conflict, forbidden, notFound } from "@/server/errors";
import { toCents } from "@/lib/money";
import type {
  CreateTaskInput,
  ListTasksFilters,
} from "@/lib/schemas";

const PAGE_SIZE = 24;

export async function createTask(input: CreateTaskInput, actor: Account): Promise<Task> {
  if (actor.kind !== "business") throw forbidden("Only a business actor can create tasks.");
  const rewardCents = toCents(input.rewardDollars);
  if (rewardCents <= 0n) throw badRequest("Reward must be greater than zero.");
  return db.task.create({
    data: {
      businessId: actor.id,
      title: input.title,
      description: input.description,
      submissionCriteria: input.submissionCriteria,
      rewardCents,
      category: input.category ?? null,
      deadline: input.deadlineISO ? new Date(input.deadlineISO) : null,
    },
  });
}

export interface ListTasksResult {
  items: Array<Task & { business: Pick<Account, "id" | "name" | "avatarUrl"> }>;
  nextCursor: string | null;
}

export async function listTasks(filters: ListTasksFilters): Promise<ListTasksResult> {
  const where: Prisma.TaskWhereInput = {};
  if (filters.status !== "any") where.status = filters.status;
  if (filters.category) where.category = filters.category;
  if (filters.minRewardCents !== undefined) {
    where.rewardCents = { ...(where.rewardCents as object), gte: filters.minRewardCents };
  }
  if (filters.maxRewardCents !== undefined) {
    where.rewardCents = { ...(where.rewardCents as object), lte: filters.maxRewardCents };
  }
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  if (filters.cursor) {
    where.id = { lt: filters.cursor };
  }

  const items = await db.task.findMany({
    where,
    take: PAGE_SIZE + 1,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: { business: { select: { id: true, name: true, avatarUrl: true } } },
  });

  const hasMore = items.length > PAGE_SIZE;
  const sliced = hasMore ? items.slice(0, PAGE_SIZE) : items;
  return {
    items: sliced,
    nextCursor: hasMore ? sliced[sliced.length - 1].id : null,
  };
}

export interface TaskDetail {
  task: Task & {
    business: Pick<Account, "id" | "name" | "avatarUrl">;
    acceptances: Array<TaskAcceptance & { user: Pick<Account, "id" | "name" | "avatarUrl"> }>;
  };
  myAcceptance: TaskAcceptance | null;
}

export async function getTask(id: string, actor: Account): Promise<TaskDetail> {
  const task = await db.task.findUnique({
    where: { id },
    include: {
      business: { select: { id: true, name: true, avatarUrl: true } },
      acceptances: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { acceptedAt: "desc" },
      },
    },
  });
  if (!task) throw notFound("Task");
  const myAcceptance = task.acceptances.find((a) => a.userId === actor.id) ?? null;
  return { task, myAcceptance };
}

export async function listBusinessTasks(
  actor: Account,
): Promise<
  Array<
    Task & {
      _count: { acceptances: number };
      acceptances: Array<Pick<TaskAcceptance, "id" | "status">>;
    }
  >
> {
  if (actor.kind !== "business") throw forbidden("Only a business actor can view business tasks.");
  return db.task.findMany({
    where: { businessId: actor.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { acceptances: true } },
      acceptances: { select: { id: true, status: true } },
    },
  });
}

export async function acceptTask(taskId: string, actor: Account): Promise<TaskAcceptance> {
  if (actor.kind !== "user") throw forbidden("Only a user actor can accept tasks.");
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) throw notFound("Task");
  if (task.status !== "open") throw conflict("Task is no longer open.");
  if (task.businessId === actor.id) throw badRequest("Cannot accept your own task.");
  try {
    return await db.taskAcceptance.create({
      data: { taskId, userId: actor.id },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw conflict("Already accepted this task.");
    }
    throw err;
  }
}
