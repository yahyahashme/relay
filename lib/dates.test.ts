import { describe, expect, it } from "vitest";
import { dueLabel, formatDateEs, fromUnixSeconds, isOverdue, toUnixSeconds } from "./dates";

const now = 1_794_506_400; // November 12, 2026 at noon in El Salvador

describe("toUnixSeconds and fromUnixSeconds", () => {
  it("interprets a date-only input as midnight in El Salvador", () => {
    expect(toUnixSeconds("2026-11-20")).toBe(1_795_154_400);
  });

  it.each([
    ["2026-12-01 ", "2026-12-01T06:00:00Z"],
    ["2026-1-5", "2026-01-05T06:00:00Z"],
    ["2026-12-01T10:00:00", "2026-12-01T16:00:00Z"],
    [" 2026-12-01 10:00 ", "2026-12-01T16:00:00Z"],
    ["2026-12-01T10:00:00-05:00", "2026-12-01T15:00:00Z"],
    ["Tue, 01 Dec 2026 10:00:00 GMT", "2026-12-01T10:00:00Z"],
  ])("interprets %s as %s regardless of the host time zone", (input, utc) => {
    expect(toUnixSeconds(input)).toBe(Date.parse(utc) / 1000);
  });

  it("rounds down a Date or timestamp with milliseconds", () => {
    const iso = "2026-11-12T18:00:00.999Z";
    expect(toUnixSeconds(iso)).toBe(now);
    expect(toUnixSeconds(new Date(iso))).toBe(now);
    expect(toUnixSeconds(new Date(-1))).toBe(-1);
  });

  it("restores the same timestamp from Unix seconds", () => {
    expect(fromUnixSeconds(now).toISOString()).toBe("2026-11-12T18:00:00.000Z");
    expect(formatDateEs(fromUnixSeconds(toUnixSeconds("2026-11-20")))).toBe("20 nov");
  });

  it.each(["invalid", "2026-02-30", "2026-02-30T00:00:00Z", "12/01/2026", new Date(NaN)])("rejects an invalid or ambiguous date %s", (date) => {
    expect(() => toUnixSeconds(date)).toThrow("Fecha inválida");
  });
});

describe("formatDateEs", () => {
  it.each([
    ["2026-11-20T06:00:00Z", "20 nov"],
    ["2026-11-21T03:00:00Z", "20 nov"],
    ["2026-11-20T05:59:00Z", "19 nov"],
  ])("formats %s as %s in El Salvador", (iso, label) => {
    expect(formatDateEs(new Date(iso))).toBe(label);
  });
});

describe("isOverdue", () => {
  it.each([
    [0, false],
    [now - 1, true],
    [now, false],
    [now + 1, false],
  ])("reports a due timestamp of %s as overdue=%s", (dueAt, expected) => {
    expect(isOverdue(dueAt, now)).toBe(expected);
  });
});

describe("dueLabel", () => {
  it.each([
    [1_800, "vence en 30 min"],
    [10_800, "vence hoy"],
    [46_800, "vence mañana"],
    [86_400, "vence mañana"],
    [172_800, "vence en 2 días"],
    [604_800, "vence en 7 días"],
    [-300, "venció hace 5 min"],
    [-7_200, "venció hoy"],
    [-86_400, "venció hace 1 día"],
    [-259_200, "venció hace 3 días"],
    [0, "vence en 1 min"],
    [61, "vence en 2 min"],
    [-1, "venció hace 1 min"],
    [-119, "venció hace 1 min"],
    [3_600, "vence hoy"],
    [-3_600, "venció hoy"],
  ])("labels an offset of %s seconds as %s", (offset, label) => {
    expect(dueLabel(now + offset, now)).toBe(label);
  });

  it("does not label missing due dates", () => {
    expect(dueLabel(0, now)).toBe("");
    expect(dueLabel(-1, now)).toBe("");
  });

  it("returns an empty label for a non-finite timestamp", () => {
    expect(dueLabel(NaN, now)).toBe("");
    expect(dueLabel(now, Infinity)).toBe("");
  });

  it("uses minutes across local midnight for deadlines less than an hour away", () => {
    const midnight = toUnixSeconds("2026-11-13");
    expect(dueLabel(midnight, midnight - 1_800)).toBe("vence en 30 min");
    expect(dueLabel(midnight - 1_800, midnight)).toBe("venció hace 30 min");
  });
});
