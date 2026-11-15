import { describe, expect, it } from "vitest";
import { ageOn, checkIdentity, normalizeDui, normalizeMatricula } from "./identity";

const today = new Date("2026-11-15T12:00:00Z");
const ok = { dui: "01234567-8", birthDate: "1985-04-02", matricula: "2016012345" };

describe("identity check (#215)", () => {
  it("normalises a DUI and a CNR registration", () => {
    expect(normalizeDui("012345678")).toBe("01234567-8");
    expect(normalizeDui("01234567-8")).toBe("01234567-8");
    expect(normalizeDui("1234")).toBeNull();
    expect(normalizeMatricula(" 2016 012345 ")).toBe("2016012345");
    expect(normalizeMatricula("ab")).toBeNull();
  });

  it("counts whole years and refuses dates that don't exist", () => {
    expect(ageOn("2008-11-15", today)).toBe(18);
    expect(ageOn("2008-11-16", today)).toBe(17);
    expect(ageOn("2001-02-30", today)).toBeNull();
    expect(ageOn("", today)).toBeNull();
  });

  it("explains what's missing, in order", () => {
    expect(checkIdentity(ok, today)).toBeNull();
    expect(checkIdentity({ ...ok, dui: "123" }, today)).toBe("El DUI debe tener 9 dígitos.");
    expect(checkIdentity({ ...ok, birthDate: "" }, today)).toBe("Escriba la fecha de nacimiento.");
    expect(checkIdentity({ ...ok, birthDate: "2010-01-01" }, today)).toBe("El representante legal debe ser mayor de edad.");
    expect(checkIdentity({ ...ok, matricula: "" }, today)).toBe("Escriba el número de matrícula de comercio del CNR.");
    expect(checkIdentity(undefined as never, today)).toBe("El DUI debe tener 9 dígitos.");
  });
});
