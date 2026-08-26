import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import { credentialsMatch, isLocalAdminLoginConfigured } from "./local-auth";
import { getConfiguredLlmProviders } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { calculateFreight } from "./freight";
import { storagePut } from "./storage";
import { askAssistant } from "./assistant";
import { addActivity, addCashMovement, addCustomerContact, addQuoteAttachment, adjustInventory, auditCashSession, closeCashSession, convertQuoteToOrder, createCustomer, createOpportunity, createProduct, createPublicOrder, createPurchaseOrder, createQuote, createSupplier, getQuoteById, getDeliveryChecklist, getDeliveryByCode, getInventory, getOpportunities, createNotification, listCustomerAddresses, listDeliveryDivergences, listNotifications, listQuoteAttachments, markNotificationRead, registerSalePayment, resolveDeliveryDivergence, saveCustomerAddress, updateCustomer, updateDeliveryChecklist, getActiveDeliveries, getAdminProducts, getAssignedDeliveries, getAuditLogs, getCashSessionSummary, getCashSessions, getCustomers, getCustomerActivities, getDashboardSummary, getPublicProducts, getRecentOrders, getPurchaseOrderDetails, listPurchaseOrders, listSuppliers, openCashSession, receivePurchaseOrder, recordDriverLocation, setProductActive, transitionDelivery, updateProduct, getUserByOpenId, upsertUser, getReportSalesByMonth, getReportOrdersByStatus, getReportOrdersBySource, getReportTopProducts, getReportDeliveriesByStatus, getReportCashSummary, getReportCustomersByCity, getReportInventoryLow, getReportQuoteConversion } from "./db";

const driverProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!["admin", "manager", "logistics"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso reservado à equipa de logística." });
  return next();
});

