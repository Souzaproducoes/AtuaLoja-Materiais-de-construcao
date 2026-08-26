import { decimal, integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin", "manager", "sales", "stock", "logistics"]);
export const customerTypeEnum = pgEnum("customerType", ["individual", "professional", "company"]);
export const quoteStatusEnum = pgEnum("quoteStatus", ["new", "draft", "sent", "negotiating", "approved", "lost", "expired"]);
export const orderSourceEnum = pgEnum("orderSource", ["store", "website", "whatsapp", "quote"]);
export const orderStatusEnum = pgEnum("orderStatus", ["awaiting_payment", "confirmed", "separating", "ready", "in_route", "delivered", "cancelled"]);
export const fulfillmentEnum = pgEnum("fulfillment", ["pickup", "delivery"]);
export const activityTypeEnum = pgEnum("activityType", ["call", "whatsapp", "email", "note", "task"]);
export const deliveryStatusEnum = pgEnum("deliveryStatus", ["assigned", "checked", "departed", "in_route", "arrived", "confirmed", "partial", "failed", "cancelled"]);
export const proofTypeEnum = pgEnum("proofType", ["code", "signature", "photo", "manual"]);
export const contactTypeEnum = pgEnum("contactType", ["phone", "email", "whatsapp", "address"]);
export const stageEnum = pgEnum("stage", ["prospecting", "qualified", "proposal", "negotiation", "won", "lost"]);
export const inventoryMovTypeEnum = pgEnum("inventoryMovType", ["purchase", "sale", "reservation", "release", "adjustment", "return"]);
export const stockResStatusEnum = pgEnum("stockResStatus", ["active", "released", "consumed", "cancelled"]);
export const purchaseStatusEnum = pgEnum("purchaseStatus", ["draft", "sent", "partial", "received", "cancelled"]);
export const cashSessionStatusEnum = pgEnum("cashSessionStatus", ["open", "closed", "audited"]);
export const cashMovTypeEnum = pgEnum("cashMovType", ["sale", "expense", "withdrawal", "deposit", "refund", "adjustment"]);
export const cashMethodEnum = pgEnum("cashMethod", ["cash", "pix", "card", "transfer", "other"]);
export const priceTableCustomerTypeEnum = pgEnum("priceTableCustomerType", ["all", "individual", "professional", "company"]);
export const checklistStatusEnum = pgEnum("checklistStatus", ["pending", "loaded", "delivered", "partial", "missing", "damaged"]);
export const divergTypeEnum = pgEnum("divergType", ["shortage", "damage", "refusal", "wrong_item", "other"]);
export const divergStatusEnum = pgEnum("divergStatus", ["open", "investigating", "resolved", "rejected"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  email: varchar("email", { length: 320 }),
  customerType: customerTypeEnum("customerType").default("individual").notNull(),
  city: varchar("city", { length: 120 }).default("Niquelândia").notNull(),
  postalCode: varchar("postalCode", { length: 12 }),
  address: text("address"),
  addressNumber: varchar("addressNumber", { length: 20 }),
  complement: varchar("complement", { length: 120 }),
  reference: varchar("reference", { length: 180 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 140 }).notNull().unique(),
  description: text("description"),
  active: integer("active").default(1).notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  sku: varchar("sku", { length: 80 }).notNull().unique(),
  name: varchar("name", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  categoryId: integer("categoryId"),
  description: text("description"),
  specifications: text("specifications"),
  unit: varchar("unit", { length: 32 }).default("unidade").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  cost: decimal("cost", { precision: 12, scale: 2 }),
  weight: decimal("weight", { precision: 12, scale: 3 }),
  imageUrl: text("imageUrl"),
  imageKey: varchar("imageKey", { length: 255 }),
  active: integer("active").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  productId: integer("productId").notNull(),
  location: varchar("location", { length: 100 }).default("loja-principal").notNull(),
  available: decimal("available", { precision: 12, scale: 3 }).default("0").notNull(),
  reserved: decimal("reserved", { precision: 12, scale: 3 }).default("0").notNull(),
  minimum: decimal("minimum", { precision: 12, scale: 3 }).default("0").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  customerId: integer("customerId"),
  status: quoteStatusEnum("status").default("new").notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).default("0").notNull(),
  deliveryCity: varchar("deliveryCity", { length: 120 }),
  deliveryPostalCode: varchar("deliveryPostalCode", { length: 24 }),
  deliveryAddress: text("deliveryAddress"),
  deliveryAddressNumber: varchar("deliveryAddressNumber", { length: 32 }),
  deliveryComplement: varchar("deliveryComplement", { length: 160 }),
  deliveryReference: varchar("deliveryReference", { length: 240 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  customerId: integer("customerId"),
  quoteId: integer("quoteId"),
  source: orderSourceEnum("source").default("website").notNull(),
  status: orderStatusEnum("status").default("awaiting_payment").notNull(),
  fulfillment: fulfillmentEnum("fulfillment").default("delivery").notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).default("0").notNull(),
  deliveryFee: decimal("deliveryFee", { precision: 12, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).default("0").notNull(),
  deliveryAddress: text("deliveryAddress"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  customerId: integer("customerId"),
  userId: integer("userId"),
  type: activityTypeEnum("type").default("note").notNull(),
  summary: text("summary").notNull(),
  dueAt: timestamp("dueAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const auditLogs = pgTable("auditLogs", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  entity: varchar("entity", { length: 80 }).notNull(),
  entityId: varchar("entityId", { length: 80 }).notNull(),
  action: varchar("action", { length: 80 }).notNull(),
  beforeJson: text("beforeJson"),
  afterJson: text("afterJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const deliveries = pgTable("deliveries", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull(),
  driverId: integer("driverId"),
  status: deliveryStatusEnum("status").default("assigned").notNull(),
  routeOrder: integer("routeOrder").default(0).notNull(),
  address: text("address").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  itemsSummary: varchar("itemsSummary", { length: 255 }),
  recipientName: varchar("recipientName", { length: 160 }),
  recipientPhone: varchar("recipientPhone", { length: 32 }),
  plannedAt: timestamp("plannedAt"),
  departedAt: timestamp("departedAt"),
  arrivedAt: timestamp("arrivedAt"),
  completedAt: timestamp("completedAt"),
  proofType: proofTypeEnum("proofType"),
  proofUrl: text("proofUrl"),
  confirmationCode: varchar("confirmationCode", { length: 16 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const driverLocations = pgTable("driverLocations", {
  id: serial("id").primaryKey(),
  driverId: integer("driverId").notNull(),
  deliveryId: integer("deliveryId"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  accuracy: decimal("accuracy", { precision: 10, scale: 2 }),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});

export const deliveryEvents = pgTable("deliveryEvents", {
  id: serial("id").primaryKey(),
  deliveryId: integer("deliveryId").notNull(),
  actorId: integer("actorId"),
  status: varchar("status", { length: 40 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const customerContacts = pgTable("customerContacts", {
  id: serial("id").primaryKey(),
  customerId: integer("customerId").notNull(),
  type: contactTypeEnum("type").notNull(),
  value: varchar("value", { length: 320 }).notNull(),
  label: varchar("label", { length: 80 }),
  isPrimary: integer("isPrimary").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  customerId: integer("customerId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  stage: stageEnum("stage").default("prospecting").notNull(),
  value: decimal("value", { precision: 12, scale: 2 }).default("0").notNull(),
  ownerId: integer("ownerId"),
  nextActionAt: timestamp("nextActionAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const quoteItems = pgTable("quoteItems", {
  id: serial("id").primaryKey(),
  quoteId: integer("quoteId").notNull(),
  productId: integer("productId"),
  description: varchar("description", { length: 180 }).notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 32 }).notNull(),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
});

export const orderItems = pgTable("orderItems", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull(),
  productId: integer("productId"),
  description: varchar("description", { length: 180 }).notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 32 }).notNull(),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
});

export const priceTables = pgTable("priceTables", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  customerType: priceTableCustomerTypeEnum("customerType").default("all").notNull(),
  active: integer("active").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const priceTableItems = pgTable("priceTableItems", {
  id: serial("id").primaryKey(),
  priceTableId: integer("priceTableId").notNull(),
  productId: integer("productId").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
});

export const inventoryMovements = pgTable("inventoryMovements", {
  id: serial("id").primaryKey(),
  productId: integer("productId").notNull(),
  location: varchar("location", { length: 100 }).notNull(),
  type: inventoryMovTypeEnum("type").notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  referenceType: varchar("referenceType", { length: 60 }),
  referenceId: integer("referenceId"),
  notes: text("notes"),
  userId: integer("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const stockReservations = pgTable("stockReservations", {
  id: serial("id").primaryKey(),
  productId: integer("productId").notNull(),
  location: varchar("location", { length: 100 }).default("loja-principal").notNull(),
  orderId: integer("orderId"),
  quoteId: integer("quoteId"),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  status: stockResStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  document: varchar("document", { length: 32 }),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  city: varchar("city", { length: 120 }),
  notes: text("notes"),
  active: integer("active").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const purchaseOrders = pgTable("purchaseOrders", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  supplierId: integer("supplierId").notNull(),
  status: purchaseStatusEnum("status").default("draft").notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).default("0").notNull(),
  expectedAt: timestamp("expectedAt"),
  notes: text("notes"),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const purchaseItems = pgTable("purchaseItems", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchaseOrderId").notNull(),
  productId: integer("productId").notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  unitCost: decimal("unitCost", { precision: 12, scale: 2 }).notNull(),
  receivedQuantity: decimal("receivedQuantity", { precision: 12, scale: 3 }).default("0").notNull(),
});

export const cashSessions = pgTable("cashSessions", {
  id: serial("id").primaryKey(),
  openedBy: integer("openedBy").notNull(),
  openingAmount: decimal("openingAmount", { precision: 12, scale: 2 }).notNull(),
  closingAmount: decimal("closingAmount", { precision: 12, scale: 2 }),
  status: cashSessionStatusEnum("status").default("open").notNull(),
  openedAt: timestamp("openedAt").defaultNow().notNull(),
  closedAt: timestamp("closedAt"),
  notes: text("notes"),
});

export const cashMovements = pgTable("cashMovements", {
  id: serial("id").primaryKey(),
  sessionId: integer("sessionId").notNull(),
  type: cashMovTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  method: cashMethodEnum("method").notNull(),
  referenceType: varchar("referenceType", { length: 60 }),
  referenceId: integer("referenceId"),
  notes: text("notes"),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Quote = typeof quotes.$inferSelect;
export type Order = typeof orders.$inferSelect;

export const purchaseReceipts = pgTable("purchaseReceipts", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchaseOrderId").notNull(),
  receivedBy: integer("receivedBy"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const purchaseReceiptItems = pgTable("purchaseReceiptItems", {
  id: serial("id").primaryKey(),
  receiptId: integer("receiptId").notNull(),
  purchaseItemId: integer("purchaseItemId").notNull(),
  productId: integer("productId").notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  location: varchar("location", { length: 100 }).notNull(),
});

export const customerAddresses = pgTable("customerAddresses", {
  id: serial("id").primaryKey(),
  customerId: integer("customerId").notNull(),
  label: varchar("label", { length: 80 }).notNull(),
  postalCode: varchar("postalCode", { length: 12 }),
  city: varchar("city", { length: 120 }).notNull(),
  address: text("address").notNull(),
  addressNumber: varchar("addressNumber", { length: 20 }),
  complement: varchar("complement", { length: 120 }),
  reference: varchar("reference", { length: 180 }),
  isDefault: integer("isDefault").default(0).notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const quoteAttachments = pgTable("quoteAttachments", {
  id: serial("id").primaryKey(),
  quoteId: integer("quoteId").notNull(),
  uploadedBy: integer("uploadedBy"),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 255 }).notNull(),
  url: text("url").notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  sizeBytes: integer("sizeBytes").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const deliveryItemChecks = pgTable("deliveryItemChecks", {
  id: serial("id").primaryKey(),
  deliveryId: integer("deliveryId").notNull(),
  orderItemId: integer("orderItemId").notNull(),
  productId: integer("productId"),
  description: varchar("description", { length: 180 }).notNull(),
  expectedQuantity: decimal("expectedQuantity", { precision: 12, scale: 3 }).notNull(),
  loadedQuantity: decimal("loadedQuantity", { precision: 12, scale: 3 }).default("0").notNull(),
  deliveredQuantity: decimal("deliveredQuantity", { precision: 12, scale: 3 }).default("0").notNull(),
  status: checklistStatusEnum("status").default("pending").notNull(),
  notes: text("notes"),
  checkedBy: integer("checkedBy"),
  checkedAt: timestamp("checkedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const deliveryDivergences = pgTable("deliveryDivergences", {
  id: serial("id").primaryKey(),
  deliveryId: integer("deliveryId").notNull(),
  deliveryItemCheckId: integer("deliveryItemCheckId"),
  type: divergTypeEnum("type").notNull(),
  status: divergStatusEnum("status").default("open").notNull(),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 3 }),
  openedBy: integer("openedBy"),
  resolvedBy: integer("resolvedBy"),
  resolution: text("resolution"),
  dueAt: timestamp("dueAt"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  customerId: integer("customerId"),
  type: varchar("type", { length: 60 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  body: text("body").notNull(),
  link: varchar("link", { length: 255 }),
  entity: varchar("entity", { length: 80 }),
  entityId: varchar("entityId", { length: 80 }),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
