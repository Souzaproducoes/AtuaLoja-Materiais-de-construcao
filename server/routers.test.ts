import { describe, expect, it, vi } from "vitest";
vi.mock("./assistant", () => ({ askAssistant: vi.fn().mockResolvedValue("Resposta simulada dentro do escopo autorizado") }));
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("appRouter", () => {
  it("exposes the public catalog procedure", async () => {
    const ctx: TrpcContext = { user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
    const result = await appRouter.createCaller(ctx).catalog.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns an empty operational summary when the database is unavailable", async () => {
    const user = { id: 9, openId: "test-admin", name: "Teste", email: "teste@example.com", loginMethod: "local", role: "admin" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
    const ctx: TrpcContext = { user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
    const result = await appRouter.createCaller(ctx).admin.summary();
    expect(result).toMatchObject({ revenue: 0, openQuotes: 0, activeOrders: 0 });
  });
  it("calculates regional freight through the typed quote API", async () => {
    const ctx: TrpcContext = { user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
    const result = await appRouter.createCaller(ctx).quote.calculateFreight({ city: "Região", distanceKm: 20, subtotal: 200 });
    expect(result).toMatchObject({ eligible: true, amount: 85 });
  });

  it("routes every specialist positively for an administrator", async () => {
    const user = { id: 9, openId: "test-admin", name: "Teste", email: "teste@example.com", loginMethod: "local", role: "admin" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
    const ctx: TrpcContext = { user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
    const caller = appRouter.createCaller(ctx);
    for (const module of ["catalog", "inventory", "finance", "crm", "security", "seo", "pwa"] as const) expect(await caller.assistant[module]({ message: `Auditoria ${module}` })).toContain("Resposta simulada");
  });

  it("blocks every internal specialist agent for anonymous users", async () => {
    const ctx: TrpcContext = { user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
    const caller = appRouter.createCaller(ctx);
    for (const module of ["catalog", "inventory", "finance", "crm", "security", "seo", "pwa"] as const) await expect(caller.assistant[module]({ message: `Auditoria ${module}` })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns the authenticated user through auth.me", async () => {
    const user = { id: 9, openId: "test-user", name: "Teste", email: "teste@example.com", loginMethod: "local", role: "admin" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
    const ctx: TrpcContext = { user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
    const result = await appRouter.createCaller(ctx).auth.me();
    expect(result).toEqual(user);
  });
});
