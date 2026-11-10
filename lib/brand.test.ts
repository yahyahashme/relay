import { describe, expect, it } from "vitest";
import { APP_NAME } from "./brand";

describe("brand", () => {
  it("has a product name", () => {
    expect(APP_NAME.trim().length).toBeGreaterThan(0);
  });
});
