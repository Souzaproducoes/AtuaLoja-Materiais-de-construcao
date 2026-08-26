import { describe, expect, it } from "vitest";
import { calculateFreight } from "./freight";

describe("calculateFreight", () => {
  it("offers freight above the configured commercial threshold", () => {
    expect(calculateFreight({ city: "Niquelândia", distanceKm: 8, subtotal: 600 }).amount).toBe(0);
  });
  it("calculates regional freight by distance", () => {
    expect(calculateFreight({ city: "Região", distanceKm: 20, subtotal: 200 }).amount).toBe(85);
  });
  it("rejects deliveries beyond the configured range", () => {
    expect(calculateFreight({ city: "Região", distanceKm: 100, subtotal: 200 }).eligible).toBe(false);
  });
});
