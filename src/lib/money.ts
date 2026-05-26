const CENTS_PER_DOLLAR = 100n;

export function toCents(input: string | number | bigint): bigint {
  if (typeof input === "bigint") return input;
  if (typeof input === "number") {
    if (!Number.isFinite(input)) throw new Error(`Invalid money input: ${input}`);
    return BigInt(Math.round(input * 100));
  }
  const trimmed = input.trim();
  if (trimmed === "") throw new Error("Empty money input");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error(`Invalid money input: "${input}"`);
  }
  const [whole, fraction = ""] = trimmed.split(".");
  const padded = (fraction + "00").slice(0, 2);
  return BigInt(whole) * CENTS_PER_DOLLAR + BigInt(padded);
}

export function formatCents(cents: bigint, currency = "USD"): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const whole = abs / CENTS_PER_DOLLAR;
  const fraction = abs % CENTS_PER_DOLLAR;
  const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fractionStr = fraction.toString().padStart(2, "0");
  const symbol = currency === "USD" ? "$" : `${currency} `;
  return `${negative ? "-" : ""}${symbol}${wholeStr}.${fractionStr}`;
}

export function bigIntReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

export function serializeJSON(value: unknown): string {
  return JSON.stringify(value, bigIntReplacer);
}
