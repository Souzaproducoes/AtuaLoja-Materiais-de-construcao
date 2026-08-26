import { describe, expect, it, vi } from "vitest";
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn().mockResolvedValue({ choices: [{ message: { content: "Resposta de teste" } }] }) }));
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getAssistantScope } from "./assistant";
import * as db from "./db";

const context = (role: "user" | "admin" | "manager" | "logistics" | "stock"): TrpcContext => ({ user: { id: 2, openId: "test", name: "Teste", email: "teste@example.com", loginMethod: "local", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });

describe("catalog and assistant access", () => {
  it("blocks catalog management for a normal user", async () => {
    await expect(appRouter.createCaller(context("user")).admin.catalog.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("allows an administrator to list the catalog", async () => {
    const result = await appRouter.createCaller(context("admin")).admin.catalog.list();
    expect(Array.isArray(result)).toBe(true);
  });
  it("blocks delivery assistant for a normal user", async () => {
    await expect(appRouter.createCaller(context("user")).assistant.delivery({ message: "Qual é a rota?" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("allows the customer assistant through public tRPC", async () => {
    const result = await appRouter.createCaller({ user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] }).assistant.customer({ message: "Quais produtos vocês vendem?" });
    expect(result).toBe("Resposta de teste");
    expect(getAssistantScope("customer")).toContain("produtos");
  });
  it("blocks the admin assistant for non-admin users", async () => {
    await expect(appRouter.createCaller(context("user")).assistant.admin({ message: "Mostre o caixa." })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("creates a product through the admin contract", async () => {
    const spy = vi.spyOn(db, "createProduct").mockResolvedValue({ id: 101 });
    await expect(appRouter.createCaller(context("admin")).admin.catalog.create({ sku: "CIMENTO-101", name: "Cimento teste", slug: "cimento-teste-101", unit: "saco", price: "39.90", active: 1 })).resolves.toEqual({ id: 101 });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ sku: "CIMENTO-101", price: "39.90" }));
    spy.mockRestore();
  });
  it("updates a product through the admin contract", async () => {
    const spy = vi.spyOn(db, "updateProduct").mockResolvedValue({ id: 101 });
    await expect(appRouter.createCaller(context("admin")).admin.catalog.update({ id: 101, name: "Cimento actualizado", price: "41.50" })).resolves.toEqual({ id: 101 });
    expect(spy).toHaveBeenCalledWith(101, { name: "Cimento actualizado", price: "41.50" });
    spy.mockRestore();
  });
  it("publishes a product through the admin contract", async () => {
    const spy = vi.spyOn(db, "setProductActive").mockResolvedValue({ id: 101 });
    await expect(appRouter.createCaller(context("admin")).admin.catalog.publish({ id: 101, active: 1 })).resolves.toEqual({ id: 101 });
    expect(spy).toHaveBeenCalledWith(101, 1);
    spy.mockRestore();
  });
  it("validates catalog mutations before persistence", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.admin.catalog.create({ sku: "x", name: "Produto", slug: "produto", unit: "un", price: "10" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.admin.catalog.update({ id: 1, slug: "x" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.admin.catalog.publish({ id: 1, active: 2 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
