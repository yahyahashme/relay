import { describe, expect, it } from "vitest";
import { APP_NAME, TAGLINE } from "./brand";

describe("brand", () => {
  it("has a product name and a tagline", () => {
    expect(APP_NAME).toBe("Relay");
    expect(TAGLINE).toBe("Paga tu ruta");
  });
});