export const appRouter = router({
  system: systemRouter,
  assistant: router({
    customer: publicProcedure.input(z.object({ message: z.string().min(2), context: z.string().max(4000).optional() })).mutation(({ input, ctx }) => askAssistant("customer", input.message, input.context, (ctx.user?.role as any) || "user")),
    delivery: driverProcedure.input(z.object({ message: z.string().min(2), context: z.string().max(4000).optional() })).mutation(({ input, ctx }) => askAssistant("delivery", input.message, input.context, (ctx.user?.role as any) || "logistics")),
    admin: adminProcedure.input(z.object({ message: z.string().min(2), context: z.string().max(6000).optional() })).mutation(({ input, ctx }) => askAssistant("admin", input.message, input.context, (ctx.user?.role as any) || "admin")),
    catalog: adminProcedure.input(z.object({ message: z.string().min(2), context: z.string().max(6000).optional() })).mutation(({ input, ctx }) => askAssistant("catalog", input.message, input.context, (ctx.user?.role as any) || "admin")),
    inventory: adminProcedure.input(z.object({ message: z.string().min(2), context: z.string().max(6000).optional() })).mutation(({ input, ctx }) => askAssistant("inventory", input.message, input.context, (ctx.user?.role as any) || "admin")),
    finance: adminProcedure.input(z.object({ message: z.string().min(2), context: z.string().max(6000).optional() })).mutation(({ input, ctx }) => askAssistant("finance", input.message, input.context, (ctx.user?.role as any) || "admin")),
    crm: adminProcedure.input(z.object({ message: z.string().min(2), context: z.string().max(6000).optional() })).mutation(({ input, ctx }) => askAssistant("crm", input.message, input.context, (ctx.user?.role as any) || "admin")),
    security: adminProcedure.input(z.object({ message: z.string().min(2), context: z.string().max(6000).optional() })).mutation(({ input, ctx }) => askAssistant("security", input.message, input.context, (ctx.user?.role as any) || "admin")),
    seo: adminProcedure.input(z.object({ message: z.string().min(2), context: z.string().max(6000).optional() })).mutation(({ input, ctx }) => askAssistant("seo", input.message, input.context, (ctx.user?.role as any) || "admin")),
    pwa: adminProcedure.input(z.object({ message: z.string().min(2), context: z.string().max(6000).optional() })).mutation(({ input, ctx }) => askAssistant("pwa", input.message, input.context, (ctx.user?.role as any) || "admin")),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    localLogin: publicProcedure.input(z.object({ username: z.string().min(1), password: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      if (!isLocalAdminLoginConfigured()) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Login local indisponível. Preencha LOCAL_ADMIN_USERNAME e LOCAL_ADMIN_PASSWORD no .env." });
      if (!ENV.databaseUrl) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "DATABASE_URL não configurada. Configure a base de dados antes do login local." });
      if (!credentialsMatch(input.username, input.password)) throw new TRPCError({ code: "UNAUTHORIZED", message: "Utilizador ou password inválidos." });
      await upsertUser({ openId: ENV.localAdminOpenId, name: ENV.localAdminName, email: ENV.localAdminEmail || `${ENV.localAdminUsername}@local.invalid`, loginMethod: "local", lastSignedIn: new Date() });
      const user = await getUserByOpenId(ENV.localAdminOpenId);
      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível criar a sessão administrativa local." });
      const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || ENV.localAdminName, expiresInMs: 8 * 60 * 60 * 1000 });
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(ctx.req), maxAge: 8 * 60 * 60 * 1000 });
      return { success: true } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => { ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 }); return { success: true } as const; }),
  }),
  catalog: router({
    list: publicProcedure.query(() => getPublicProducts()),
  }),
  delivery: router({
    track: publicProcedure.input(z.object({ code: z.string().min(4) })).query(async ({ input }) => { const delivery = await getDeliveryByCode(input.code); return delivery ? { code: `ENT-${delivery.id}`, status: delivery.status, address: delivery.address } : null; }),
  }),
  quote: router({
    calculateFreight: publicProcedure.input(z.object({ city: z.string().default("Niquelândia"), distanceKm: z.number().nonnegative(), subtotal: z.number().nonnegative() })).query(({ input }) => calculateFreight(input)),
    create: publicProcedure.input(z.object({ name: z.string().min(2), phone: z.string().min(8), email: z.string().email().optional(), city: z.string().default("Niquelândia"), postalCode: z.string().optional(), address: z.string().optional(), addressNumber: z.string().optional(), complement: z.string().optional(), reference: z.string().optional(), notes: z.string().min(3), total: z.string().optional(), distanceKm: z.number().nonnegative().optional(), items: z.array(z.object({ productId: z.number().positive().optional(), description: z.string().min(2), quantity: z.number().positive(), unit: z.string().min(1), unitPrice: z.string(), total: z.string() })).optional() })).mutation(async ({ input }) => {
      const customer = await createCustomer({ name: input.name, phone: input.phone, email: input.email, city: input.city, postalCode: input.postalCode, address: input.address, addressNumber: input.addressNumber, complement: input.complement, reference: input.reference });
      if (input.address?.trim()) await saveCustomerAddress({ customerId: customer.id, label: "Endereço do orçamento", postalCode: input.postalCode, city: input.city, address: input.address, addressNumber: input.addressNumber, complement: input.complement, reference: input.reference, isDefault: 1 });
      const freight = input.distanceKm === undefined ? null : calculateFreight({ city: input.city, distanceKm: input.distanceKm, subtotal: Number(input.total || 0) });
      if (freight && !freight.eligible) throw new TRPCError({ code: "BAD_REQUEST", message: freight.reason });
      const quote = await createQuote({ code: `ORC-${Date.now().toString().slice(-6)}`, customerId: customer.id, total: input.total || "0", deliveryCity: input.city, deliveryPostalCode: input.postalCode, deliveryAddress: input.address, deliveryAddressNumber: input.addressNumber, deliveryComplement: input.complement, deliveryReference: input.reference, notes: `${input.notes}${freight ? `\n${freight.reason}: R$ ${freight.amount.toFixed(2)}` : ""}`, items: input.items });
      return { customerId: customer.id, quoteId: quote.id, freight };
    }),
    checkout: publicProcedure.input(z.object({ name: z.string().min(2), phone: z.string().min(8), email: z.string().email().optional(), city: z.string().min(2), address: z.string().min(5), addressNumber: z.string().optional(), complement: z.string().optional(), reference: z.string().optional(), distanceKm: z.number().nonnegative().optional(), subtotal: z.string(), deliveryFee: z.string().optional(), items: z.array(z.object({ productId: z.number().positive().optional(), description: z.string().min(2), quantity: z.number().positive(), unit: z.string().min(1), unitPrice: z.string(), total: z.string() })).min(1) })).mutation(({ input }) => { const distanceKm = input.distanceKm ?? (input.city.trim().toLowerCase() === "niquelândia" ? 0 : 81); const freight = calculateFreight({ city: input.city, distanceKm, subtotal: Number(input.subtotal) }); if (!freight.eligible) throw new TRPCError({ code: "BAD_REQUEST", message: freight.reason }); return createPublicOrder({ ...input, deliveryFee: input.deliveryFee ?? freight.amount.toFixed(2) }); }),
    uploadAttachment: publicProcedure.input(z.object({ quoteId: z.number().positive(), filename: z.string().min(3).max(180), contentType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]), dataUrl: z.string().regex(/^data:(application\/pdf|image\/(jpeg|png|webp));base64,/) })).mutation(async ({ input }) => { const quote = await getQuoteById(input.quoteId); if (!quote) throw new TRPCError({ code: "NOT_FOUND", message: "Orçamento não encontrado." }); const base64 = input.dataUrl.split(",")[1]; if (!base64 || base64.length > 12_000_000) throw new TRPCError({ code: "BAD_REQUEST", message: "Anexo inválido ou demasiado grande." }); const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_"); const uploaded = await storagePut(`quotes/${input.quoteId}/${Date.now()}-${safeName}`, Buffer.from(base64, "base64"), input.contentType); await addQuoteAttachment({ quoteId: input.quoteId, fileName: safeName, fileKey: uploaded.key, url: uploaded.url, mimeType: input.contentType, sizeBytes: Buffer.byteLength(base64, "base64") }); return uploaded; }),
    attachments: publicProcedure.input(z.object({ quoteId: z.number().positive() })).query(({ input }) => listQuoteAttachments(input.quoteId)),
    }),
  crm: router({
    customers: adminProcedure.query(() => getCustomers()),
    activities: adminProcedure.input(z.object({ customerId: z.number().optional() }).optional()).query(({ input }) => getCustomerActivities(input?.customerId)),
    opportunities: adminProcedure.query(() => getOpportunities()),
    addActivity: protectedProcedure.input(z.object({ customerId: z.number().optional(), type: z.enum(["call", "whatsapp", "email", "note", "task"]), summary: z.string().min(3) })).mutation(({ ctx, input }) => addActivity({ ...input, userId: ctx.user.id })),
    updateCustomer: adminProcedure.input(z.object({ id: z.number().positive(), name: z.string().min(2), phone: z.string().min(8), email: z.string().email().optional(), city: z.string().optional(), postalCode: z.string().optional(), address: z.string().optional(), addressNumber: z.string().optional(), complement: z.string().optional(), reference: z.string().optional() })).mutation(({ input }) => { const { id, ...data } = input; return updateCustomer(id, data); }),
    addContact: protectedProcedure.input(z.object({ customerId: z.number(), type: z.enum(["phone", "email", "whatsapp", "address"]), value: z.string().min(2), label: z.string().optional(), isPrimary: z.number().optional() })).mutation(({ input }) => addCustomerContact(input)),
    addresses: adminProcedure.input(z.object({ customerId: z.number().positive() })).query(({ input }) => listCustomerAddresses(input.customerId)),
    saveAddress: adminProcedure.input(z.object({ customerId: z.number().positive(), id: z.number().positive().optional(), label: z.string().min(2), postalCode: z.string().optional(), city: z.string().min(2), address: z.string().min(5), addressNumber: z.string().optional(), complement: z.string().optional(), reference: z.string().optional(), isDefault: z.number().min(0).max(1).optional() })).mutation(({ input }) => saveCustomerAddress(input)),
    createOpportunity: protectedProcedure.input(z.object({ customerId: z.number(), title: z.string().min(2), value: z.string().optional(), stage: z.enum(["prospecting", "qualified", "proposal", "negotiation", "won", "lost"]).optional(), notes: z.string().optional() })).mutation(({ ctx, input }) => createOpportunity({ ...input, ownerId: ctx.user.id })),
    convertQuote: adminProcedure.input(z.object({ quoteId: z.number(), customerId: z.number(), fulfillment: z.enum(["pickup", "delivery"]), deliveryAddress: z.string().optional(), deliveryFee: z.string().optional() })).mutation(({ ctx, input }) => convertQuoteToOrder({ ...input, actorId: ctx.user.id })),
  }),
  driver: router({
    assigned: driverProcedure.query(({ ctx }) => getAssignedDeliveries(ctx.user.id)),
    recordLocation: driverProcedure.input(z.object({ deliveryId: z.number().optional(), latitude: z.number().gte(-90).lte(90), longitude: z.number().gte(-180).lte(180), accuracy: z.number().positive().optional() })).mutation(({ ctx, input }) => recordDriverLocation({ ...input, driverId: ctx.user.id })),
    uploadProof: driverProcedure.input(z.object({ deliveryId: z.number().positive(), filename: z.string().min(3).max(120), contentType: z.enum(["image/jpeg", "image/png", "image/webp"]), dataUrl: z.string().regex(/^data:image\/(jpeg|png|webp);base64,/) })).mutation(async ({ ctx, input }) => { const assigned = await getAssignedDeliveries(ctx.user.id); if (!assigned.some(delivery => delivery.id === input.deliveryId)) throw new TRPCError({ code: "FORBIDDEN", message: "Entrega não atribuída a este motorista." }); const base64 = input.dataUrl.split(",")[1]; if (!base64 || base64.length > 8_000_000) throw new TRPCError({ code: "BAD_REQUEST", message: "Comprovativo inválido ou demasiado grande." }); const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_"); return storagePut(`deliveries/${input.deliveryId}/${Date.now()}-${safeName}`, Buffer.from(base64, "base64"), input.contentType); }),
    transition: driverProcedure.input(z.object({ deliveryId: z.number(), status: z.enum(["checked", "departed", "in_route", "arrived", "confirmed", "partial", "failed"]), proofType: z.enum(["code", "signature", "photo", "manual"]).optional(), proofUrl: z.string().url().optional(), confirmationCode: z.string().optional(), notes: z.string().optional() })).mutation(({ ctx, input }) => transitionDelivery({ ...input, actorId: ctx.user.id })),
    checklist: driverProcedure.input(z.object({ deliveryId: z.number().positive() })).query(({ input }) => getDeliveryChecklist(input.deliveryId)),
    updateChecklist: driverProcedure.input(z.object({ deliveryId: z.number().positive(), items: z.array(z.object({ id: z.number().positive(), loadedQuantity: z.number().nonnegative(), deliveredQuantity: z.number().nonnegative(), status: z.enum(["pending", "loaded", "delivered", "partial", "missing", "damaged"]), notes: z.string().optional() })).min(1) })).mutation(({ ctx, input }) => updateDeliveryChecklist({ ...input, actorId: ctx.user.id })),
    divergences: driverProcedure.input(z.object({ deliveryId: z.number().positive().optional() }).optional()).query(({ input }) => listDeliveryDivergences(input?.deliveryId)),
  }),
  admin: router({
    catalog: router({
      list: adminProcedure.query(() => getAdminProducts()),
      create: adminProcedure.input(z.object({ sku: z.string().min(2), name: z.string().min(2), slug: z.string().min(2), categoryId: z.number().optional(), description: z.string().optional(), specifications: z.string().optional(), unit: z.string().min(1), price: z.string(), cost: z.string().optional(), weight: z.string().optional(), imageUrl: z.string().url().optional(), imageKey: z.string().optional(), active: z.number().optional() })).mutation(({ input }) => createProduct(input)),
      update: adminProcedure.input(z.object({ id: z.number(), sku: z.string().min(2).optional(), name: z.string().min(2).optional(), slug: z.string().min(2).optional(), categoryId: z.number().optional(), description: z.string().optional(), specifications: z.string().optional(), unit: z.string().optional(), price: z.string().optional(), cost: z.string().optional(), weight: z.string().optional(), imageUrl: z.string().url().optional(), imageKey: z.string().optional(), active: z.number().optional() })).mutation(({ input }) => { const { id, ...data } = input; return updateProduct(id, data); }),
      publish: adminProcedure.input(z.object({ id: z.number(), active: z.number().min(0).max(1) })).mutation(({ input }) => setProductActive(input.id, input.active)),
      uploadImage: adminProcedure.input(z.object({ filename: z.string().min(3), contentType: z.enum(["image/jpeg", "image/png", "image/webp"]), dataUrl: z.string().regex(/^data:image\/(jpeg|png|webp);base64,/), productId: z.number().optional() })).mutation(async ({ ctx, input }) => { const base64 = input.dataUrl.split(",")[1]; if (!base64 || base64.length > 7_000_000) throw new TRPCError({ code: "BAD_REQUEST", message: "Imagem inválida ou demasiado grande." }); const uploaded = await storagePut(`products/${input.productId || "new"}/${input.filename}`, Buffer.from(base64, "base64"), input.contentType); return { ...uploaded, uploadedBy: ctx.user.id }; }),
    }),
    summary: adminProcedure.query(() => getDashboardSummary()),
    systemConfig: adminProcedure.query(() => {
      const llmProviders = getConfiguredLlmProviders();
      return {
        hasDatabase: Boolean(ENV.databaseUrl),
        hasOAuth: false,
        hasLocalLogin: isLocalAdminLoginConfigured(),
        llmProviders: llmProviders.map(p => ({ name: p.name, model: p.model })),
        hasService: Boolean(ENV.serviceApiKey),
        isProduction: ENV.isProduction,
        storeName: "Atua Loja Materiais de Construção",
        storeCity: "Niquelândia",
        storePhone: "+55 62 99144-4852",
      };
    }),
    recentOrders: adminProcedure.query(() => getRecentOrders()),
    sales: router({ list: adminProcedure.query(() => getRecentOrders()), registerPayment: adminProcedure.input(z.object({ sessionId: z.number().positive(), orderId: z.number().positive(), amount: z.string().refine(value => Number(value) > 0, "Valor inválido"), method: z.enum(["cash", "pix", "card", "transfer", "other"]), notes: z.string().optional() })).mutation(({ ctx, input }) => registerSalePayment({ ...input, createdBy: ctx.user.id })), }),
    activeDeliveries: adminProcedure.query(() => getActiveDeliveries()),
    auditLogs: adminProcedure.query(() => getAuditLogs()),
    notifications: adminProcedure.input(z.object({ unreadOnly: z.boolean().optional() }).optional()).query(({ ctx, input }) => listNotifications({ userId: ctx.user.id, unreadOnly: input?.unreadOnly })),
    markNotificationRead: adminProcedure.input(z.object({ id: z.number().positive() })).mutation(({ ctx, input }) => markNotificationRead(input.id, ctx.user.id)),
    divergences: router({ list: adminProcedure.input(z.object({ deliveryId: z.number().positive().optional() }).optional()).query(({ input }) => listDeliveryDivergences(input?.deliveryId)), resolve: adminProcedure.input(z.object({ id: z.number().positive(), status: z.enum(["resolved", "rejected"]), resolution: z.string().min(3) })).mutation(({ ctx, input }) => resolveDeliveryDivergence({ ...input, resolvedBy: ctx.user.id })) }),
    erp: router({ inventory: adminProcedure.query(() => getInventory()), adjustInventory: adminProcedure.input(z.object({ productId: z.number(), location: z.string().min(1), quantity: z.number().positive(), type: z.enum(["purchase", "sale", "reservation", "release", "adjustment", "return"]), notes: z.string().optional() })).mutation(({ ctx, input }) => adjustInventory({ ...input, userId: ctx.user.id })) }),
    suppliers: router({ list: adminProcedure.query(() => listSuppliers()), create: adminProcedure.input(z.object({ name: z.string().min(2), document: z.string().optional(), phone: z.string().optional(), email: z.string().email().optional(), city: z.string().optional(), notes: z.string().optional() })).mutation(({ input }) => createSupplier(input)) }),
    purchases: router({ list: adminProcedure.query(() => listPurchaseOrders()), detail: adminProcedure.input(z.object({ id: z.number().positive() })).query(({ input }) => getPurchaseOrderDetails(input.id)), create: adminProcedure.input(z.object({ supplierId: z.number(), total: z.string().optional(), expectedAt: z.coerce.date().optional(), notes: z.string().optional(), items: z.array(z.object({ productId: z.number().positive(), quantity: z.number().positive(), unitCost: z.string().refine(value => Number(value) >= 0, "Custo inválido") })).min(1) })).mutation(({ ctx, input }) => createPurchaseOrder({ ...input, code: `COMP-${Date.now().toString().slice(-8)}`, createdBy: ctx.user.id })), receive: adminProcedure.input(z.object({ purchaseOrderId: z.number().positive(), items: z.array(z.object({ purchaseItemId: z.number().positive(), productId: z.number().positive(), quantity: z.number().positive(), location: z.string().min(1) })).min(1), notes: z.string().optional() })).mutation(({ ctx, input }) => receivePurchaseOrder({ ...input, receivedBy: ctx.user.id })) }),
    cash: router({ sessions: adminProcedure.query(() => getCashSessions()), summary: adminProcedure.input(z.object({ id: z.number().positive() })).query(({ input }) => getCashSessionSummary(input.id)), open: adminProcedure.input(z.object({ openingAmount: z.string().refine(value => Number(value) >= 0, "Valor inválido"), notes: z.string().optional() })).mutation(({ ctx, input }) => openCashSession({ ...input, openedBy: ctx.user.id })), movement: adminProcedure.input(z.object({ sessionId: z.number(), type: z.enum(["sale", "expense", "withdrawal", "deposit", "refund", "adjustment"]), amount: z.string().refine(value => Number(value) > 0, "Valor inválido"), method: z.enum(["cash", "pix", "card", "transfer", "other"]), notes: z.string().optional() })).mutation(({ ctx, input }) => addCashMovement({ ...input, createdBy: ctx.user.id })), close: adminProcedure.input(z.object({ id: z.number(), closingAmount: z.string().refine(value => Number(value) >= 0, "Valor inválido"), notes: z.string().optional() })).mutation(({ input }) => closeCashSession(input.id, input.closingAmount, input.notes)), audit: adminProcedure.input(z.object({ id: z.number().positive(), notes: z.string().optional() })).mutation(({ ctx, input }) => auditCashSession(input.id, ctx.user.id, input.notes)) }),
    reports: router({
      salesByMonth: adminProcedure.query(() => getReportSalesByMonth()),
      ordersByStatus: adminProcedure.query(() => getReportOrdersByStatus()),
      ordersBySource: adminProcedure.query(() => getReportOrdersBySource()),
      topProducts: adminProcedure.query(() => getReportTopProducts()),
      deliveriesByStatus: adminProcedure.query(() => getReportDeliveriesByStatus()),
      cashSummary: adminProcedure.query(() => getReportCashSummary()),
      customersByCity: adminProcedure.query(() => getReportCustomersByCity()),
      inventoryLow: adminProcedure.query(() => getReportInventoryLow()),
      quoteConversion: adminProcedure.query(() => getReportQuoteConversion()),
    }),
  }),
});

export type AppRouter = typeof appRouter;
