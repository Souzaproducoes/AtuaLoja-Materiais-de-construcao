import { describe, expect, it } from "vitest";
import { credentialsMatch, isLocalAdminLoginConfigured } from "./local-auth";

describe("local admin authentication", () => {
  const configured = {
    allowLocalAdminLogin: true,
    localAdminUsername: "admin",
    localAdminPassword: "Senha-local-123!",
  };

  it("accepts only the configured credentials", () => {
    expect(isLocalAdminLoginConfigured(configured)).toBe(true);
    expect(credentialsMatch("admin", "Senha-local-123!", configured)).toBe(true);
    expect(credentialsMatch("admin", "errada", configured)).toBe(false);
    expect(credentialsMatch("outro", "Senha-local-123!", configured)).toBe(false);
  });

  it("remains disabled when the environment does not allow local login", () => {
    const disabled = { ...configured, allowLocalAdminLogin: false };
    expect(isLocalAdminLoginConfigured(disabled)).toBe(false);
    expect(credentialsMatch("admin", "Senha-local-123!", disabled)).toBe(false);
  });
});
