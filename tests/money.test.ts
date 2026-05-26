import { describe, expect, it } from "vitest";
import { bigIntReplacer, formatCents, serializeJSON, toCents } from "@/lib/money";

describe("toCents", () => {
  it("converts decimal strings", () => {
    expect(toCents("12.50")).toBe(1250n);
    expect(toCents("0.05")).toBe(5n);
    expect(toCents("100")).toBe(10000n);
    expect(toCents("0")).toBe(0n);
  });

  it("converts numbers", () => {
    expect(toCents(12.5)).toBe(1250n);
    expect(toCents(0)).toBe(0n);
  });

  it("passes through bigint", () => {
    expect(toCents(1250n)).toBe(1250n);
  });

  it("rejects malformed input", () => {
    expect(() => toCents("abc")).toThrow();
    expect(() => toCents("12.345")).toThrow();
    expect(() => toCents("")).toThrow();
    expect(() => toCents(Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe("formatCents", () => {
  it("formats as USD by default", () => {
    expect(formatCents(0n)).toBe("$0.00");
    expect(formatCents(5n)).toBe("$0.05");
    expect(formatCents(1250n)).toBe("$12.50");
    expect(formatCents(100000n)).toBe("$1,000.00");
    expect(formatCents(123456789n)).toBe("$1,234,567.89");
  });

  it("handles negative values", () => {
    expect(formatCents(-1250n)).toBe("-$12.50");
  });
});

describe("bigint JSON serialization", () => {
  it("replacer stringifies bigints", () => {
    expect(JSON.stringify({ a: 12n }, bigIntReplacer)).toBe('{"a":"12"}');
  });

  it("serializeJSON roundtrips", () => {
    const out = serializeJSON({ amountCents: 1250n, label: "x" });
    expect(JSON.parse(out)).toEqual({ amountCents: "1250", label: "x" });
  });
});
