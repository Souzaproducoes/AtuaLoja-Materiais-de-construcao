import { describe, expect, it, vi } from "vitest";
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
import { askAssistant, getAssistantScope } from "./assistant";
import { invokeLLM } from "./_core/llm";

describe("assistant scopes", () => {
  it("keeps customer scope free of internal operational data", () => {
    const scope = getAssistantScope("customer");
    expect(scope).toContain("Nunca revele dados de outros clientes");
    expect(scope).toContain("margens");
  });

  it("keeps delivery scope focused on assigned delivery work", () => {
    const scope = getAssistantScope("delivery");
    expect(scope).toContain("motorista");
    expect(scope).toContain("não permita encerrar uma entrega sem prova válida");
  });

  it("gives administrators broad operational coverage without autonomous changes", () => {
    const scope = getAssistantScope("admin");
    expect(scope).toContain("CRM");
    expect(scope).toContain("Nunca invente números");
  });

  it("defines specialist scopes for catalogue, stock, finance, CRM, security, SEO and PWA", () => {
    expect(getAssistantScope("catalog")).toContain("SKU");
    expect(getAssistantScope("inventory")).toContain("reservas");
    expect(getAssistantScope("finance")).toContain("caixa");
    expect(getAssistantScope("crm")).toContain("oportunidades");
    expect(getAssistantScope("security")).toContain("autorização");
    expect(getAssistantScope("seo")).toContain("SEO local");
    expect(getAssistantScope("pwa")).toContain("service worker");
  });

  it("applies specialist guardrails and returns a safe fallback", async () => {
    const mockInvokeLLM = vi.mocked(invokeLLM);
    mockInvokeLLM.mockResolvedValueOnce({ choices: [{ message: { content: "Revisão concluída" } }] } as never);
    const answer = await askAssistant("security", "Auditar uploads", "contexto autorizado");
    expect(answer).toBe("Revisão concluída");
    expect(mockInvokeLLM.mock.calls[0]?.[0].messages[0].content).toContain("Não revele segredos");
    mockInvokeLLM.mockResolvedValueOnce({ choices: [{ message: { content: null } }] } as never);
    await expect(askAssistant("pwa", "Verificar offline")).resolves.toContain("Não consegui gerar");
  });
});
