import { describe, expect, it } from "vitest";
import { resolveDeliveryAddress } from "./customer-rules";

describe("delivery address resolution", () => {
  it("prioritizes an explicitly entered address", () => {
    expect(resolveDeliveryAddress(" Rua Nova, 10 ", [{ address: "Rua Predefinida", isDefault: 1 }], "Rua Cadastral")).toBe("Rua Nova, 10");
  });

  it("reuses the default saved address when no explicit address is sent", () => {
    expect(resolveDeliveryAddress(undefined, [{ address: "Rua Recente", lastUsedAt: new Date("2026-01-01") }, { address: "Rua Principal", isDefault: 1 }], "Rua Cadastral")).toBe("Rua Principal");
  });

  it("falls back to the customer's registered address", () => {
    expect(resolveDeliveryAddress(undefined, [], "Rua Cadastral, 5")).toBe("Rua Cadastral, 5");
  });
});
