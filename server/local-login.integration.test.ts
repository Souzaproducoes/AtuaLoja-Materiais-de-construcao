import { describe, expect, it, vi } from "vitest";

vi.mock("./local-auth", () => ({
  isLocalAdminLoginConfigured: () => true,
  credentialsMatch: (username: string, password: string) => username === "admin" && password === "Senha-local-123!",
}));

vi.mock("./_core/env", async () => {
  const actual = await vi.importActual<typeof import("./_core/env")>("./_core/env");
  return {
    ...actual,
    ENV: { ...actual.ENV, oAuthServerUrl: "", databaseUrl: "mysql://local/test", cookieSecret: "test-secret", appId: "atua-loja-local", localAdminOpenId: "local_admin", localAdminName: "Administrador local", localAdminEmail: "admin@local.invalid" },
  };
});

vi.mock("./_core/sdk", async () => {
  const actual = await vi.importActual<typeof import("./_core/sdk")>("./_core/sdk");
  return { ...actual, sdk: { ...actual.sdk, createSessionToken: vi.fn().mockResolvedValue("local-session-token") } };
});

vi.mock("./_core/cookies", () => ({ getSessionCookieOptions: () => ({ httpOnly: true, sameSite: "lax" }) }));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  const user = { id: 1, openId: "local_admin", name: "Administrador local", email: "admin@local.invalid", loginMethod: "local", role: "admin" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
  return { ...actual, upsertUser: vi.fn(), getUserByOpenId: vi.fn().mockResolvedValue(user) };
});

vi.mock("./assistant", () => ({ askAssistant: vi.fn().mockResolvedValue("Resposta simulada") }));

describe("auth.localLogin integration", () => {
  it("creates a local admin session without OAuth", async () => {
    const { appRouter } = await import("./routers");
    const cookie = vi.fn();
    const caller = appRouter.createCaller({ user: null, req: {} as never, res: { cookie } as never });
    const result = await caller.auth.localLogin({ username: "admin", password: "Senha-local-123!" });
    expect(result).toEqual({ success: true });
    expect(cookie).toHaveBeenCalledWith("app_session_id", "local-session-token", expect.objectContaining({ httpOnly: true, maxAge: 8 * 60 * 60 * 1000 }));
  });
});
