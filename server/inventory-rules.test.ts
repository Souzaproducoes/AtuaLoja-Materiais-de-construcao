import { describe, expect, it } from "vitest";
import { allocateInventory } from "./inventory-rules";

describe("inventory allocation", () => {
  it("spreads a reservation across locations", () => {
    expect(allocateInventory([{ id: 1, location: "loja", available: 3 }, { id: 2, location: "deposito", available: 5 }], 6)).toEqual([
      { id: 1, location: "loja", quantity: 3 },
      { id: 2, location: "deposito", quantity: 3 },
    ]);
  });

  it("rejects insufficient stock without partial allocation", () => {
    expect(() => allocateInventory([{ id: 1, location: "loja", available: 2 }], 3)).toThrow("Insufficient stock");
  });
});
