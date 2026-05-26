import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the db module BEFORE importing the service under test.
const mockDb = {
  submission: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  taskAcceptance: {
    update: vi.fn(),
  },
  payment: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock("@/server/db", () => ({ db: mockDb }));

// The actor.kind = business check in ManualValidator requires this to come AFTER mocking db.
const { reviewSubmission } = await import("@/server/services/reviews");

const submissionRow = {
  id: "sub_1",
  acceptanceId: "acc_1",
  submissionUrl: "https://example.com/x",
  notes: null,
  submittedAt: new Date(),
  reviewedAt: null,
  reviewerNotes: null,
  acceptance: {
    id: "acc_1",
    taskId: "task_1",
    userId: "usr_1",
    status: "submitted" as const,
    acceptedAt: new Date(),
    task: {
      id: "task_1",
      businessId: "biz_1",
      title: "x",
      description: "x",
      submissionCriteria: "x",
      rewardCents: 5000n,
      category: null,
      deadline: null,
      status: "open" as const,
      createdAt: new Date(),
    },
  },
};

const reviewer = {
  id: "biz_1",
  name: "Acme",
  kind: "business" as const,
  avatarUrl: null,
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  // $transaction takes a function; we route it to a tx whose methods === root mocks.
  mockDb.$transaction.mockImplementation(async (fn: (tx: typeof mockDb) => unknown) => fn(mockDb));
});

describe("reviewSubmission — approve", () => {
  it("creates a Payment and flips acceptance to approved", async () => {
    mockDb.submission.findUnique.mockResolvedValue(submissionRow);
    const fakePayment = {
      id: "pay_1",
      submissionId: "sub_1",
      userId: "usr_1",
      businessId: "biz_1",
      amountCents: 5000n,
      paidAt: new Date(),
    };
    mockDb.payment.create.mockResolvedValue(fakePayment);

    const res = await reviewSubmission(
      { submissionId: "sub_1", decision: "approve", reviewerNotes: "ok" },
      reviewer,
    );

    expect(res.verdict).toBe("approve");
    expect(res.acceptanceStatus).toBe("approved");
    expect(res.payment).toEqual(fakePayment);
    expect(mockDb.taskAcceptance.update).toHaveBeenCalledWith({
      where: { id: "acc_1" },
      data: { status: "approved" },
    });
    expect(mockDb.payment.create).toHaveBeenCalledOnce();
    const paymentArgs = mockDb.payment.create.mock.calls[0][0];
    expect(paymentArgs.data.amountCents).toBe(5000n);
    expect(paymentArgs.data.userId).toBe("usr_1");
    expect(paymentArgs.data.businessId).toBe("biz_1");
  });
});

describe("reviewSubmission — reject", () => {
  it("flips acceptance to rejected and creates NO Payment", async () => {
    mockDb.submission.findUnique.mockResolvedValue(submissionRow);

    const res = await reviewSubmission(
      { submissionId: "sub_1", decision: "reject", reviewerNotes: "not good" },
      reviewer,
    );

    expect(res.verdict).toBe("reject");
    expect(res.acceptanceStatus).toBe("rejected");
    expect(res.payment).toBeNull();
    expect(mockDb.taskAcceptance.update).toHaveBeenCalledWith({
      where: { id: "acc_1" },
      data: { status: "rejected" },
    });
    expect(mockDb.payment.create).not.toHaveBeenCalled();
  });
});

describe("reviewSubmission — already reviewed", () => {
  it("throws conflict if submission already reviewed", async () => {
    mockDb.submission.findUnique.mockResolvedValue({
      ...submissionRow,
      reviewedAt: new Date(),
    });
    await expect(
      reviewSubmission({ submissionId: "sub_1", decision: "approve" }, reviewer),
    ).rejects.toThrow(/already reviewed/);
  });
});
