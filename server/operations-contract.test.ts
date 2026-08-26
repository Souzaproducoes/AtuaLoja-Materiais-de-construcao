import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";

const publicContext = (): TrpcContext => ({ user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
const adminContext = (): TrpcContext => ({ user: { id: 8, openId: "operations-test", name: "Gestão", email: "gestao@example.com", loginMethod: "local", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });

describe("operational contracts", () => {
  it("requires an address for public delivery checkout", async () => {
    await expect(appRouter.createCaller(publicContext()).quote.checkout({ name: "Cliente Teste", phone: "62999999999", city: "Niquelândia", address: "", subtotal: "38.90", items: [{ productId: 1, description: "Cimento", quantity: 1, unit: "saco", unitPrice: "38.90", total: "38.90" }] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("forwards a valid public checkout to persistence", async () => {
    const spy = vi.spyOn(db, "createPublicOrder").mockResolvedValue({ orderId: 501, orderCode: "PED-00000501", deliveryCode: "ENT-501" });
    const result = await appRouter.createCaller(publicContext()).quote.checkout({ name: "Cliente Teste", phone: "62999999999", city: "Niquelândia", address: "Rua da Obra, 10", subtotal: "38.90", items: [{ productId: 1, description: "Cimento", quantity: 1, unit: "saco", unitPrice: "38.90", total: "38.90" }] });
    expect(result).toEqual({ orderId: 501, orderCode: "PED-00000501", deliveryCode: "ENT-501" });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ address: "Rua da Obra, 10", items: expect.arrayContaining([expect.objectContaining({ productId: 1 })]) }));
    spy.mockRestore();
  });

  it("forwards a purchase receipt to the protected operation", async () => {
    const spy = vi.spyOn(db, "receivePurchaseOrder").mockResolvedValue({ receiptId: 9, status: "received" });
    const result = await appRouter.createCaller(adminContext()).admin.purchases.receive({ purchaseOrderId: 7, items: [{ purchaseItemId: 11, productId: 1, quantity: 4, location: "loja-principal" }] });
    expect(result).toEqual({ receiptId: 9, status: "received" });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ purchaseOrderId: 7, receivedBy: 8 }));
    spy.mockRestore();
  });

  it("uses the transactional sales payment helper", async () => {
    const spy = vi.spyOn(db, "registerSalePayment").mockResolvedValue({} as never);
    await expect(appRouter.createCaller(adminContext()).admin.sales.registerPayment({ sessionId: 3, orderId: 7, amount: "120.00", method: "pix" })).resolves.toEqual({});
    expect(spy).toHaveBeenCalledWith({ sessionId: 3, orderId: 7, amount: "120.00", method: "pix", createdBy: 8 });
    spy.mockRestore();
  });

  it("audits a closed cash session through the protected operation", async () => {
    const spy = vi.spyOn(db, "auditCashSession").mockResolvedValue({ id: 4, status: "audited", expectedAmount: 100, countedAmount: 100, difference: 0 });
    const result = await appRouter.createCaller(adminContext()).admin.cash.audit({ id: 4, notes: "Conferido" });
    expect(result).toMatchObject({ id: 4, status: "audited", difference: 0 });
    expect(spy).toHaveBeenCalledWith(4, 8, "Conferido");
    spy.mockRestore();
  });
});
