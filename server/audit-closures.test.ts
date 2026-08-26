import { describe, expect, it, vi } from "vitest";

vi.mock("./storage", () => ({ storagePut: vi.fn(async (key: string) => ({ key, url: `https://storage.example/${key}` })) }));

import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";

const publicContext = (): TrpcContext => ({ user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
const adminContext = (): TrpcContext => ({ user: { id: 8, openId: "audit-closures", name: "Gestão", email: "gestao@example.com", loginMethod: "local", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });

describe("audit closure contracts", () => {
  it("rejects malformed quote attachments before storage", async () => {
    await expect(appRouter.createCaller(publicContext()).quote.uploadAttachment({ quoteId: 3, filename: "fatura.exe", contentType: "image/png", dataUrl: "data:text/plain;base64,AAAA" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects oversized quote attachment payloads before storage", async () => {
    const existsSpy = vi.spyOn(db, "getQuoteById").mockResolvedValue({ id: 3 } as never);
    const oversized = `data:image/png;base64,${"A".repeat(12_000_001)}`;
    await expect(appRouter.createCaller(publicContext()).quote.uploadAttachment({ quoteId: 3, filename: "planta.png", contentType: "image/png", dataUrl: oversized })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    existsSpy.mockRestore();
  });

  it("forwards a valid CRM address to persistence", async () => {
    const spy = vi.spyOn(db, "saveCustomerAddress").mockResolvedValue({ id: 44 } as never);
    const result = await appRouter.createCaller(adminContext()).crm.saveAddress({ customerId: 12, label: "Obra principal", city: "Niquelândia", address: "Rua da Obra", addressNumber: "10", isDefault: 1 });
    expect(result).toEqual({ id: 44 });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ customerId: 12, city: "Niquelândia", isDefault: 1 }));
    spy.mockRestore();
  });

  it("persists customer, items and complete address when creating a quote", async () => {
    const customerSpy = vi.spyOn(db, "createCustomer").mockResolvedValue({ id: 21 } as never);
    const quoteSpy = vi.spyOn(db, "createQuote").mockResolvedValue({ id: 31 } as never);
    const addressSpy = vi.spyOn(db, "saveCustomerAddress").mockResolvedValue({ id: 51 } as never);
    const result = await appRouter.createCaller(publicContext()).quote.create({ name: "Cliente Obra", phone: "62999999999", city: "Niquelândia", postalCode: "76420-000", address: "Rua da Obra", addressNumber: "10", complement: "Galpão", reference: "Portão verde", notes: "Entrega para a obra", total: "99.90", items: [{ productId: 1, description: "Cimento", quantity: 2, unit: "saco", unitPrice: "49.95", total: "99.90" }] });
    expect(result.quoteId).toBe(31);
    expect(customerSpy).toHaveBeenCalledWith(expect.objectContaining({ name: "Cliente Obra", address: "Rua da Obra" }));
    expect(addressSpy).toHaveBeenCalledWith(expect.objectContaining({ customerId: 21, address: "Rua da Obra", isDefault: 1 }));
    expect(quoteSpy).toHaveBeenCalledWith(expect.objectContaining({ customerId: 21, deliveryAddress: "Rua da Obra", deliveryAddressNumber: "10", deliveryComplement: "Galpão", deliveryReference: "Portão verde", items: expect.arrayContaining([expect.objectContaining({ productId: 1 })]) }));
    customerSpy.mockRestore();
    quoteSpy.mockRestore();
    addressSpy.mockRestore();
  });

  it("creates a quote and reuses its returned id for an associated attachment", async () => {
    const customerSpy = vi.spyOn(db, "createCustomer").mockResolvedValue({ id: 22 } as never);
    const addressSpy = vi.spyOn(db, "saveCustomerAddress").mockResolvedValue({ id: 52 } as never);
    const quoteSpy = vi.spyOn(db, "createQuote").mockResolvedValue({ id: 32 } as never);
    const existsSpy = vi.spyOn(db, "getQuoteById").mockResolvedValue({ id: 32 } as never);
    const attachmentSpy = vi.spyOn(db, "addQuoteAttachment").mockResolvedValue({ id: 72 } as never);
    const listSpy = vi.spyOn(db, "listQuoteAttachments").mockResolvedValue([{ id: 72, quoteId: 32, fileName: "planta.png" }] as never);
    const created = await appRouter.createCaller(publicContext()).quote.create({ name: "Cliente Integrado", phone: "62988888888", city: "Niquelândia", address: "Rua Integrada", notes: "Anexo da obra", total: "10.00", items: [{ description: "Areia", quantity: 1, unit: "m³", unitPrice: "10.00", total: "10.00" }] });
    const uploaded = await appRouter.createCaller(publicContext()).quote.uploadAttachment({ quoteId: created.quoteId, filename: "planta.png", contentType: "image/png", dataUrl: "data:image/png;base64,AAAA" });
    const listed = await appRouter.createCaller(publicContext()).quote.attachments({ quoteId: created.quoteId });
    expect(created.quoteId).toBe(32);
    expect(uploaded.key).toContain("quotes/32/");
    expect(attachmentSpy).toHaveBeenCalledWith(expect.objectContaining({ quoteId: 32, fileName: "planta.png" }));
    expect(listed).toEqual([expect.objectContaining({ quoteId: 32, fileName: "planta.png" })]);
    expect(listSpy).toHaveBeenCalledWith(32);
    customerSpy.mockRestore();
    addressSpy.mockRestore();
    quoteSpy.mockRestore();
    existsSpy.mockRestore();
    attachmentSpy.mockRestore();
    listSpy.mockRestore();
  });

  it("rejects attachments for a quote that does not exist", async () => {
    const existsSpy = vi.spyOn(db, "getQuoteById").mockResolvedValue(undefined);
    await expect(appRouter.createCaller(publicContext()).quote.uploadAttachment({ quoteId: 9999, filename: "planta.png", contentType: "image/png", dataUrl: "data:image/png;base64,AAAA" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    existsSpy.mockRestore();
  });

  it("lists quote attachments only for a positive quote scope", async () => {
    const spy = vi.spyOn(db, "listQuoteAttachments").mockResolvedValue([{ id: 7, quoteId: 3, fileName: "planta.png" }] as never);
    const result = await appRouter.createCaller(publicContext()).quote.attachments({ quoteId: 3 });
    expect(result).toHaveLength(1);
    expect(spy).toHaveBeenCalledWith(3);
    spy.mockRestore();
    await expect(appRouter.createCaller(publicContext()).quote.attachments({ quoteId: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("persists customer registration through the protected CRM contract", async () => {
    const spy = vi.spyOn(db, "updateCustomer").mockResolvedValue({ id: 12 } as never);
    const result = await appRouter.createCaller(adminContext()).crm.updateCustomer({ id: 12, name: "Cliente Obra", phone: "62999999999", city: "Niquelândia", address: "Rua da Obra" });
    expect(result).toEqual({ id: 12 });
    expect(spy).toHaveBeenCalledWith(12, expect.objectContaining({ name: "Cliente Obra", address: "Rua da Obra" }));
    spy.mockRestore();
  });

  it("converts a quote using the registered customer and delivery data", async () => {
    const spy = vi.spyOn(db, "convertQuoteToOrder").mockResolvedValue({ orderId: 88, deliveryId: 9 });
    const result = await appRouter.createCaller(adminContext()).crm.convertQuote({ quoteId: 4, customerId: 12, fulfillment: "delivery", deliveryAddress: "Rua da Obra, 10", deliveryFee: "25.00" });
    expect(result).toEqual({ orderId: 88, deliveryId: 9 });
    expect(spy).toHaveBeenCalledWith({ quoteId: 4, customerId: 12, fulfillment: "delivery", deliveryAddress: "Rua da Obra, 10", deliveryFee: "25.00", actorId: 8 });
    spy.mockRestore();
  });

  it("blocks CRM address management for anonymous callers", async () => {
    await expect(appRouter.createCaller(publicContext()).crm.addresses({ customerId: 12 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
