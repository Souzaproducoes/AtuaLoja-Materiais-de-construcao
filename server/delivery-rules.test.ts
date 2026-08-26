import { describe, expect, it } from "vitest";
import { canCloseDelivery } from "./delivery-rules";

describe("delivery closing rules", () => {
  it("allows operational states without proof", () => {
    expect(canCloseDelivery("in_route")).toBe(true);
    expect(canCloseDelivery("arrived")).toBe(true);
  });

  it("blocks confirmed delivery without proof", () => {
    expect(canCloseDelivery("confirmed")).toBe(false);
    expect(canCloseDelivery("confirmed", "code", "12")).toBe(false);
  });

  it("accepts a valid numeric code", () => {
    expect(canCloseDelivery("confirmed", "code", "4821")).toBe(true);
    expect(canCloseDelivery("confirmed", "code", "ABCD")).toBe(false);
  });

  it("accepts externally stored photo or signature proofs", () => {
    expect(canCloseDelivery("partial", "photo", "https://storage.example/proof.webp")).toBe(true);
    expect(canCloseDelivery("confirmed", "signature", "https://storage.example/signature.webp")).toBe(true);
    expect(canCloseDelivery("partial", "signature", "assinatura local")).toBe(false);
  });
});
