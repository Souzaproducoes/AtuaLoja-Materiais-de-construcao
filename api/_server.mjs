// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/db.ts
import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// drizzle/schema.ts
import { decimal, integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
var roleEnum = pgEnum("role", ["user", "admin", "manager", "sales", "stock", "logistics"]);
var customerTypeEnum = pgEnum("customerType", ["individual", "professional", "company"]);
var quoteStatusEnum = pgEnum("quoteStatus", ["new", "draft", "sent", "negotiating", "approved", "lost", "expired"]);
var orderSourceEnum = pgEnum("orderSource", ["store", "website", "whatsapp", "quote"]);
var orderStatusEnum = pgEnum("orderStatus", ["awaiting_payment", "confirmed", "separating", "ready", "in_route", "delivered", "cancelled"]);
var fulfillmentEnum = pgEnum("fulfillment", ["pickup", "delivery"]);
var activityTypeEnum = pgEnum("activityType", ["call", "whatsapp", "email", "note", "task"]);
var deliveryStatusEnum = pgEnum("deliveryStatus", ["assigned", "checked", "departed", "in_route", "arrived", "confirmed", "partial", "failed", "cancelled"]);
var proofTypeEnum = pgEnum("proofType", ["code", "signature", "photo", "manual"]);
var contactTypeEnum = pgEnum("contactType", ["phone", "email", "whatsapp", "address"]);
var stageEnum = pgEnum("stage", ["prospecting", "qualified", "proposal", "negotiation", "won", "lost"]);
var inventoryMovTypeEnum = pgEnum("inventoryMovType", ["purchase", "sale", "reservation", "release", "adjustment", "return"]);
var stockResStatusEnum = pgEnum("stockResStatus", ["active", "released", "consumed", "cancelled"]);
var purchaseStatusEnum = pgEnum("purchaseStatus", ["draft", "sent", "partial", "received", "cancelled"]);
var cashSessionStatusEnum = pgEnum("cashSessionStatus", ["open", "closed", "audited"]);
var cashMovTypeEnum = pgEnum("cashMovType", ["sale", "expense", "withdrawal", "deposit", "refund", "adjustment"]);
var cashMethodEnum = pgEnum("cashMethod", ["cash", "pix", "card", "transfer", "other"]);
var priceTableCustomerTypeEnum = pgEnum("priceTableCustomerType", ["all", "individual", "professional", "company"]);
var checklistStatusEnum = pgEnum("checklistStatus", ["pending", "loaded", "delivered", "partial", "missing", "damaged"]);
var divergTypeEnum = pgEnum("divergType", ["shortage", "damage", "refusal", "wrong_item", "other"]);
var divergStatusEnum = pgEnum("divergStatus", ["open", "investigating", "resolved", "rejected"]);
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  email: varchar("email", { length: 320 }),
  customerType: customerTypeEnum("customerType").default("individual").notNull(),
  city: varchar("city", { length: 120 }).default("Niquel\xE2ndia").notNull(),
  postalCode: varchar("postalCode", { length: 12 }),
  address: text("address"),
  addressNumber: varchar("addressNumber", { length: 20 }),
  complement: varchar("complement", { length: 120 }),
  reference: varchar("reference", { length: 180 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 140 }).notNull().unique(),
  description: text("description"),
  active: integer("active").default(1).notNull()
});
var products = pgTable("products", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  productId: integer("productId").notNull(),
  location: varchar("location", { length: 100 }).default("loja-principal").notNull(),
  available: decimal("available", { precision: 12, scale: 3 }).default("0").notNull(),
  reserved: decimal("reserved", { precision: 12, scale: 3 }).default("0").notNull(),
  minimum: decimal("minimum", { precision: 12, scale: 3 }).default("0").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var quotes = pgTable("quotes", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var orders = pgTable("orders", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  customerId: integer("customerId"),
  userId: integer("userId"),
  type: activityTypeEnum("type").default("note").notNull(),
  summary: text("summary").notNull(),
  dueAt: timestamp("dueAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var auditLogs = pgTable("auditLogs", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  entity: varchar("entity", { length: 80 }).notNull(),
  entityId: varchar("entityId", { length: 80 }).notNull(),
  action: varchar("action", { length: 80 }).notNull(),
  beforeJson: text("beforeJson"),
  afterJson: text("afterJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var deliveries = pgTable("deliveries", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var driverLocations = pgTable("driverLocations", {
  id: serial("id").primaryKey(),
  driverId: integer("driverId").notNull(),
  deliveryId: integer("deliveryId"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  accuracy: decimal("accuracy", { precision: 10, scale: 2 }),
  recordedAt: timestamp("recordedAt").defaultNow().notNull()
});
var deliveryEvents = pgTable("deliveryEvents", {
  id: serial("id").primaryKey(),
  deliveryId: integer("deliveryId").notNull(),
  actorId: integer("actorId"),
  status: varchar("status", { length: 40 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var customerContacts = pgTable("customerContacts", {
  id: serial("id").primaryKey(),
  customerId: integer("customerId").notNull(),
  type: contactTypeEnum("type").notNull(),
  value: varchar("value", { length: 320 }).notNull(),
  label: varchar("label", { length: 80 }),
  isPrimary: integer("isPrimary").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  customerId: integer("customerId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  stage: stageEnum("stage").default("prospecting").notNull(),
  value: decimal("value", { precision: 12, scale: 2 }).default("0").notNull(),
  ownerId: integer("ownerId"),
  nextActionAt: timestamp("nextActionAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var quoteItems = pgTable("quoteItems", {
  id: serial("id").primaryKey(),
  quoteId: integer("quoteId").notNull(),
  productId: integer("productId"),
  description: varchar("description", { length: 180 }).notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 32 }).notNull(),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull()
});
var orderItems = pgTable("orderItems", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull(),
  productId: integer("productId"),
  description: varchar("description", { length: 180 }).notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 32 }).notNull(),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull()
});
var priceTables = pgTable("priceTables", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  customerType: priceTableCustomerTypeEnum("customerType").default("all").notNull(),
  active: integer("active").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var priceTableItems = pgTable("priceTableItems", {
  id: serial("id").primaryKey(),
  priceTableId: integer("priceTableId").notNull(),
  productId: integer("productId").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull()
});
var inventoryMovements = pgTable("inventoryMovements", {
  id: serial("id").primaryKey(),
  productId: integer("productId").notNull(),
  location: varchar("location", { length: 100 }).notNull(),
  type: inventoryMovTypeEnum("type").notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  referenceType: varchar("referenceType", { length: 60 }),
  referenceId: integer("referenceId"),
  notes: text("notes"),
  userId: integer("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var stockReservations = pgTable("stockReservations", {
  id: serial("id").primaryKey(),
  productId: integer("productId").notNull(),
  location: varchar("location", { length: 100 }).default("loja-principal").notNull(),
  orderId: integer("orderId"),
  quoteId: integer("quoteId"),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  status: stockResStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  document: varchar("document", { length: 32 }),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  city: varchar("city", { length: 120 }),
  notes: text("notes"),
  active: integer("active").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var purchaseOrders = pgTable("purchaseOrders", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  supplierId: integer("supplierId").notNull(),
  status: purchaseStatusEnum("status").default("draft").notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).default("0").notNull(),
  expectedAt: timestamp("expectedAt"),
  notes: text("notes"),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var purchaseItems = pgTable("purchaseItems", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchaseOrderId").notNull(),
  productId: integer("productId").notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  unitCost: decimal("unitCost", { precision: 12, scale: 2 }).notNull(),
  receivedQuantity: decimal("receivedQuantity", { precision: 12, scale: 3 }).default("0").notNull()
});
var cashSessions = pgTable("cashSessions", {
  id: serial("id").primaryKey(),
  openedBy: integer("openedBy").notNull(),
  openingAmount: decimal("openingAmount", { precision: 12, scale: 2 }).notNull(),
  closingAmount: decimal("closingAmount", { precision: 12, scale: 2 }),
  status: cashSessionStatusEnum("status").default("open").notNull(),
  openedAt: timestamp("openedAt").defaultNow().notNull(),
  closedAt: timestamp("closedAt"),
  notes: text("notes")
});
var cashMovements = pgTable("cashMovements", {
  id: serial("id").primaryKey(),
  sessionId: integer("sessionId").notNull(),
  type: cashMovTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  method: cashMethodEnum("method").notNull(),
  referenceType: varchar("referenceType", { length: 60 }),
  referenceId: integer("referenceId"),
  notes: text("notes"),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var purchaseReceipts = pgTable("purchaseReceipts", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchaseOrderId").notNull(),
  receivedBy: integer("receivedBy"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var purchaseReceiptItems = pgTable("purchaseReceiptItems", {
  id: serial("id").primaryKey(),
  receiptId: integer("receiptId").notNull(),
  purchaseItemId: integer("purchaseItemId").notNull(),
  productId: integer("productId").notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  location: varchar("location", { length: 100 }).notNull()
});
var customerAddresses = pgTable("customerAddresses", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var quoteAttachments = pgTable("quoteAttachments", {
  id: serial("id").primaryKey(),
  quoteId: integer("quoteId").notNull(),
  uploadedBy: integer("uploadedBy"),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 255 }).notNull(),
  url: text("url").notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  sizeBytes: integer("sizeBytes").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var deliveryItemChecks = pgTable("deliveryItemChecks", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var deliveryDivergences = pgTable("deliveryDivergences", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var notifications = pgTable("notifications", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull()
});

// server/_core/env.ts
var ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  localAdminUsername: process.env.LOCAL_ADMIN_USERNAME ?? "",
  localAdminPassword: process.env.LOCAL_ADMIN_PASSWORD ?? "",
  localAdminName: process.env.LOCAL_ADMIN_NAME ?? "Administrador local",
  localAdminEmail: process.env.LOCAL_ADMIN_EMAIL ?? "",
  localAdminOpenId: process.env.LOCAL_ADMIN_OPEN_ID ?? "local_admin",
  allowLocalAdminLogin: process.env.NODE_ENV !== "production" || process.env.ALLOW_LOCAL_ADMIN_LOGIN === "true",
  isProduction: process.env.NODE_ENV === "production",
  serviceApiUrl: process.env.SERVICE_API_URL ?? "",
  serviceApiKey: process.env.SERVICE_API_KEY ?? "",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  nvidiaApiKey: process.env.NVIDIA_API_KEY ?? "",
  nvidiaBaseUrl: process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
  nvidiaModel: process.env.NVIDIA_MODEL ?? "meta/llama-3.1-70b-instruct",
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  groqBaseUrl: process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1",
  groqModel: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile"
};

// server/delivery-rules.ts
function canCloseDelivery(status, proofType, proof) {
  if (status !== "confirmed" && status !== "partial") return true;
  if (!proofType || !proof?.trim()) return false;
  if (proofType === "code") return /^\d{4,12}$/.test(proof.trim());
  if (proofType === "photo" || proofType === "signature") return /^https:\/\//.test(proof.trim());
  return proofType === "manual";
}

// server/inventory-rules.ts
function allocateInventory(rows, requested) {
  if (!Number.isFinite(requested) || requested <= 0) throw new Error("Quantity must be positive");
  let remaining = requested;
  const allocations = [];
  for (const row of rows) {
    if (remaining <= 0) break;
    const quantity = Math.min(Math.max(0, row.available), remaining);
    if (quantity > 0) allocations.push({ id: row.id, location: row.location, quantity });
    remaining -= quantity;
  }
  if (remaining > 5e-4) throw new Error("Insufficient stock across inventory locations");
  return allocations;
}

// server/customer-rules.ts
function resolveDeliveryAddress(explicit, savedAddresses, customerAddress) {
  const direct = explicit?.trim();
  if (direct) return direct;
  const preferred = [...savedAddresses].filter((candidate) => candidate.address?.trim()).sort((a, b) => Number(b.isDefault ?? 0) - Number(a.isDefault ?? 0) || Number(b.lastUsedAt?.getTime() ?? 0) - Number(a.lastUsedAt?.getTime() ?? 0))[0];
  return preferred?.address?.trim() || customerAddress?.trim() || void 0;
}

// server/db.ts
var _db = null;
var _client = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _client = postgres(process.env.DATABASE_URL, {
        max: 1,
        idle_timeout: 10,
        connect_timeout: 15,
        ssl: process.env.DATABASE_URL.includes("supabase") ? { rejectUnauthorized: false } : void 0
      });
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values = { openId: user.openId, name: user.name ?? null, email: user.email ?? null, loginMethod: user.loginMethod ?? null, lastSignedIn: user.lastSignedIn ?? /* @__PURE__ */ new Date() };
  if (user.openId === ENV.localAdminOpenId) values.role = "admin";
  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: { name: values.name, email: values.email, loginMethod: values.loginMethod, lastSignedIn: values.lastSignedIn, ...values.role ? { role: values.role } : {} } });
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}
async function getPublicProducts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(eq(products.active, 1)).orderBy(desc(products.updatedAt));
}
async function getAdminProducts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).orderBy(desc(products.updatedAt));
}
async function getInventory() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inventory).orderBy(inventory.productId);
}
async function adjustInventory(input) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (input.quantity <= 0) throw new Error("Quantity must be positive");
  const existing = await db.select().from(inventory).where(and(eq(inventory.productId, input.productId), eq(inventory.location, input.location))).limit(1);
  const current = existing[0];
  const availableDelta = ["purchase", "return", "release", "adjustment"].includes(input.type) ? input.quantity : -input.quantity;
  const currentAvailable = current ? Number(current.available) : 0;
  const currentReserved = current ? Number(current.reserved) : 0;
  if (current) await db.update(inventory).set({ available: Math.max(0, currentAvailable + availableDelta).toFixed(3), reserved: (input.type === "reservation" ? currentReserved + input.quantity : currentReserved).toFixed(3) }).where(eq(inventory.id, current.id));
  else await db.insert(inventory).values({ productId: input.productId, location: input.location, available: Math.max(0, availableDelta).toFixed(3), reserved: (input.type === "reservation" ? input.quantity : 0).toFixed(3) });
  await db.insert(inventoryMovements).values({ ...input, quantity: input.quantity.toFixed(3) });
  return { productId: input.productId, availableDelta };
}
async function listSuppliers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(suppliers).orderBy(desc(suppliers.updatedAt));
}
async function createSupplier(input) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return (await db.insert(suppliers).values(input).$returningId())[0];
}
async function listPurchaseOrders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt));
}
async function createPurchaseOrder(input) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (!input.items.length) throw new Error("A purchase order must contain at least one item");
  return db.transaction(async (tx) => {
    const { items, ...orderInput } = input;
    const order = (await tx.insert(purchaseOrders).values(orderInput).$returningId())[0];
    await tx.insert(purchaseItems).values(items.map((item) => ({ purchaseOrderId: order.id, productId: item.productId, quantity: item.quantity.toFixed(3), unitCost: item.unitCost, receivedQuantity: "0.000" })));
    return order;
  });
}
async function getPurchaseOrderDetails(id) {
  const db = await getDb();
  if (!db) return { order: void 0, items: [] };
  const order = (await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).limit(1))[0];
  const items = order ? await db.select().from(purchaseItems).where(eq(purchaseItems.purchaseOrderId, id)) : [];
  return { order, items };
}
async function receivePurchaseOrder(input) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (!input.items.length) throw new Error("At least one receipt item is required");
  return db.transaction(async (tx) => {
    const order = (await tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, input.purchaseOrderId)).limit(1))[0];
    if (!order || order.status === "cancelled") throw new Error("Purchase order is not receivable");
    const orderItems2 = await tx.select().from(purchaseItems).where(eq(purchaseItems.purchaseOrderId, input.purchaseOrderId));
    const itemMap = new Map(orderItems2.map((item) => [item.id, item]));
    const receipt = (await tx.insert(purchaseReceipts).values({ purchaseOrderId: input.purchaseOrderId, receivedBy: input.receivedBy, notes: input.notes }).$returningId())[0];
    for (const received of input.items) {
      if (received.quantity <= 0) throw new Error("Receipt quantities must be positive");
      const item = itemMap.get(received.purchaseItemId);
      if (!item || item.productId !== received.productId) throw new Error("Receipt item does not belong to purchase order");
      const remaining = Number(item.quantity) - Number(item.receivedQuantity);
      if (received.quantity > remaining + 5e-4) throw new Error(`Receipt exceeds remaining quantity for item ${item.id}`);
      await tx.insert(purchaseReceiptItems).values({ receiptId: receipt.id, purchaseItemId: item.id, productId: item.productId, quantity: received.quantity.toFixed(3), location: received.location });
      const nextReceived = Number(item.receivedQuantity) + received.quantity;
      await tx.update(purchaseItems).set({ receivedQuantity: nextReceived.toFixed(3) }).where(eq(purchaseItems.id, item.id));
      const existing = (await tx.select().from(inventory).where(and(eq(inventory.productId, item.productId), eq(inventory.location, received.location))).limit(1))[0];
      if (existing) await tx.update(inventory).set({ available: (Number(existing.available) + received.quantity).toFixed(3) }).where(eq(inventory.id, existing.id));
      else await tx.insert(inventory).values({ productId: item.productId, location: received.location, available: received.quantity.toFixed(3), reserved: "0.000", minimum: "0.000" });
      await tx.insert(inventoryMovements).values({ productId: item.productId, location: received.location, type: "purchase", quantity: received.quantity.toFixed(3), referenceType: "purchaseReceipt", referenceId: receipt.id, notes: input.notes, userId: input.receivedBy });
    }
    const refreshed = await tx.select().from(purchaseItems).where(eq(purchaseItems.purchaseOrderId, input.purchaseOrderId));
    const status = refreshed.every((item) => Number(item.receivedQuantity) >= Number(item.quantity) - 5e-4) ? "received" : "partial";
    await tx.update(purchaseOrders).set({ status }).where(eq(purchaseOrders.id, input.purchaseOrderId));
    await tx.insert(auditLogs).values({ userId: input.receivedBy, entity: "purchaseOrder", entityId: String(input.purchaseOrderId), action: "goods_received", beforeJson: JSON.stringify({ status: order.status }), afterJson: JSON.stringify({ status, receiptId: receipt.id, items: input.items }) });
    await tx.insert(notifications).values({ userId: input.receivedBy, type: "purchase_received", title: "Mercadoria recepcionada", body: `A recep\xE7\xE3o do pedido de compra #${input.purchaseOrderId} foi registada.`, link: "/gestao/operacao", entity: "purchaseOrder", entityId: String(input.purchaseOrderId) });
    return { receiptId: receipt.id, status };
  });
}
async function openCashSession(input) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return (await db.insert(cashSessions).values(input).$returningId())[0];
}
async function addCashMovement(input) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.insert(cashMovements).values(input);
}
async function registerSalePayment(input) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async (tx) => {
    const session = (await tx.select().from(cashSessions).where(eq(cashSessions.id, input.sessionId)).limit(1))[0];
    if (!session || session.status !== "open") throw new Error("A sess\xE3o de caixa precisa estar aberta");
    const order = (await tx.select().from(orders).where(eq(orders.id, input.orderId)).limit(1))[0];
    if (!order) throw new Error("Pedido n\xE3o encontrado");
    const movement = await tx.insert(cashMovements).values({ sessionId: input.sessionId, type: "sale", amount: input.amount, method: input.method, referenceType: "order", referenceId: input.orderId, notes: input.notes, createdBy: input.createdBy });
    await tx.insert(auditLogs).values({ userId: input.createdBy, entity: "order", entityId: String(input.orderId), action: "sale_payment_registered", afterJson: JSON.stringify({ sessionId: input.sessionId, amount: input.amount, method: input.method }) });
    await tx.insert(notifications).values({ userId: input.createdBy, type: "sale_payment", title: "Recebimento registado", body: `O recebimento do pedido #${input.orderId} foi lan\xE7ado no caixa.`, link: "/gestao/operacao", entity: "order", entityId: String(input.orderId) });
    return movement;
  });
}
async function getCashSessions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cashSessions).orderBy(desc(cashSessions.openedAt)).limit(50);
}
async function getCashSessionSummary(id) {
  const db = await getDb();
  if (!db) return void 0;
  const session = (await db.select().from(cashSessions).where(eq(cashSessions.id, id)).limit(1))[0];
  if (!session) return void 0;
  const movements = await db.select().from(cashMovements).where(eq(cashMovements.sessionId, id)).orderBy(desc(cashMovements.createdAt));
  const cashOnly = movements.filter((movement) => movement.method === "cash");
  const inflows = cashOnly.filter((movement) => ["sale", "deposit", "adjustment"].includes(movement.type)).reduce((sum, movement) => sum + Number(movement.amount), 0);
  const outflows = cashOnly.filter((movement) => ["expense", "withdrawal", "refund"].includes(movement.type)).reduce((sum, movement) => sum + Number(movement.amount), 0);
  const expectedAmount = Number(session.openingAmount) + inflows - outflows;
  const countedAmount = session.closingAmount === null ? null : Number(session.closingAmount);
  return { session, movements, inflows, outflows, expectedAmount, countedAmount, difference: countedAmount === null ? null : countedAmount - expectedAmount };
}
async function closeCashSession(id, closingAmount, notes) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const summary = await getCashSessionSummary(id);
  if (!summary || summary.session.status !== "open") throw new Error("Only open cash sessions can be closed");
  await db.update(cashSessions).set({ closingAmount, status: "closed", closedAt: /* @__PURE__ */ new Date(), notes }).where(eq(cashSessions.id, id));
  return { id, status: "closed", expectedAmount: summary.expectedAmount, difference: Number(closingAmount) - summary.expectedAmount };
}
async function auditCashSession(id, userId, notes) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const summary = await getCashSessionSummary(id);
  if (!summary || summary.session.status !== "closed") throw new Error("Only closed cash sessions can be audited");
  await db.update(cashSessions).set({ status: "audited", notes: notes || summary.session.notes }).where(eq(cashSessions.id, id));
  await db.insert(auditLogs).values({ userId, entity: "cashSession", entityId: String(id), action: "audited", beforeJson: JSON.stringify({ status: "closed", closingAmount: summary.countedAmount }), afterJson: JSON.stringify({ status: "audited", expectedAmount: summary.expectedAmount, difference: summary.difference }) });
  return { id, status: "audited", expectedAmount: summary.expectedAmount, countedAmount: summary.countedAmount, difference: summary.difference };
}
async function createProduct(input) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return (await db.insert(products).values(input).$returningId())[0];
}
async function updateProduct(id, input) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(products).set(input).where(eq(products.id, id));
  return { id };
}
async function setProductActive(id, active) {
  return updateProduct(id, { active });
}
async function getAuditLogs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(30);
}
async function getActiveDeliveries() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(deliveries).where(sql`${deliveries.status} not in ('confirmed','partial','failed','cancelled')`).orderBy(deliveries.routeOrder).limit(20);
}
async function getRecentOrders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).orderBy(desc(orders.createdAt)).limit(12);
}
async function getDashboardSummary() {
  const db = await getDb();
  if (!db) return { revenue: 0, openQuotes: 0, activeOrders: 0, customers: 0, lowStock: 0 };
  const [sales, openQuotes, activeOrders, customerCount, lowStock] = await Promise.all([
    db.select({ total: sql`coalesce(sum(${orders.total}), 0)` }).from(orders).where(eq(orders.status, "delivered")),
    db.select({ count: sql`count(*)` }).from(quotes).where(sql`${quotes.status} in ('new','sent','negotiating')`),
    db.select({ count: sql`count(*)` }).from(orders).where(sql`${orders.status} not in ('delivered','cancelled')`),
    db.select({ count: sql`count(*)` }).from(customers),
    db.select({ count: sql`count(*)` }).from(inventory).where(sql`${inventory.available} <= ${inventory.minimum}`)
  ]);
  return { revenue: Number(sales[0]?.total || 0), openQuotes: Number(openQuotes[0]?.count || 0), activeOrders: Number(activeOrders[0]?.count || 0), customers: Number(customerCount[0]?.count || 0), lowStock: Number(lowStock[0]?.count || 0) };
}
async function getCustomers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customers).orderBy(desc(customers.updatedAt)).limit(100);
}
async function updateCustomer(id, input) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(customers).set(input).where(eq(customers.id, id));
  return { id };
}
async function createCustomer(input) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(customers).values(input).$returningId();
  return result[0];
}
async function addCustomerContact(input) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.insert(customerContacts).values(input);
}
async function createOpportunity(input) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return (await db.insert(opportunities).values(input).$returningId())[0];
}
async function createQuote(input) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async (tx) => {
    const { items, ...quoteInput } = input;
    const result = await tx.insert(quotes).values(quoteInput).$returningId();
    if (items?.length) await tx.insert(quoteItems).values(items.map((item) => ({ quoteId: result[0].id, productId: item.productId, description: item.description, quantity: item.quantity.toFixed(3), unit: item.unit, unitPrice: item.unitPrice, total: item.total })));
    return result[0];
  });
}
async function getQuoteById(id) {
  const db = await getDb();
  if (!db) return void 0;
  return (await db.select().from(quotes).where(eq(quotes.id, id)).limit(1))[0];
}
async function convertQuoteToOrder(input) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async (tx) => {
    const quote = await tx.select().from(quotes).where(eq(quotes.id, input.quoteId)).limit(1);
    if (!quote[0] || quote[0].status === "lost" || quote[0].status === "expired" || quote[0].status === "approved") throw new Error("Quote is not eligible for conversion");
    const customer = (await tx.select().from(customers).where(eq(customers.id, input.customerId)).limit(1))[0];
    if (!customer || !customer.name.trim() || !customer.phone.trim()) throw new Error("Customer registration is incomplete");
    const savedAddresses = await tx.select().from(customerAddresses).where(eq(customerAddresses.customerId, input.customerId));
    const deliveryAddress = resolveDeliveryAddress(input.deliveryAddress, savedAddresses, customer.address);
    if (input.fulfillment === "delivery" && !deliveryAddress) throw new Error("Delivery address is required");
    if (input.fulfillment === "delivery") {
      await tx.update(customers).set({ address: deliveryAddress }).where(eq(customers.id, input.customerId));
      await tx.insert(customerAddresses).values({ customerId: input.customerId, label: "Endere\xE7o de entrega", city: customer.city || "Niquel\xE2ndia", address: deliveryAddress, isDefault: 1, lastUsedAt: /* @__PURE__ */ new Date() });
    }
    const items = await tx.select().from(quoteItems).where(eq(quoteItems.quoteId, input.quoteId));
    const orderCode = `PED-${Date.now().toString().slice(-8)}`;
    const result = await tx.insert(orders).values({ code: orderCode, quoteId: input.quoteId, customerId: input.customerId, source: "quote", status: "confirmed", fulfillment: input.fulfillment, subtotal: quote[0].total, deliveryFee: input.deliveryFee || "0", total: (Number(quote[0].total) + Number(input.deliveryFee || 0)).toFixed(2), deliveryAddress }).$returningId();
    const orderId = result[0].id;
    if (items.length) await tx.insert(orderItems).values(items.map((item) => ({ orderId, productId: item.productId, description: item.description, quantity: item.quantity, unit: item.unit, unitPrice: item.unitPrice, total: item.total })));
    await reserveOrderItems(tx, orderId, items.map((item) => ({ productId: item.productId, quantity: item.quantity })), input.actorId);
    let deliveryId;
    if (input.fulfillment === "delivery") {
      const confirmationCode = String(Math.floor(1e5 + Math.random() * 9e5));
      const delivery = (await tx.insert(deliveries).values({ orderId, status: "assigned", address: deliveryAddress, recipientName: customer.name, recipientPhone: customer.phone, confirmationCode, itemsSummary: items.map((item) => `${item.quantity} ${item.unit} ${item.description}`).join(", ").slice(0, 255) }).$returningId())[0];
      deliveryId = delivery.id;
      await ensureDeliveryChecklist(tx, delivery.id, orderId, input.actorId);
      await tx.insert(notifications).values({ customerId: input.customerId, type: "order_created", title: "Or\xE7amento aprovado", body: `O or\xE7amento ${quote[0].code} foi convertido no pedido ${orderCode}.`, link: `/acompanhar-entrega?code=ENT-${delivery.id}`, entity: "order", entityId: String(orderId) });
    }
    await tx.update(quotes).set({ status: "approved" }).where(eq(quotes.id, input.quoteId));
    await tx.insert(auditLogs).values({ userId: input.actorId, entity: "quote", entityId: String(input.quoteId), action: "converted_to_order", beforeJson: JSON.stringify({ status: quote[0].status }), afterJson: JSON.stringify({ orderId, fulfillment: input.fulfillment, deliveryId }) });
    return { orderId, deliveryId };
  });
}
async function addActivity(input) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.insert(activities).values(input);
}
async function getDeliveryByCode(code) {
  const db = await getDb();
  if (!db) return void 0;
  const id = Number(code.replace(/^ENT-/, ""));
  if (!Number.isInteger(id) || id <= 0) return void 0;
  const result = await db.select().from(deliveries).where(eq(deliveries.id, id)).limit(1);
  return result[0];
}
async function getAssignedDeliveries(driverId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(deliveries).where(and(eq(deliveries.driverId, driverId), sql`${deliveries.status} not in ('confirmed','partial','failed','cancelled')`)).orderBy(deliveries.routeOrder);
}
async function recordDriverLocation(input) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.insert(driverLocations).values({ driverId: input.driverId, deliveryId: input.deliveryId, latitude: input.latitude.toFixed(7), longitude: input.longitude.toFixed(7), accuracy: input.accuracy?.toFixed(2) });
}
async function releaseOrderReservations(db, orderId, userId) {
  const reservations = await db.select().from(stockReservations).where(and(eq(stockReservations.orderId, orderId), eq(stockReservations.status, "active")));
  for (const reservation of reservations) {
    const current = (await db.select().from(inventory).where(and(eq(inventory.productId, reservation.productId), eq(inventory.location, reservation.location))).limit(1))[0];
    const quantity = Number(reservation.quantity);
    if (current) {
      await db.update(inventory).set({ reserved: Math.max(0, Number(current.reserved) - quantity).toFixed(3) }).where(eq(inventory.id, current.id));
      await db.insert(inventoryMovements).values({ productId: reservation.productId, location: reservation.location, type: "release", quantity: quantity.toFixed(3), referenceType: "delivery", referenceId: orderId, userId, notes: "Reserva libertada ap\xF3s entrega confirmada" });
    }
    await db.update(stockReservations).set({ status: "released" }).where(eq(stockReservations.id, reservation.id));
  }
}
async function transitionDelivery(input) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (!canCloseDelivery(input.status, input.proofType, input.confirmationCode || input.proofUrl)) throw new Error("Proof of delivery is required");
  const delivery = await db.select().from(deliveries).where(and(eq(deliveries.id, input.deliveryId), eq(deliveries.driverId, input.actorId))).limit(1);
  if (!delivery[0]) throw new Error("Delivery is not assigned to this driver");
  if (input.status === "confirmed" || input.status === "partial") {
    await ensureDeliveryChecklist(db, delivery[0].id, delivery[0].orderId, input.actorId);
    const checklist = await getDeliveryChecklist(input.deliveryId);
    if (!checklist.length) throw new Error("Delivery checklist is required");
    if (input.status === "confirmed" && checklist.some((item) => Number(item.deliveredQuantity) < Number(item.expectedQuantity) - 5e-4 || !["delivered"].includes(item.status))) throw new Error("All delivery items must be confirmed before closing");
  }
  const updates = { status: input.status, notes: input.notes };
  if (input.status === "departed") updates.departedAt = /* @__PURE__ */ new Date();
  if (input.status === "arrived") updates.arrivedAt = /* @__PURE__ */ new Date();
  if (input.status === "confirmed" || input.status === "partial") {
    updates.completedAt = /* @__PURE__ */ new Date();
    updates.proofType = input.proofType;
    updates.proofUrl = input.proofUrl;
  }
  await db.update(deliveries).set(updates).where(eq(deliveries.id, input.deliveryId));
  if (input.status === "confirmed" || input.status === "failed") {
    await releaseOrderReservations(db, delivery[0].orderId, input.actorId);
    await db.update(orders).set({ status: input.status === "confirmed" ? "delivered" : "cancelled" }).where(eq(orders.id, delivery[0].orderId));
  }
  await db.insert(auditLogs).values({ userId: input.actorId, entity: "delivery", entityId: String(input.deliveryId), action: "status_changed", beforeJson: JSON.stringify({ status: delivery[0].status }), afterJson: JSON.stringify({ status: input.status, proofType: input.proofType }) });
  const order = (await db.select().from(orders).where(eq(orders.id, delivery[0].orderId)).limit(1))[0];
  if (order?.customerId) await db.insert(notifications).values({ customerId: order.customerId, type: "delivery_status", title: input.status === "confirmed" ? "Entrega conclu\xEDda" : input.status === "partial" ? "Entrega com diverg\xEAncia" : "Entrega actualizada", body: input.notes || `O estado da entrega foi actualizado para ${input.status}.`, link: `/acompanhar-entrega?code=ENT-${input.deliveryId}`, entity: "delivery", entityId: String(input.deliveryId) });
  return db.insert(deliveryEvents).values({ deliveryId: input.deliveryId, actorId: input.actorId, status: input.status, notes: input.notes });
}
async function getCustomerActivities(customerId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activities).where(customerId ? eq(activities.customerId, customerId) : void 0).orderBy(desc(activities.createdAt)).limit(100);
}
async function getOpportunities() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(opportunities).orderBy(desc(opportunities.updatedAt)).limit(100);
}
async function reserveOrderItems(tx, orderId, items, userId) {
  for (const item of items) {
    if (!item.productId) continue;
    const quantity = Number(item.quantity);
    const rows = await tx.select().from(inventory).where(eq(inventory.productId, item.productId)).orderBy(inventory.id);
    const allocations = allocateInventory(rows.map((row) => ({ id: row.id, location: row.location, available: Number(row.available) })), quantity);
    for (const allocation of allocations) {
      const current = rows.find((row) => row.id === allocation.id);
      await tx.update(inventory).set({ available: (Number(current.available) - allocation.quantity).toFixed(3), reserved: (Number(current.reserved) + allocation.quantity).toFixed(3) }).where(eq(inventory.id, allocation.id));
      await tx.insert(stockReservations).values({ productId: item.productId, location: allocation.location, orderId, quantity: allocation.quantity.toFixed(3), status: "active" });
      await tx.insert(inventoryMovements).values({ productId: item.productId, location: allocation.location, type: "reservation", quantity: allocation.quantity.toFixed(3), referenceType: "order", referenceId: orderId, userId, notes: "Reserva autom\xE1tica do pedido" });
    }
  }
}
async function createPublicOrder(input) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (!input.name.trim() || !input.phone.trim() || !input.address.trim()) throw new Error("Name, phone and delivery address are required");
  if (!input.items.length) throw new Error("Order must contain at least one item");
  return db.transaction(async (tx) => {
    const customer = (await tx.insert(customers).values({ name: input.name, phone: input.phone, email: input.email, city: input.city, address: input.address, addressNumber: input.addressNumber, complement: input.complement, reference: input.reference }).$returningId())[0];
    await tx.insert(customerAddresses).values({ customerId: customer.id, label: "Endere\xE7o de entrega", city: input.city, address: input.address, addressNumber: input.addressNumber, complement: input.complement, reference: input.reference, isDefault: 1, lastUsedAt: /* @__PURE__ */ new Date() });
    const deliveryFee = input.deliveryFee || "0";
    const orderCode = `PED-${Date.now().toString().slice(-8)}`;
    const order = (await tx.insert(orders).values({ code: orderCode, customerId: customer.id, source: "website", status: "awaiting_payment", fulfillment: "delivery", subtotal: input.subtotal, deliveryFee, total: (Number(input.subtotal) + Number(deliveryFee)).toFixed(2), deliveryAddress: input.address }).$returningId())[0];
    await tx.insert(orderItems).values(input.items.map((item) => ({ orderId: order.id, productId: item.productId, description: item.description, quantity: item.quantity.toFixed(3), unit: item.unit, unitPrice: item.unitPrice, total: item.total })));
    await reserveOrderItems(tx, order.id, input.items, void 0);
    const confirmationCode = String(Math.floor(1e5 + Math.random() * 9e5));
    const delivery = (await tx.insert(deliveries).values({ orderId: order.id, status: "assigned", address: input.address, recipientName: input.name, recipientPhone: input.phone, confirmationCode, itemsSummary: input.items.map((item) => `${item.quantity} ${item.unit} ${item.description}`).join(", ").slice(0, 255) }).$returningId())[0];
    await ensureDeliveryChecklist(tx, delivery.id, order.id);
    await tx.insert(notifications).values({ customerId: customer.id, type: "order_created", title: "Pedido recebido", body: `Recebemos o pedido ${orderCode} e vamos confirmar os pr\xF3ximos passos.`, link: `/acompanhar-entrega?code=ENT-${delivery.id}`, entity: "order", entityId: String(order.id) });
    await tx.insert(auditLogs).values({ entity: "order", entityId: String(order.id), action: "public_order_created", afterJson: JSON.stringify({ customerId: customer.id, deliveryId: delivery.id }) });
    return { orderId: order.id, orderCode, deliveryCode: `ENT-${delivery.id}` };
  });
}
async function listCustomerAddresses(customerId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customerAddresses).where(eq(customerAddresses.customerId, customerId)).orderBy(desc(customerAddresses.isDefault), desc(customerAddresses.lastUsedAt));
}
async function saveCustomerAddress(input) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async (tx) => {
    if (input.isDefault) await tx.update(customerAddresses).set({ isDefault: 0 }).where(eq(customerAddresses.customerId, input.customerId));
    const values = { customerId: input.customerId, label: input.label, postalCode: input.postalCode, city: input.city, address: input.address, addressNumber: input.addressNumber, complement: input.complement, reference: input.reference, isDefault: input.isDefault ? 1 : 0, lastUsedAt: input.isDefault ? /* @__PURE__ */ new Date() : void 0 };
    if (input.id) {
      await tx.update(customerAddresses).set(values).where(and(eq(customerAddresses.id, input.id), eq(customerAddresses.customerId, input.customerId)));
      return { id: input.id };
    }
    return (await tx.insert(customerAddresses).values(values).$returningId())[0];
  });
}
async function addQuoteAttachment(input) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.insert(quoteAttachments).values(input);
}
async function listQuoteAttachments(quoteId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quoteAttachments).where(eq(quoteAttachments.quoteId, quoteId)).orderBy(desc(quoteAttachments.createdAt));
}
async function ensureDeliveryChecklist(tx, deliveryId, orderId, actorId) {
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  for (const item of items) {
    const exists = await tx.select({ id: deliveryItemChecks.id }).from(deliveryItemChecks).where(and(eq(deliveryItemChecks.deliveryId, deliveryId), eq(deliveryItemChecks.orderItemId, item.id))).limit(1);
    if (!exists[0]) await tx.insert(deliveryItemChecks).values({ deliveryId, orderItemId: item.id, productId: item.productId, description: item.description, expectedQuantity: item.quantity, checkedBy: actorId });
  }
}
async function getDeliveryChecklist(deliveryId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(deliveryItemChecks).where(eq(deliveryItemChecks.deliveryId, deliveryId)).orderBy(deliveryItemChecks.id);
}
async function updateDeliveryChecklist(input) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async (tx) => {
    const existing = await tx.select().from(deliveryItemChecks).where(eq(deliveryItemChecks.deliveryId, input.deliveryId));
    const allowed = new Map(existing.map((item) => [item.id, item]));
    for (const item of input.items) {
      const current = allowed.get(item.id);
      if (!current || item.loadedQuantity < 0 || item.deliveredQuantity < 0 || item.loadedQuantity > Number(current.expectedQuantity) + 5e-4 || item.deliveredQuantity > item.loadedQuantity + 5e-4) throw new Error("Invalid delivery checklist quantity");
      await tx.update(deliveryItemChecks).set({ loadedQuantity: item.loadedQuantity.toFixed(3), deliveredQuantity: item.deliveredQuantity.toFixed(3), status: item.status, notes: item.notes, checkedBy: input.actorId, checkedAt: /* @__PURE__ */ new Date() }).where(and(eq(deliveryItemChecks.id, item.id), eq(deliveryItemChecks.deliveryId, input.deliveryId)));
      if (["partial", "missing", "damaged"].includes(item.status)) {
        const type = item.status === "damaged" ? "damage" : "shortage";
        await tx.insert(deliveryDivergences).values({ deliveryId: input.deliveryId, deliveryItemCheckId: item.id, type, description: item.notes || `Diverg\xEAncia no item ${current.description}`, quantity: Math.max(0, Number(current.expectedQuantity) - item.deliveredQuantity).toFixed(3), openedBy: input.actorId });
      }
    }
    await tx.insert(auditLogs).values({ userId: input.actorId, entity: "delivery", entityId: String(input.deliveryId), action: "checklist_updated", afterJson: JSON.stringify({ items: input.items }) });
    return getDeliveryChecklistFromTx(tx, input.deliveryId);
  });
}
async function getDeliveryChecklistFromTx(tx, deliveryId) {
  return tx.select().from(deliveryItemChecks).where(eq(deliveryItemChecks.deliveryId, deliveryId)).orderBy(deliveryItemChecks.id);
}
async function listDeliveryDivergences(deliveryId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(deliveryDivergences).where(deliveryId ? eq(deliveryDivergences.deliveryId, deliveryId) : void 0).orderBy(desc(deliveryDivergences.createdAt));
}
async function resolveDeliveryDivergence(input) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (input.resolution.trim().length < 3) throw new Error("Resolution is required");
  await db.update(deliveryDivergences).set({ status: input.status, resolution: input.resolution, resolvedBy: input.resolvedBy, resolvedAt: /* @__PURE__ */ new Date() }).where(eq(deliveryDivergences.id, input.id));
  await db.insert(auditLogs).values({ userId: input.resolvedBy, entity: "deliveryDivergence", entityId: String(input.id), action: input.status, afterJson: JSON.stringify({ resolution: input.resolution }) });
  return { id: input.id, status: input.status };
}
async function listNotifications(input) {
  const db = await getDb();
  if (!db) return [];
  const recipient = input.userId ? eq(notifications.userId, input.userId) : input.customerId ? eq(notifications.customerId, input.customerId) : void 0;
  const filter = input.unreadOnly ? and(recipient, sql`${notifications.readAt} is null`) : recipient;
  return db.select().from(notifications).where(filter).orderBy(desc(notifications.createdAt)).limit(100);
}
async function markNotificationRead(id, userId, customerId) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const recipient = userId ? eq(notifications.userId, userId) : customerId ? eq(notifications.customerId, customerId) : void 0;
  await db.update(notifications).set({ readAt: /* @__PURE__ */ new Date() }).where(and(eq(notifications.id, id), recipient));
  return { id };
}
async function getReportSalesByMonth() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ month: sql`to_char(${orders.createdAt}, 'YYYY-MM')`.as("month"), count: sql`count(*)`.as("count"), total: sql`coalesce(sum(${orders.total}), 0)`.as("total") }).from(orders).where(sql`${orders.status} not in ('cancelled')`).groupBy(sql`to_char(${orders.createdAt}, 'YYYY-MM')`).orderBy(sql`to_char(${orders.createdAt}, 'YYYY-MM')`);
}
async function getReportOrdersByStatus() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ status: orders.status, count: sql`count(*)`.as("count"), total: sql`coalesce(sum(${orders.total}), 0)`.as("total") }).from(orders).groupBy(orders.status);
}
async function getReportOrdersBySource() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ source: orders.source, count: sql`count(*)`.as("count"), total: sql`coalesce(sum(${orders.total}), 0)`.as("total") }).from(orders).groupBy(orders.source);
}
async function getReportTopProducts() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ productId: orderItems.productId, description: orderItems.description, totalQuantity: sql`coalesce(sum(${orderItems.quantity}), 0)`.as("totalQuantity"), totalRevenue: sql`coalesce(sum(${orderItems.total}), 0)`.as("totalRevenue"), orderCount: sql`count(distinct ${orderItems.orderId})`.as("orderCount") }).from(orderItems).groupBy(orderItems.productId, orderItems.description).orderBy(sql`sum(${orderItems.total}) DESC`).limit(10);
}
async function getReportDeliveriesByStatus() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ status: deliveries.status, count: sql`count(*)`.as("count") }).from(deliveries).groupBy(deliveries.status);
}
async function getReportCashSummary() {
  const db = await getDb();
  if (!db) return { totalInflows: 0, totalOutflows: 0, byMethod: [] };
  const movements = await db.select({ type: cashMovements.type, method: cashMovements.method, amount: sql`coalesce(sum(${cashMovements.amount}), 0)`.as("amount") }).from(cashMovements).groupBy(cashMovements.type, cashMovements.method);
  const all = movements.map((m) => ({ ...m, amount: Number(m.amount) }));
  const totalInflows = all.filter((m) => ["sale", "deposit", "adjustment"].includes(m.type)).reduce((s, m) => s + m.amount, 0);
  const totalOutflows = all.filter((m) => ["expense", "withdrawal", "refund"].includes(m.type)).reduce((s, m) => s + m.amount, 0);
  const methodMap = /* @__PURE__ */ new Map();
  for (const m of all) {
    const entry = methodMap.get(m.method) || { inflows: 0, outflows: 0 };
    if (["sale", "deposit", "adjustment"].includes(m.type)) entry.inflows += m.amount;
    else entry.outflows += m.amount;
    methodMap.set(m.method, entry);
  }
  const byMethod = Array.from(methodMap.entries()).map(([method, v]) => ({ method, ...v }));
  return { totalInflows, totalOutflows, byMethod };
}
async function getReportCustomersByCity() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ city: sql`coalesce(${customers.city}, 'Nao informado')`.as("city"), count: sql`count(*)`.as("count") }).from(customers).groupBy(sql`coalesce(${customers.city}, 'Nao informado')`).orderBy(sql`count(*) DESC`).limit(10);
}
async function getReportInventoryLow() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ productId: inventory.productId, location: inventory.location, available: inventory.available, minimum: inventory.minimum, reserved: inventory.reserved }).from(inventory).where(sql`${inventory.available} <= ${inventory.minimum}`).orderBy(inventory.available);
}
async function getReportQuoteConversion() {
  const db = await getDb();
  if (!db) return { total: 0, approved: 0, lost: 0, expired: 0, pending: 0 };
  const rows = await db.select({ status: quotes.status, count: sql`count(*)`.as("count") }).from(quotes).groupBy(quotes.status);
  const map = Object.fromEntries(rows.map((r) => [r.status, Number(r.count)]));
  return { total: Object.values(map).reduce((a, b) => a + b, 0), approved: map.approved || 0, lost: map.lost || 0, expired: map.expired || 0, pending: (map.new || 0) + (map.sent || 0) + (map.negotiating || 0) + (map.draft || 0) };
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var SDKServer = class {
  parseCookies(cookieHeader) {
    if (!cookieHeader) return /* @__PURE__ */ new Map();
    return new Map(Object.entries(parseCookieHeader(cookieHeader)));
  }
  getSessionSecret() {
    return new TextEncoder().encode(ENV.cookieSecret);
  }
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      { openId, appId: "atua-loja-os", name: options.name || "" },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    return new SignJWT(payload).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuedAt(Math.floor(issuedAt / 1e3)).setExpirationTime(Math.floor((issuedAt + expiresInMs) / 1e3)).sign(this.getSessionSecret());
  }
  async verifySession(cookieValue) {
    if (!cookieValue || !ENV.cookieSecret) return null;
    try {
      const { payload } = await jwtVerify(cookieValue, this.getSessionSecret(), { algorithms: ["HS256"] });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) return null;
      return { openId, appId, name };
    } catch {
      return null;
    }
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionToken = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionToken);
    if (!session) throw ForbiddenError("Invalid session cookie");
    const user = await getUserByOpenId(session.openId);
    if (!user) throw ForbiddenError("User not found");
    await upsertUser({ openId: user.openId, lastSignedIn: /* @__PURE__ */ new Date() });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/supabase.ts
import { createClient } from "@supabase/supabase-js";
var _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (_supabaseAdmin) return _supabaseAdmin;
  if (!ENV.supabaseUrl || !ENV.supabaseServiceKey) return null;
  _supabaseAdmin = createClient(ENV.supabaseUrl, ENV.supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  return _supabaseAdmin;
}
function isSupabaseConfigured() {
  return Boolean(ENV.supabaseUrl && ENV.supabaseAnonKey);
}

// server/_core/supabase-auth.ts
function registerSupabaseAuthRoutes(app) {
  app.get("/api/auth/supabase/login", async (req, res) => {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: "Supabase Auth n\xE3o configurado." });
      return;
    }
    const provider = String(req.query.provider || "google");
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      res.status(503).json({ error: "Supabase client unavailable." });
      return;
    }
    const redirectTo = `${req.protocol}://${req.get("host")}/api/auth/supabase/callback`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider === "email" ? void 0 : provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true
      }
    });
    if (error || !data?.url) {
      console.error("[Supabase Auth] Login redirect failed:", error);
      res.status(500).json({ error: "Falha ao iniciar login com Supabase." });
      return;
    }
    res.redirect(302, data.url);
  });
  app.get("/api/auth/supabase/callback", async (req, res) => {
    if (!isSupabaseConfigured()) {
      res.redirect(302, "/?error=supabase_not_configured");
      return;
    }
    const code = String(req.query.code || "");
    if (!code) {
      res.redirect(302, "/?error=no_code");
      return;
    }
    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) throw new Error("Supabase unavailable");
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error || !data?.user) throw error || new Error("No user in session");
      const sbUser = data.user;
      const openId = `supabase_${sbUser.id}`;
      const email = sbUser.email || null;
      const name = sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || email?.split("@")[0] || null;
      await upsertUser({
        openId,
        name,
        email,
        loginMethod: "supabase",
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(openId, {
        name: name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[Supabase Auth] Callback failed:", error);
      res.redirect(302, "/?error=auth_callback_failed");
    }
  });
  app.post("/api/auth/supabase", async (req, res) => {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: "Supabase Auth n\xE3o configurado." });
      return;
    }
    const { access_token, refresh_token } = req.body || {};
    if (!access_token) {
      res.status(400).json({ error: "access_token required." });
      return;
    }
    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) throw new Error("Supabase unavailable");
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token: refresh_token || ""
      });
      if (sessionError || !sessionData?.user) throw sessionError || new Error("Invalid session");
      const sbUser = sessionData.user;
      const openId = `supabase_${sbUser.id}`;
      const email = sbUser.email || null;
      const name = sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || email?.split("@")[0] || null;
      await upsertUser({
        openId,
        name,
        email,
        loginMethod: "supabase",
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(openId, {
        name: name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: { name, email } });
    } catch (error) {
      console.error("[Supabase Auth] Token exchange failed:", error);
      res.status(401).json({ error: "Sess\xE3o Supabase inv\xE1lida." });
    }
  });
}

// server/routers.ts
import { z as z2 } from "zod";
import { TRPCError as TRPCError2 } from "@trpc/server";

// server/local-auth.ts
import { timingSafeEqual } from "node:crypto";
function isLocalAdminLoginConfigured(config = ENV) {
  return config.allowLocalAdminLogin && Boolean(config.localAdminUsername && config.localAdminPassword);
}
function credentialsMatch(username, password, config = ENV) {
  if (!isLocalAdminLoginConfigured(config)) return false;
  return safeEqual(username, config.localAdminUsername) && safeEqual(password, config.localAdminPassword);
}
function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

// server/_core/llm.ts
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools2) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools2 || tools2.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools2.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools2[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
function getConfiguredLlmProviders(config = ENV) {
  const providers = [];
  if (config.nvidiaApiKey.trim()) providers.push({ name: "nvidia", apiKey: config.nvidiaApiKey, baseUrl: config.nvidiaBaseUrl, model: config.nvidiaModel });
  if (config.groqApiKey.trim()) providers.push({ name: "groq", apiKey: config.groqApiKey, baseUrl: config.groqBaseUrl, model: config.groqModel });
  return providers;
}
var assertApiKey = () => {
  if (getConfiguredLlmProviders().length === 0) {
    throw new Error("Configure NVIDIA_API_KEY ou GROQ_API_KEY no .env para activar o ASK.");
  }
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
var RETRY_MAX_RETRIES = 4;
var RETRY_BASE_DELAY_MS = 500;
var RETRY_MAX_DELAY_MS = 3e4;
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var parseRetryAfter = (value) => {
  if (!value) return void 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1e3);
  const at = Date.parse(value);
  return Number.isNaN(at) ? void 0 : Math.max(0, at - Date.now());
};
var computeBackoffDelay = (attempt, retryAfterMs) => {
  const cap = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jittered = cap / 2 + Math.random() * (cap / 2);
  return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);
};
var fetchWithBackoff = async (url, init) => {
  let lastError;
  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || attempt === RETRY_MAX_RETRIES) {
        return response;
      }
      const retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after")
      );
      try {
        await response.body?.cancel();
      } catch {
      }
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after status ${response.status}`
      );
      await sleep(computeBackoffDelay(attempt, retryAfterMs));
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_MAX_RETRIES) throw error;
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after network error`
      );
      await sleep(computeBackoffDelay(attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("LLM request failed after exhausting retries");
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages,
    tools: tools2,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    model,
    thinking,
    reasoning,
    maxTokens,
    max_tokens
  } = params;
  const payload = {
    messages: messages.map(normalizeMessage)
  };
  if (model) {
    payload.model = model;
  }
  if (tools2 && tools2.length > 0) {
    payload.tools = tools2;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools2
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  const resolvedMaxTokens = max_tokens ?? maxTokens;
  if (typeof resolvedMaxTokens === "number") {
    payload.max_tokens = resolvedMaxTokens;
  }
  if (thinking) {
    payload.thinking = thinking;
  }
  if (reasoning) {
    payload.reasoning = reasoning;
  }
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const providers = getConfiguredLlmProviders();
  let lastError;
  for (const provider of providers) {
    const providerPayload = { ...payload, ...payload.model ? {} : provider.model ? { model: provider.model } : {} };
    try {
      const response = await fetchWithBackoff(`${provider.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${provider.apiKey}`
        },
        body: JSON.stringify(providerPayload)
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${provider.name}: ${response.status} ${response.statusText} \u2013 ${errorText}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (provider !== providers[providers.length - 1]) console.warn(`[LLM] ${provider.name} falhou; a tentar o fallback configurado.`);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Nenhum fornecedor LLM respondeu.");
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  }))
});

// server/freight.ts
var defaultFreightRules = [
  { zone: "Niquel\xE2ndia", maxKm: 15, base: 25, perKm: 0, freeAbove: 500 },
  { zone: "Regi\xE3o", maxKm: 80, base: 35, perKm: 2.5, freeAbove: 1200 }
];
function calculateFreight(input) {
  const rule = (input.rules || defaultFreightRules).find((item) => item.zone.toLowerCase() === input.city.toLowerCase()) || (input.rules || defaultFreightRules).find((item) => item.zone === "Regi\xE3o" && input.distanceKm <= item.maxKm);
  if (!rule || input.distanceKm > rule.maxKm) return { eligible: false, amount: 0, reason: "Fora da \xE1rea de atendimento configurada" };
  if (rule.freeAbove && input.subtotal >= rule.freeAbove) return { eligible: true, amount: 0, reason: "Frete oferecido pela condi\xE7\xE3o comercial" };
  return { eligible: true, amount: Number((rule.base + input.distanceKm * rule.perKm).toFixed(2)), reason: "Frete calculado pela zona e dist\xE2ncia" };
}

// server/storage.ts
function getServiceConfig() {
  const baseUrl = ENV.serviceApiUrl;
  const apiKey = ENV.serviceApiKey;
  if (!baseUrl || !apiKey) {
    throw new Error("Storage config missing: set SERVICE_API_URL and SERVICE_API_KEY");
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function appendHashSuffix(relKey) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { baseUrl, apiKey } = getServiceConfig();
  const key = appendHashSuffix(normalizeKey(relKey));
  const presignUrl = new URL("v1/storage/presign/put", `${baseUrl}/`);
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!presignResp.ok) throw new Error(`Storage presign failed (${presignResp.status}): ${await presignResp.text().catch(() => presignResp.statusText)}`);
  const { url: uploadUrl } = await presignResp.json();
  if (!uploadUrl) throw new Error("Storage service returned an empty upload URL");
  const body = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const uploadResp = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body });
  if (!uploadResp.ok) throw new Error(`Storage upload failed (${uploadResp.status})`);
  return { key, url: `/storage/${key}` };
}

// server/ai-tools.ts
var fmt = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
var tools = [
  {
    def: {
      type: "function",
      function: {
        name: "search_products",
        description: "Busca produtos no cat\xE1logo p\xFAblico ou admin. Use para encontrar produtos por nome, SKU, categoria ou listar todos.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Termo de busca (nome, SKU ou categoria). Deixe vazio para listar todos."
            },
            include_inactive: {
              type: "boolean",
              description: "Se true, inclui produtos inativos (apenas para admin)."
            }
          }
        }
      }
    },
    handler: async (args) => {
      const products2 = args.include_inactive ? await getAdminProducts() : await getPublicProducts();
      const query = String(args.query || "").toLowerCase().trim();
      const filtered = query ? products2.filter(
        (p) => p.name?.toLowerCase().includes(query) || p.sku?.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query)
      ) : products2;
      if (!filtered.length) return "Nenhum produto encontrado.";
      const lines = filtered.slice(0, 15).map(
        (p) => `\u2022 ${p.name} (SKU: ${p.sku}) \u2014 ${fmt(Number(p.price))}/${p.unit} \u2014 ${p.active ? "Ativo" : "Inativo"}`
      );
      return `Encontrados ${filtered.length} produto(s):
${lines.join("\n")}${filtered.length > 15 ? `
...e mais ${filtered.length - 15}` : ""}`;
    }
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_inventory",
        description: "Consulta estoque dispon\xEDvel, reservado e m\xEDnimo por produto e localiza\xE7\xE3o. Use para verificar disponibilidade.",
        parameters: {
          type: "object",
          properties: {
            product_id: {
              type: "number",
              description: "ID do produto para filtrar (opcional)."
            }
          }
        }
      }
    },
    handler: async (args) => {
      const inv = await getInventory();
      const filtered = args.product_id ? inv.filter((i) => i.productId === Number(args.product_id)) : inv;
      if (!filtered.length) return "Nenhum registro de estoque encontrado.";
      const lines = filtered.slice(0, 20).map(
        (i) => `\u2022 Produto #${i.productId} | ${i.location} | Disp: ${i.available} | Reserv: ${i.reserved} | M\xEDn: ${i.minimum}${Number(i.available) <= Number(i.minimum) ? " \u26A0\uFE0F" : ""}`
      );
      return `Estoque (${filtered.length} registro(s)):
${lines.join("\n")}`;
    }
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_dashboard_summary",
        description: "Resumo do painel: receita total, or\xE7amentos abertos, pedidos ativos, clientes cadastrados e itens com estoque baixo.",
        parameters: { type: "object", properties: {} }
      }
    },
    handler: async () => {
      const s = await getDashboardSummary();
      return `Resumo do painel:
\u2022 Receita total: ${fmt(s.revenue)}
\u2022 Or\xE7amentos abertos: ${s.openQuotes}
\u2022 Pedidos ativos: ${s.activeOrders}
\u2022 Clientes: ${s.customers}
\u2022 Estoque baixo: ${s.lowStock}`;
    }
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_recent_orders",
        description: "Lista os pedidos mais recentes (at\xE9 12).",
        parameters: { type: "object", properties: {} }
      }
    },
    handler: async () => {
      const orders2 = await getRecentOrders();
      if (!orders2.length) return "Nenhum pedido registrado.";
      const lines = orders2.map(
        (o) => `\u2022 #${o.code} \u2014 ${o.status} \u2014 ${o.source} \u2014 Total: ${fmt(Number(o.total))}`
      );
      return `Pedidos recentes (${orders2.length}):
${lines.join("\n")}`;
    }
  },
  {
    def: {
      type: "function",
      function: {
        name: "search_customers",
        description: "Busca clientes cadastrados no CRM por nome, telefone ou email.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Termo de busca (nome, telefone ou email)."
            }
          }
        }
      }
    },
    handler: async (args) => {
      const customers2 = await getCustomers();
      const query = String(args.query || "").toLowerCase().trim();
      const filtered = query ? customers2.filter(
        (c) => c.name?.toLowerCase().includes(query) || c.phone?.includes(query) || c.email?.toLowerCase().includes(query)
      ) : customers2.slice(0, 10);
      if (!filtered.length) return "Nenhum cliente encontrado.";
      const lines = filtered.slice(0, 10).map(
        (c) => `\u2022 ${c.name} | Tel: ${c.phone} | ${c.city || "Niquel\xE2ndia"} | Tipo: ${c.customerType || "individual"}`
      );
      return `Clientes (${filtered.length} encontrado(s)):
${lines.join("\n")}`;
    }
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_delivery_status",
        description: "Consulta status de uma entrega espec\xEDfica pelo c\xF3digo (ex: ENT-123) ou ID.",
        parameters: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "C\xF3digo da entrega (ex: ENT-123) ou ID num\xE9rico."
            }
          },
          required: ["code"]
        }
      }
    },
    handler: async (args) => {
      const code = String(args.code || "");
      const id = Number(code.replace(/^ENT-/, ""));
      const delivery = await getDeliveryByCode(id ? String(id) : code);
      if (!delivery) return "Entrega n\xE3o encontrada.";
      return `Entrega #ENT-${delivery.id}:
\u2022 Status: ${delivery.status}
\u2022 Endere\xE7o: ${delivery.address || "N/A"}
\u2022 Criada: ${delivery.createdAt}
\u2022 Conclu\xEDda: ${delivery.completedAt || "pendente"}`;
    }
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_active_deliveries",
        description: "Lista todas as entregas ativas (em rota, sa\xEDda, etc.).",
        parameters: { type: "object", properties: {} }
      }
    },
    handler: async () => {
      const d = await getActiveDeliveries();
      if (!d.length) return "Nenhuma entrega ativa no momento.";
      const lines = d.map(
        (x) => `\u2022 ENT-${x.id} \u2014 ${x.status} \u2014 Rota #${x.routeOrder || "N/A"} \u2014 ${x.address || "N/A"}`
      );
      return `Entregas ativas (${d.length}):
${lines.join("\n")}`;
    }
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_cash_summary",
        description: "Resumo do caixa: sess\xF5es abertas, totais de entradas e sa\xEDdas, confer\xEAncia.",
        parameters: { type: "object", properties: {} }
      }
    },
    handler: async () => {
      const sessions = await getCashSessions();
      const open = sessions.find((s) => s.status === "open");
      let summary = `Sess\xF5es de caixa: ${sessions.length} total
`;
      if (open) {
        const s = await getCashSessionSummary(open.id);
        summary += `\u2022 Sess\xE3o aberta #${open.id}: In\xEDcio ${open.openedAt}
`;
        if (s) {
          summary += `  Entradas: ${fmt(s.inflows)} | Sa\xEDdas: ${fmt(s.outflows)} | Esperado: ${fmt(s.expectedAmount)}`;
        }
      } else {
        summary += "\u2022 Nenhuma sess\xE3o aberta no momento.";
      }
      return summary;
    }
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_audit_logs",
        description: "Consulta logs de auditoria: a\xE7\xF5es realizadas no sistema, altera\xE7\xF5es de dados.",
        parameters: { type: "object", properties: {} }
      }
    },
    handler: async () => {
      const logs = await getAuditLogs();
      if (!logs.length) return "Nenhum log de auditoria registrado.";
      const lines = logs.slice(0, 10).map(
        (l) => `\u2022 ${l.createdAt} | User#${l.userId} | ${l.entity}#${l.entityId} | ${l.action}`
      );
      return `Logs de auditoria (${logs.length} total):
${lines.join("\n")}`;
    }
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_report_sales",
        description: "Relat\xF3rio de vendas por m\xEAs: quantitativo e valor total de pedidos.",
        parameters: { type: "object", properties: {} }
      }
    },
    handler: async () => {
      const data = await getReportSalesByMonth();
      if (!data.length) return "Sem dados de vendas.";
      const lines = data.map(
        (d) => `\u2022 ${d.month}: ${d.count} pedidos \u2014 ${fmt(Number(d.total))}`
      );
      return `Vendas por m\xEAs:
${lines.join("\n")}`;
    }
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_report_top_products",
        description: "Top 10 produtos mais vendidos por receita e quantidade.",
        parameters: { type: "object", properties: {} }
      }
    },
    handler: async () => {
      const data = await getReportTopProducts();
      if (!data.length) return "Sem dados de vendas por produto.";
      const lines = data.map(
        (d, i) => `${i + 1}. ${d.description} \u2014 ${d.totalQuantity} un. \u2014 ${fmt(Number(d.totalRevenue))} (${d.orderCount} pedidos)`
      );
      return `Top produtos:
${lines.join("\n")}`;
    }
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_report_low_stock",
        description: "Produtos com estoque abaixo do m\xEDnimo configurado. Indica itens que precisam de reposi\xE7\xE3o.",
        parameters: { type: "object", properties: {} }
      }
    },
    handler: async () => {
      const data = await getReportInventoryLow();
      if (!data.length) return "Todos os itens est\xE3o acima do estoque m\xEDnimo.";
      const lines = data.map(
        (d) => `\u2022 Produto #${d.productId} | ${d.location} | Disp: ${d.available} | M\xEDn: ${d.minimum} | Reserv: ${d.reserved}`
      );
      return `Estoque baixo (${data.length} item(ns)):
${lines.join("\n")}`;
    }
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_report_quote_conversion",
        description: "Taxa de convers\xE3o de or\xE7amentos: total, aprovados, perdidos, expirados e pendentes.",
        parameters: { type: "object", properties: {} }
      }
    },
    handler: async () => {
      const d = await getReportQuoteConversion();
      return `Convers\xE3o de or\xE7amentos:
\u2022 Total: ${d.total}
\u2022 Aprovados: ${d.approved}
\u2022 Pendentes: ${d.pending}
\u2022 Perdidos: ${d.lost}
\u2022 Expirados: ${d.expired}
\u2022 Taxa: ${d.total ? (d.approved / d.total * 100).toFixed(1) : 0}%`;
    }
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_report_deliveries",
        description: "Entregas agrupadas por status.",
        parameters: { type: "object", properties: {} }
      }
    },
    handler: async () => {
      const data = await getReportDeliveriesByStatus();
      if (!data.length) return "Sem dados de entregas.";
      const lines = data.map((d) => `\u2022 ${d.status}: ${d.count}`);
      return `Entregas por status:
${lines.join("\n")}`;
    }
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_report_customers_by_city",
        description: "Distribui\xE7\xE3o de clientes por cidade.",
        parameters: { type: "object", properties: {} }
      }
    },
    handler: async () => {
      const data = await getReportCustomersByCity();
      if (!data.length) return "Sem dados de clientes.";
      const lines = data.map((d) => `\u2022 ${d.city}: ${d.count}`);
      return `Clientes por cidade:
${lines.join("\n")}`;
    }
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_report_cash",
        description: "Resumo financeiro de caixa: totais de entradas e sa\xEDdas por m\xE9todo de pagamento.",
        parameters: { type: "object", properties: {} }
      }
    },
    handler: async () => {
      const d = await getReportCashSummary();
      const lines = d.byMethod.map(
        (m) => `\u2022 ${m.method}: Entradas ${fmt(m.inflows)} / Sa\xEDdas ${fmt(m.outflows)}`
      );
      return `Resumo de caixa:
\u2022 Total entradas: ${fmt(d.totalInflows)}
\u2022 Total sa\xEDdas: ${fmt(d.totalOutflows)}
\u2022 Saldo: ${fmt(d.totalInflows - d.totalOutflows)}
${lines.length ? "\nPor m\xE9todo:\n" + lines.join("\n") : ""}`;
    }
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_report_orders_by_status",
        description: "Pedidos agrupados por status atual.",
        parameters: { type: "object", properties: {} }
      }
    },
    handler: async () => {
      const data = await getReportOrdersByStatus();
      if (!data.length) return "Sem dados de pedidos.";
      const lines = data.map(
        (d) => `\u2022 ${d.status}: ${d.count} pedidos \u2014 ${fmt(Number(d.total))}`
      );
      return `Pedidos por status:
${lines.join("\n")}`;
    }
  },
  {
    def: {
      type: "function",
      function: {
        name: "list_suppliers",
        description: "Lista fornecedores cadastrados.",
        parameters: { type: "object", properties: {} }
      }
    },
    handler: async () => {
      const s = await listSuppliers();
      if (!s.length) return "Nenhum fornecedor cadastrado.";
      const lines = s.map(
        (x) => `\u2022 ${x.name} | Doc: ${x.document || "N/A"} | ${x.city || "N/A"} | Tel: ${x.phone || "N/A"}`
      );
      return `Fornecedores (${s.length}):
${lines.join("\n")}`;
    }
  },
  {
    def: {
      type: "function",
      function: {
        name: "list_purchase_orders",
        description: "Lista pedidos de compra a fornecedores.",
        parameters: { type: "object", properties: {} }
      }
    },
    handler: async () => {
      const po = await listPurchaseOrders();
      if (!po.length) return "Nenhum pedido de compra registrado.";
      const lines = po.slice(0, 10).map(
        (p) => `\u2022 ${p.code} \u2014 Fornecedor#${p.supplierId} \u2014 ${p.status} \u2014 ${fmt(Number(p.total || 0))}`
      );
      return `Pedidos de compra (${po.length}):
${lines.join("\n")}`;
    }
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_crm_opportunities",
        description: "Lista oportunidades do funil de vendas CRM com valores e etapas.",
        parameters: { type: "object", properties: {} }
      }
    },
    handler: async () => {
      const o = await getOpportunities();
      if (!o.length) return "Nenhuma oportunidade no funil.";
      const lines = o.slice(0, 10).map(
        (x) => `\u2022 ${x.title} \u2014 ${x.stage} \u2014 ${x.value ? fmt(Number(x.value)) : "sem valor"} \u2014 Cliente#${x.customerId}`
      );
      return `Oportunidades (${o.length}):
${lines.join("\n")}`;
    }
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_customer_activities",
        description: "Hist\xF3rico de atividades de atendimento (liga\xE7\xF5es, WhatsApp, emails, notas).",
        parameters: {
          type: "object",
          properties: {
            customer_id: {
              type: "number",
              description: "ID do cliente para filtrar."
            }
          }
        }
      }
    },
    handler: async (args) => {
      const acts = await getCustomerActivities(
        args.customer_id ? Number(args.customer_id) : void 0
      );
      if (!acts.length) return "Nenhuma atividade registrada.";
      const lines = acts.slice(0, 10).map(
        (a) => `\u2022 ${a.type} | ${a.summary} | ${a.createdAt}`
      );
      return `Atividades (${acts.length}):
${lines.join("\n")}`;
    }
  },
  {
    def: {
      type: "function",
      function: {
        name: "get_customer_addresses",
        description: "Endere\xE7os cadastrados de um cliente espec\xEDfico.",
        parameters: {
          type: "object",
          properties: {
            customer_id: {
              type: "number",
              description: "ID do cliente."
            }
          },
          required: ["customer_id"]
        }
      }
    },
    handler: async (args) => {
      const addrs = await listCustomerAddresses(Number(args.customer_id));
      if (!addrs.length) return "Nenhum endere\xE7o cadastrado para este cliente.";
      const lines = addrs.map(
        (a) => `\u2022 ${a.label}: ${a.address}${a.addressNumber ? ", " + a.addressNumber : ""} \u2014 ${a.city}${a.isDefault ? " (padr\xE3o)" : ""}`
      );
      return `Endere\xE7os:
${lines.join("\n")}`;
    }
  }
];
function getToolsForModule(module) {
  const adminModules = [
    "admin",
    "catalog",
    "inventory",
    "finance",
    "crm",
    "security",
    "seo",
    "pwa"
  ];
  if (module === "customer") {
    return [
      tools.find((t2) => t2.def.function.name === "search_products").def,
      tools.find((t2) => t2.def.function.name === "get_delivery_status").def
    ];
  }
  if (module === "delivery") {
    return [
      tools.find((t2) => t2.def.function.name === "get_delivery_status").def,
      tools.find((t2) => t2.def.function.name === "get_active_deliveries").def
    ];
  }
  if (!adminModules.includes(module)) return [];
  const adminTools = [
    "search_products",
    "get_inventory",
    "get_dashboard_summary",
    "get_recent_orders",
    "search_customers",
    "get_delivery_status",
    "get_active_deliveries",
    "get_cash_summary",
    "get_audit_logs",
    "list_suppliers",
    "list_purchase_orders",
    "get_crm_opportunities",
    "get_customer_activities",
    "get_customer_addresses",
    "get_report_sales",
    "get_report_top_products",
    "get_report_low_stock",
    "get_report_quote_conversion",
    "get_report_deliveries",
    "get_report_customers_by_city",
    "get_report_cash",
    "get_report_orders_by_status"
  ];
  if (module === "catalog")
    return adminTools.filter(
      (n) => ["search_products", "get_inventory", "get_dashboard_summary"].includes(n)
    ).map((n) => tools.find((t2) => t2.def.function.name === n).def);
  if (module === "inventory")
    return adminTools.filter(
      (n) => [
        "search_products",
        "get_inventory",
        "get_report_low_stock",
        "list_purchase_orders"
      ].includes(n)
    ).map((n) => tools.find((t2) => t2.def.function.name === n).def);
  if (module === "finance")
    return adminTools.filter(
      (n) => [
        "get_dashboard_summary",
        "get_recent_orders",
        "get_cash_summary",
        "get_report_sales",
        "get_report_cash",
        "get_report_orders_by_status"
      ].includes(n)
    ).map((n) => tools.find((t2) => t2.def.function.name === n).def);
  if (module === "crm")
    return adminTools.filter(
      (n) => [
        "search_customers",
        "get_crm_opportunities",
        "get_customer_activities",
        "get_customer_addresses",
        "get_report_customers_by_city"
      ].includes(n)
    ).map((n) => tools.find((t2) => t2.def.function.name === n).def);
  return adminTools.map((n) => tools.find((t2) => t2.def.function.name === n).def);
}
async function executeTool(name, args) {
  const tool = tools.find((t2) => t2.def.function.name === name);
  if (!tool) return `Ferramenta "${name}" n\xE3o encontrada.`;
  try {
    return await tool.handler(args);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return `Erro ao executar "${name}": ${msg}`;
  }
}

// server/ai-executor.ts
var ROLE_LABELS = {
  admin: "administrador da loja",
  manager: "gestor da loja",
  logistics: "motorista/equipa de entregas",
  sales: "vendedor",
  stock: "respons\xE1vel de stock",
  user: "cliente"
};
function buildSystemPrompt(module, context, role = "user") {
  const roleLabel = ROLE_LABELS[role] || "cliente";
  const roleInstructions = {
    admin: "O utilizador \xE9 um administrador. Pode aceder a todas as funcionalidades: cat\xE1logo, stock, finan\xE7as, CRM, entregas, seguran\xE7a, SEO e PWA. Responda a tudo que ele pedir sem restri\xE7\xF5es.",
    manager: "O utilizador \xE9 um gestor. Pode aceder a todas as funcionalidades: cat\xE1logo, stock, finan\xE7as, CRM, entregas, seguran\xE7a, SEO e PWA.",
    logistics: "O utilizador \xE9 um motorista/equipa de entregas. Responda APENAS a assuntos de entregas e clientes associados \xE0s suas entregas. N\xC3O exponha dados financeiros, stock, cat\xE1logo, CRM ou administrativos.",
    sales: "O utilizador \xE9 um vendedor. Responda a assuntos de CRM, cat\xE1logo e clientes. N\xC3O exponha dados de stock, finan\xE7as ou configura\xE7\xF5es do sistema.",
    stock: "O utilizador \xE9 respons\xE1vel de stock. Responda a assuntos de invent\xE1rio e cat\xE1logo. N\xC3O exponha dados financeiros, CRM ou configura\xE7\xF5es do sistema.",
    user: "O utilizador \xE9 um cliente da loja. Responda APENAS a assuntos de produtos, pre\xE7os, or\xE7amentos, entregas e pedidos do pr\xF3prio cliente. NUNCA exponha dados administrativos, financeiros, de stock interno, de outros clientes ou do sistema."
  };
  return `${prompts[module]} Responda em portugu\xEAs do Brasil, de forma objetiva e profissional. O utilizador \xE9 ${roleLabel}. ${roleInstructions[role] || roleInstructions.user} Contexto autorizado: ${context || "nenhum contexto operacional foi fornecido."} Use as ferramentas dispon\xEDveis quando precisar de dados reais do sistema. N\xE3o invente n\xFAmeros, pre\xE7os ou estoque \u2014 consulte sempre as ferramentas.`;
}
var MAX_TOOL_ROUNDS = 6;
function parseToolArgs(raw) {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
async function askAssistantWithTools(module, message, context, role = "user") {
  const tools2 = getToolsForModule(module) || [];
  const systemPrompt = buildSystemPrompt(module, context, role);
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: message }
  ];
  const toolCalls = [];
  let finalContent = "";
  let rounds = 0;
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    rounds = round + 1;
    const result = await invokeLLM({
      messages,
      tools: tools2.length > 0 ? tools2 : void 0,
      toolChoice: tools2.length > 0 ? "auto" : void 0,
      maxTokens: 1200
    });
    const choice = result.choices[0];
    if (!choice) break;
    const assistantMessage = choice.message;
    messages.push({
      role: "assistant",
      content: assistantMessage.content || "",
      ...assistantMessage.tool_calls ? { tool_call_id: void 0 } : {}
    });
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      for (const tc of assistantMessage.tool_calls) {
        const args = parseToolArgs(tc.function.arguments);
        const toolResult = await executeTool(tc.function.name, args);
        toolCalls.push({
          name: tc.function.name,
          args,
          result: toolResult
        });
        messages.push({
          role: "tool",
          content: toolResult,
          tool_call_id: tc.id
        });
      }
      continue;
    }
    finalContent = typeof assistantMessage.content === "string" ? assistantMessage.content : Array.isArray(assistantMessage.content) ? assistantMessage.content.filter((p) => p.type === "text").map((p) => p.text).join("") : "";
    break;
  }
  if (!finalContent) {
    finalContent = "N\xE3o consegui gerar uma resposta completa. Tente reformular a pergunta.";
  }
  return { content: finalContent, toolCalls, rounds };
}
async function* streamAssistantWithTools(module, message, context, role = "user") {
  const tools2 = getToolsForModule(module) || [];
  const systemPrompt = buildSystemPrompt(module, context, role);
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: message }
  ];
  let finalContent = "";
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await fetch(
      `${getActiveProvider().baseUrl.replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${getActiveProvider().apiKey}`
        },
        body: JSON.stringify({
          model: getActiveProvider().model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
            ...m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}
          })),
          tools: tools2.length > 0 ? tools2 : void 0,
          tool_choice: tools2.length > 0 ? "auto" : void 0,
          max_tokens: 1200,
          stream: false
        })
      }
    );
    if (!response.ok) {
      yield { type: "error", message: `LLM provider error: ${response.status}` };
      return;
    }
    const result = await response.json();
    const choice = result.choices[0];
    if (!choice) break;
    const assistantMsg = choice.message;
    messages.push({
      role: "assistant",
      content: assistantMsg.content || ""
    });
    if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
      for (const tc of assistantMsg.tool_calls) {
        const args = parseToolArgs(tc.function.arguments);
        yield { type: "tool_call", name: tc.function.name, args };
        const toolResult = await executeTool(tc.function.name, args);
        yield { type: "tool_result", name: tc.function.name, result: toolResult };
        messages.push({
          role: "tool",
          content: toolResult,
          tool_call_id: tc.id
        });
      }
      continue;
    }
    finalContent = typeof assistantMsg.content === "string" ? assistantMsg.content : Array.isArray(assistantMsg.content) ? assistantMsg.content.filter((p) => p.type === "text").map((p) => p.text).join("") : "";
    break;
  }
  if (finalContent) {
    const words = finalContent.split(/(\s+)/);
    for (let i = 0; i < words.length; i++) {
      yield { type: "token", content: words[i] };
    }
  }
  yield { type: "done", content: finalContent || "N\xE3o foi poss\xEDvel gerar uma resposta." };
}
function getActiveProvider() {
  const nvidiaKey = process.env.NVIDIA_API_KEY || "";
  const groqKey = process.env.GROQ_API_KEY || "";
  if (nvidiaKey.trim()) {
    return {
      baseUrl: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
      apiKey: nvidiaKey,
      model: process.env.NVIDIA_MODEL || "nvidia/nemotron-3.5-lightning-30b-a3b"
    };
  }
  if (groqKey.trim()) {
    return {
      baseUrl: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
      apiKey: groqKey,
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile"
    };
  }
  throw new Error("Nenhum provedor LLM configurado.");
}

// server/assistant.ts
var prompts = {
  customer: "Voc\xEA \xE9 o assistente Cliente da Atua Loja, loja de materiais de constru\xE7\xE3o de Niquel\xE2ndia e regi\xE3o. Ajude com produtos, especifica\xE7\xF5es, or\xE7amento, compra, retirada, frete e acompanhamento por c\xF3digo. N\xE3o invente pre\xE7o, estoque, prazo, pedido ou pol\xEDtica. Quando faltar dado, encaminhe para a equipe pelo WhatsApp. Nunca revele dados de outros clientes, motoristas, margens, caixa ou informa\xE7\xF5es administrativas.",
  delivery: "Voc\xEA \xE9 o assistente Entrega da Atua Loja. Apoie exclusivamente o motorista ou equipa log\xEDstica com checklist, estados de entrega, diverg\xEAncia, prova de entrega, endere\xE7o e seguran\xE7a de rota. N\xE3o exponha dados de clientes que n\xE3o estejam ligados \xE0 entrega atribu\xEDda e n\xE3o permita encerrar uma entrega sem prova v\xE1lida. N\xE3o d\xEA instru\xE7\xF5es perigosas nem revele localiza\xE7\xE3o a terceiros.",
  admin: "Voc\xEA \xE9 o assistente Administrador da Atua Loja. Apoie gest\xE3o de cat\xE1logo, CRM, or\xE7amentos, pedidos, stock, compras, fornecedores, caixa, entregas e indicadores. Responda com clareza e destaque quando uma opera\xE7\xE3o exige confirma\xE7\xE3o humana. Nunca invente n\xFAmeros, nunca altere dados sozinho e nunca exponha credenciais ou dados pessoais al\xE9m do necess\xE1rio.",
  catalog: "Voc\xEA \xE9 o especialista de Cat\xE1logo da Atua Loja. Analise produtos, SKU, categorias, unidades, pre\xE7os, custos, especifica\xE7\xF5es, imagens e publica\xE7\xE3o. Sugira melhorias, mas nunca publique, apague ou altere produtos sem confirma\xE7\xE3o humana. N\xE3o invente atributos t\xE9cnicos nem pre\xE7os.",
  inventory: "Voc\xEA \xE9 o especialista de Stock da Atua Loja. Analise disponibilidade, reservas, liberta\xE7\xF5es, entradas de compras, movimentos, m\xEDnimos e cobertura por localiza\xE7\xE3o. Pe\xE7a confirma\xE7\xE3o antes de qualquer ajuste e nunca autorize sa\xEDda acima do dispon\xEDvel.",
  finance: "Voc\xEA \xE9 o especialista Financeiro da Atua Loja. Analise vendas, recebimentos, caixa, diferen\xE7as, despesas e confer\xEAncias. Use apenas n\xFAmeros fornecidos no contexto autorizado e nunca execute pagamentos ou fechos sem confirma\xE7\xE3o humana.",
  crm: "Voc\xEA \xE9 o especialista de CRM da Atua Loja. Apoie clientes, contactos, oportunidades, tarefas, hist\xF3rico, funil e convers\xE3o de or\xE7amento. Recomende pr\xF3ximos passos sem inventar intera\xE7\xF5es, consentimentos ou dados de clientes.",
  security: "Voc\xEA \xE9 o especialista de Seguran\xE7a da Atua Loja. Fa\xE7a revis\xE3o defensiva de autentica\xE7\xE3o, autoriza\xE7\xE3o, exposi\xE7\xE3o de dados, armazenamento, auditoria, uploads e configura\xE7\xF5es. Classifique achados por severidade, evid\xEAncia e correc\xE7\xE3o. N\xE3o revele segredos nem forne\xE7a instru\xE7\xF5es ofensivas.",
  seo: "Voc\xEA \xE9 o especialista de SEO local da Atua Loja. Analise conte\xFAdo, estrutura, dados locais, indexabilidade, acessibilidade e experi\xEAncia de pesquisa para Niquel\xE2ndia e regi\xE3o. Recomende melhorias verific\xE1veis sem prometer ranking, inventar avalia\xE7\xF5es ou fabricar depoimentos.",
  pwa: "Voc\xEA \xE9 o especialista PWA da Atua Loja. Analise manifesto, service worker, instala\xE7\xE3o, cache, offline, responsividade e actualiza\xE7\xF5es. Diferencie o que foi verificado no sandbox do que exige teste em dispositivo real."
};
async function askAssistant(module, message, context, role = "user") {
  const result = await askAssistantWithTools(module, message, context, role);
  return result.content;
}
async function streamAssistant(module, message, context, role = "user") {
  return streamAssistantWithTools(module, message, context, role);
}

// server/routers.ts
var driverProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!["admin", "manager", "logistics"].includes(ctx.user.role)) throw new TRPCError2({ code: "FORBIDDEN", message: "Acesso reservado \xE0 equipa de log\xEDstica." });
  return next();
});
var appRouter = router({
  system: systemRouter,
  assistant: router({
    customer: publicProcedure.input(z2.object({ message: z2.string().min(2), context: z2.string().max(4e3).optional() })).mutation(({ input, ctx }) => askAssistant("customer", input.message, input.context, ctx.user?.role || "user")),
    delivery: driverProcedure.input(z2.object({ message: z2.string().min(2), context: z2.string().max(4e3).optional() })).mutation(({ input, ctx }) => askAssistant("delivery", input.message, input.context, ctx.user?.role || "logistics")),
    admin: adminProcedure.input(z2.object({ message: z2.string().min(2), context: z2.string().max(6e3).optional() })).mutation(({ input, ctx }) => askAssistant("admin", input.message, input.context, ctx.user?.role || "admin")),
    catalog: adminProcedure.input(z2.object({ message: z2.string().min(2), context: z2.string().max(6e3).optional() })).mutation(({ input, ctx }) => askAssistant("catalog", input.message, input.context, ctx.user?.role || "admin")),
    inventory: adminProcedure.input(z2.object({ message: z2.string().min(2), context: z2.string().max(6e3).optional() })).mutation(({ input, ctx }) => askAssistant("inventory", input.message, input.context, ctx.user?.role || "admin")),
    finance: adminProcedure.input(z2.object({ message: z2.string().min(2), context: z2.string().max(6e3).optional() })).mutation(({ input, ctx }) => askAssistant("finance", input.message, input.context, ctx.user?.role || "admin")),
    crm: adminProcedure.input(z2.object({ message: z2.string().min(2), context: z2.string().max(6e3).optional() })).mutation(({ input, ctx }) => askAssistant("crm", input.message, input.context, ctx.user?.role || "admin")),
    security: adminProcedure.input(z2.object({ message: z2.string().min(2), context: z2.string().max(6e3).optional() })).mutation(({ input, ctx }) => askAssistant("security", input.message, input.context, ctx.user?.role || "admin")),
    seo: adminProcedure.input(z2.object({ message: z2.string().min(2), context: z2.string().max(6e3).optional() })).mutation(({ input, ctx }) => askAssistant("seo", input.message, input.context, ctx.user?.role || "admin")),
    pwa: adminProcedure.input(z2.object({ message: z2.string().min(2), context: z2.string().max(6e3).optional() })).mutation(({ input, ctx }) => askAssistant("pwa", input.message, input.context, ctx.user?.role || "admin"))
  }),
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    localLogin: publicProcedure.input(z2.object({ username: z2.string().min(1), password: z2.string().min(1) })).mutation(async ({ ctx, input }) => {
      if (!isLocalAdminLoginConfigured()) throw new TRPCError2({ code: "PRECONDITION_FAILED", message: "Login local indispon\xEDvel. Preencha LOCAL_ADMIN_USERNAME e LOCAL_ADMIN_PASSWORD no .env." });
      if (!ENV.databaseUrl) throw new TRPCError2({ code: "PRECONDITION_FAILED", message: "DATABASE_URL n\xE3o configurada. Configure a base de dados antes do login local." });
      if (!credentialsMatch(input.username, input.password)) throw new TRPCError2({ code: "UNAUTHORIZED", message: "Utilizador ou password inv\xE1lidos." });
      await upsertUser({ openId: ENV.localAdminOpenId, name: ENV.localAdminName, email: ENV.localAdminEmail || `${ENV.localAdminUsername}@local.invalid`, loginMethod: "local", lastSignedIn: /* @__PURE__ */ new Date() });
      const user = await getUserByOpenId(ENV.localAdminOpenId);
      if (!user) throw new TRPCError2({ code: "INTERNAL_SERVER_ERROR", message: "N\xE3o foi poss\xEDvel criar a sess\xE3o administrativa local." });
      const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || ENV.localAdminName, expiresInMs: 8 * 60 * 60 * 1e3 });
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(ctx.req), maxAge: 8 * 60 * 60 * 1e3 });
      return { success: true };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true };
    })
  }),
  catalog: router({
    list: publicProcedure.query(() => getPublicProducts())
  }),
  delivery: router({
    track: publicProcedure.input(z2.object({ code: z2.string().min(4) })).query(async ({ input }) => {
      const delivery = await getDeliveryByCode(input.code);
      return delivery ? { code: `ENT-${delivery.id}`, status: delivery.status, address: delivery.address } : null;
    })
  }),
  quote: router({
    calculateFreight: publicProcedure.input(z2.object({ city: z2.string().default("Niquel\xE2ndia"), distanceKm: z2.number().nonnegative(), subtotal: z2.number().nonnegative() })).query(({ input }) => calculateFreight(input)),
    create: publicProcedure.input(z2.object({ name: z2.string().min(2), phone: z2.string().min(8), email: z2.string().email().optional(), city: z2.string().default("Niquel\xE2ndia"), postalCode: z2.string().optional(), address: z2.string().optional(), addressNumber: z2.string().optional(), complement: z2.string().optional(), reference: z2.string().optional(), notes: z2.string().min(3), total: z2.string().optional(), distanceKm: z2.number().nonnegative().optional(), items: z2.array(z2.object({ productId: z2.number().positive().optional(), description: z2.string().min(2), quantity: z2.number().positive(), unit: z2.string().min(1), unitPrice: z2.string(), total: z2.string() })).optional() })).mutation(async ({ input }) => {
      const customer = await createCustomer({ name: input.name, phone: input.phone, email: input.email, city: input.city, postalCode: input.postalCode, address: input.address, addressNumber: input.addressNumber, complement: input.complement, reference: input.reference });
      if (input.address?.trim()) await saveCustomerAddress({ customerId: customer.id, label: "Endere\xE7o do or\xE7amento", postalCode: input.postalCode, city: input.city, address: input.address, addressNumber: input.addressNumber, complement: input.complement, reference: input.reference, isDefault: 1 });
      const freight = input.distanceKm === void 0 ? null : calculateFreight({ city: input.city, distanceKm: input.distanceKm, subtotal: Number(input.total || 0) });
      if (freight && !freight.eligible) throw new TRPCError2({ code: "BAD_REQUEST", message: freight.reason });
      const quote = await createQuote({ code: `ORC-${Date.now().toString().slice(-6)}`, customerId: customer.id, total: input.total || "0", deliveryCity: input.city, deliveryPostalCode: input.postalCode, deliveryAddress: input.address, deliveryAddressNumber: input.addressNumber, deliveryComplement: input.complement, deliveryReference: input.reference, notes: `${input.notes}${freight ? `
${freight.reason}: R$ ${freight.amount.toFixed(2)}` : ""}`, items: input.items });
      return { customerId: customer.id, quoteId: quote.id, freight };
    }),
    checkout: publicProcedure.input(z2.object({ name: z2.string().min(2), phone: z2.string().min(8), email: z2.string().email().optional(), city: z2.string().min(2), address: z2.string().min(5), addressNumber: z2.string().optional(), complement: z2.string().optional(), reference: z2.string().optional(), distanceKm: z2.number().nonnegative().optional(), subtotal: z2.string(), deliveryFee: z2.string().optional(), items: z2.array(z2.object({ productId: z2.number().positive().optional(), description: z2.string().min(2), quantity: z2.number().positive(), unit: z2.string().min(1), unitPrice: z2.string(), total: z2.string() })).min(1) })).mutation(({ input }) => {
      const distanceKm = input.distanceKm ?? (input.city.trim().toLowerCase() === "niquel\xE2ndia" ? 0 : 81);
      const freight = calculateFreight({ city: input.city, distanceKm, subtotal: Number(input.subtotal) });
      if (!freight.eligible) throw new TRPCError2({ code: "BAD_REQUEST", message: freight.reason });
      return createPublicOrder({ ...input, deliveryFee: input.deliveryFee ?? freight.amount.toFixed(2) });
    }),
    uploadAttachment: publicProcedure.input(z2.object({ quoteId: z2.number().positive(), filename: z2.string().min(3).max(180), contentType: z2.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]), dataUrl: z2.string().regex(/^data:(application\/pdf|image\/(jpeg|png|webp));base64,/) })).mutation(async ({ input }) => {
      const quote = await getQuoteById(input.quoteId);
      if (!quote) throw new TRPCError2({ code: "NOT_FOUND", message: "Or\xE7amento n\xE3o encontrado." });
      const base64 = input.dataUrl.split(",")[1];
      if (!base64 || base64.length > 12e6) throw new TRPCError2({ code: "BAD_REQUEST", message: "Anexo inv\xE1lido ou demasiado grande." });
      const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const uploaded = await storagePut(`quotes/${input.quoteId}/${Date.now()}-${safeName}`, Buffer.from(base64, "base64"), input.contentType);
      await addQuoteAttachment({ quoteId: input.quoteId, fileName: safeName, fileKey: uploaded.key, url: uploaded.url, mimeType: input.contentType, sizeBytes: Buffer.byteLength(base64, "base64") });
      return uploaded;
    }),
    attachments: publicProcedure.input(z2.object({ quoteId: z2.number().positive() })).query(({ input }) => listQuoteAttachments(input.quoteId))
  }),
  crm: router({
    customers: adminProcedure.query(() => getCustomers()),
    activities: adminProcedure.input(z2.object({ customerId: z2.number().optional() }).optional()).query(({ input }) => getCustomerActivities(input?.customerId)),
    opportunities: adminProcedure.query(() => getOpportunities()),
    addActivity: protectedProcedure.input(z2.object({ customerId: z2.number().optional(), type: z2.enum(["call", "whatsapp", "email", "note", "task"]), summary: z2.string().min(3) })).mutation(({ ctx, input }) => addActivity({ ...input, userId: ctx.user.id })),
    updateCustomer: adminProcedure.input(z2.object({ id: z2.number().positive(), name: z2.string().min(2), phone: z2.string().min(8), email: z2.string().email().optional(), city: z2.string().optional(), postalCode: z2.string().optional(), address: z2.string().optional(), addressNumber: z2.string().optional(), complement: z2.string().optional(), reference: z2.string().optional() })).mutation(({ input }) => {
      const { id, ...data } = input;
      return updateCustomer(id, data);
    }),
    addContact: protectedProcedure.input(z2.object({ customerId: z2.number(), type: z2.enum(["phone", "email", "whatsapp", "address"]), value: z2.string().min(2), label: z2.string().optional(), isPrimary: z2.number().optional() })).mutation(({ input }) => addCustomerContact(input)),
    addresses: adminProcedure.input(z2.object({ customerId: z2.number().positive() })).query(({ input }) => listCustomerAddresses(input.customerId)),
    saveAddress: adminProcedure.input(z2.object({ customerId: z2.number().positive(), id: z2.number().positive().optional(), label: z2.string().min(2), postalCode: z2.string().optional(), city: z2.string().min(2), address: z2.string().min(5), addressNumber: z2.string().optional(), complement: z2.string().optional(), reference: z2.string().optional(), isDefault: z2.number().min(0).max(1).optional() })).mutation(({ input }) => saveCustomerAddress(input)),
    createOpportunity: protectedProcedure.input(z2.object({ customerId: z2.number(), title: z2.string().min(2), value: z2.string().optional(), stage: z2.enum(["prospecting", "qualified", "proposal", "negotiation", "won", "lost"]).optional(), notes: z2.string().optional() })).mutation(({ ctx, input }) => createOpportunity({ ...input, ownerId: ctx.user.id })),
    convertQuote: adminProcedure.input(z2.object({ quoteId: z2.number(), customerId: z2.number(), fulfillment: z2.enum(["pickup", "delivery"]), deliveryAddress: z2.string().optional(), deliveryFee: z2.string().optional() })).mutation(({ ctx, input }) => convertQuoteToOrder({ ...input, actorId: ctx.user.id }))
  }),
  driver: router({
    assigned: driverProcedure.query(({ ctx }) => getAssignedDeliveries(ctx.user.id)),
    recordLocation: driverProcedure.input(z2.object({ deliveryId: z2.number().optional(), latitude: z2.number().gte(-90).lte(90), longitude: z2.number().gte(-180).lte(180), accuracy: z2.number().positive().optional() })).mutation(({ ctx, input }) => recordDriverLocation({ ...input, driverId: ctx.user.id })),
    uploadProof: driverProcedure.input(z2.object({ deliveryId: z2.number().positive(), filename: z2.string().min(3).max(120), contentType: z2.enum(["image/jpeg", "image/png", "image/webp"]), dataUrl: z2.string().regex(/^data:image\/(jpeg|png|webp);base64,/) })).mutation(async ({ ctx, input }) => {
      const assigned = await getAssignedDeliveries(ctx.user.id);
      if (!assigned.some((delivery) => delivery.id === input.deliveryId)) throw new TRPCError2({ code: "FORBIDDEN", message: "Entrega n\xE3o atribu\xEDda a este motorista." });
      const base64 = input.dataUrl.split(",")[1];
      if (!base64 || base64.length > 8e6) throw new TRPCError2({ code: "BAD_REQUEST", message: "Comprovativo inv\xE1lido ou demasiado grande." });
      const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      return storagePut(`deliveries/${input.deliveryId}/${Date.now()}-${safeName}`, Buffer.from(base64, "base64"), input.contentType);
    }),
    transition: driverProcedure.input(z2.object({ deliveryId: z2.number(), status: z2.enum(["checked", "departed", "in_route", "arrived", "confirmed", "partial", "failed"]), proofType: z2.enum(["code", "signature", "photo", "manual"]).optional(), proofUrl: z2.string().url().optional(), confirmationCode: z2.string().optional(), notes: z2.string().optional() })).mutation(({ ctx, input }) => transitionDelivery({ ...input, actorId: ctx.user.id })),
    checklist: driverProcedure.input(z2.object({ deliveryId: z2.number().positive() })).query(({ input }) => getDeliveryChecklist(input.deliveryId)),
    updateChecklist: driverProcedure.input(z2.object({ deliveryId: z2.number().positive(), items: z2.array(z2.object({ id: z2.number().positive(), loadedQuantity: z2.number().nonnegative(), deliveredQuantity: z2.number().nonnegative(), status: z2.enum(["pending", "loaded", "delivered", "partial", "missing", "damaged"]), notes: z2.string().optional() })).min(1) })).mutation(({ ctx, input }) => updateDeliveryChecklist({ ...input, actorId: ctx.user.id })),
    divergences: driverProcedure.input(z2.object({ deliveryId: z2.number().positive().optional() }).optional()).query(({ input }) => listDeliveryDivergences(input?.deliveryId))
  }),
  admin: router({
    catalog: router({
      list: adminProcedure.query(() => getAdminProducts()),
      create: adminProcedure.input(z2.object({ sku: z2.string().min(2), name: z2.string().min(2), slug: z2.string().min(2), categoryId: z2.number().optional(), description: z2.string().optional(), specifications: z2.string().optional(), unit: z2.string().min(1), price: z2.string(), cost: z2.string().optional(), weight: z2.string().optional(), imageUrl: z2.string().url().optional(), imageKey: z2.string().optional(), active: z2.number().optional() })).mutation(({ input }) => createProduct(input)),
      update: adminProcedure.input(z2.object({ id: z2.number(), sku: z2.string().min(2).optional(), name: z2.string().min(2).optional(), slug: z2.string().min(2).optional(), categoryId: z2.number().optional(), description: z2.string().optional(), specifications: z2.string().optional(), unit: z2.string().optional(), price: z2.string().optional(), cost: z2.string().optional(), weight: z2.string().optional(), imageUrl: z2.string().url().optional(), imageKey: z2.string().optional(), active: z2.number().optional() })).mutation(({ input }) => {
        const { id, ...data } = input;
        return updateProduct(id, data);
      }),
      publish: adminProcedure.input(z2.object({ id: z2.number(), active: z2.number().min(0).max(1) })).mutation(({ input }) => setProductActive(input.id, input.active)),
      uploadImage: adminProcedure.input(z2.object({ filename: z2.string().min(3), contentType: z2.enum(["image/jpeg", "image/png", "image/webp"]), dataUrl: z2.string().regex(/^data:image\/(jpeg|png|webp);base64,/), productId: z2.number().optional() })).mutation(async ({ ctx, input }) => {
        const base64 = input.dataUrl.split(",")[1];
        if (!base64 || base64.length > 7e6) throw new TRPCError2({ code: "BAD_REQUEST", message: "Imagem inv\xE1lida ou demasiado grande." });
        const uploaded = await storagePut(`products/${input.productId || "new"}/${input.filename}`, Buffer.from(base64, "base64"), input.contentType);
        return { ...uploaded, uploadedBy: ctx.user.id };
      })
    }),
    summary: adminProcedure.query(() => getDashboardSummary()),
    systemConfig: adminProcedure.query(() => {
      const llmProviders = getConfiguredLlmProviders();
      return {
        hasDatabase: Boolean(ENV.databaseUrl),
        hasOAuth: false,
        hasLocalLogin: isLocalAdminLoginConfigured(),
        llmProviders: llmProviders.map((p) => ({ name: p.name, model: p.model })),
        hasService: Boolean(ENV.serviceApiKey),
        isProduction: ENV.isProduction,
        storeName: "Atua Loja Materiais de Constru\xE7\xE3o",
        storeCity: "Niquel\xE2ndia",
        storePhone: "+55 62 99144-4852"
      };
    }),
    recentOrders: adminProcedure.query(() => getRecentOrders()),
    sales: router({ list: adminProcedure.query(() => getRecentOrders()), registerPayment: adminProcedure.input(z2.object({ sessionId: z2.number().positive(), orderId: z2.number().positive(), amount: z2.string().refine((value) => Number(value) > 0, "Valor inv\xE1lido"), method: z2.enum(["cash", "pix", "card", "transfer", "other"]), notes: z2.string().optional() })).mutation(({ ctx, input }) => registerSalePayment({ ...input, createdBy: ctx.user.id })) }),
    activeDeliveries: adminProcedure.query(() => getActiveDeliveries()),
    auditLogs: adminProcedure.query(() => getAuditLogs()),
    notifications: adminProcedure.input(z2.object({ unreadOnly: z2.boolean().optional() }).optional()).query(({ ctx, input }) => listNotifications({ userId: ctx.user.id, unreadOnly: input?.unreadOnly })),
    markNotificationRead: adminProcedure.input(z2.object({ id: z2.number().positive() })).mutation(({ ctx, input }) => markNotificationRead(input.id, ctx.user.id)),
    divergences: router({ list: adminProcedure.input(z2.object({ deliveryId: z2.number().positive().optional() }).optional()).query(({ input }) => listDeliveryDivergences(input?.deliveryId)), resolve: adminProcedure.input(z2.object({ id: z2.number().positive(), status: z2.enum(["resolved", "rejected"]), resolution: z2.string().min(3) })).mutation(({ ctx, input }) => resolveDeliveryDivergence({ ...input, resolvedBy: ctx.user.id })) }),
    erp: router({ inventory: adminProcedure.query(() => getInventory()), adjustInventory: adminProcedure.input(z2.object({ productId: z2.number(), location: z2.string().min(1), quantity: z2.number().positive(), type: z2.enum(["purchase", "sale", "reservation", "release", "adjustment", "return"]), notes: z2.string().optional() })).mutation(({ ctx, input }) => adjustInventory({ ...input, userId: ctx.user.id })) }),
    suppliers: router({ list: adminProcedure.query(() => listSuppliers()), create: adminProcedure.input(z2.object({ name: z2.string().min(2), document: z2.string().optional(), phone: z2.string().optional(), email: z2.string().email().optional(), city: z2.string().optional(), notes: z2.string().optional() })).mutation(({ input }) => createSupplier(input)) }),
    purchases: router({ list: adminProcedure.query(() => listPurchaseOrders()), detail: adminProcedure.input(z2.object({ id: z2.number().positive() })).query(({ input }) => getPurchaseOrderDetails(input.id)), create: adminProcedure.input(z2.object({ supplierId: z2.number(), total: z2.string().optional(), expectedAt: z2.coerce.date().optional(), notes: z2.string().optional(), items: z2.array(z2.object({ productId: z2.number().positive(), quantity: z2.number().positive(), unitCost: z2.string().refine((value) => Number(value) >= 0, "Custo inv\xE1lido") })).min(1) })).mutation(({ ctx, input }) => createPurchaseOrder({ ...input, code: `COMP-${Date.now().toString().slice(-8)}`, createdBy: ctx.user.id })), receive: adminProcedure.input(z2.object({ purchaseOrderId: z2.number().positive(), items: z2.array(z2.object({ purchaseItemId: z2.number().positive(), productId: z2.number().positive(), quantity: z2.number().positive(), location: z2.string().min(1) })).min(1), notes: z2.string().optional() })).mutation(({ ctx, input }) => receivePurchaseOrder({ ...input, receivedBy: ctx.user.id })) }),
    cash: router({ sessions: adminProcedure.query(() => getCashSessions()), summary: adminProcedure.input(z2.object({ id: z2.number().positive() })).query(({ input }) => getCashSessionSummary(input.id)), open: adminProcedure.input(z2.object({ openingAmount: z2.string().refine((value) => Number(value) >= 0, "Valor inv\xE1lido"), notes: z2.string().optional() })).mutation(({ ctx, input }) => openCashSession({ ...input, openedBy: ctx.user.id })), movement: adminProcedure.input(z2.object({ sessionId: z2.number(), type: z2.enum(["sale", "expense", "withdrawal", "deposit", "refund", "adjustment"]), amount: z2.string().refine((value) => Number(value) > 0, "Valor inv\xE1lido"), method: z2.enum(["cash", "pix", "card", "transfer", "other"]), notes: z2.string().optional() })).mutation(({ ctx, input }) => addCashMovement({ ...input, createdBy: ctx.user.id })), close: adminProcedure.input(z2.object({ id: z2.number(), closingAmount: z2.string().refine((value) => Number(value) >= 0, "Valor inv\xE1lido"), notes: z2.string().optional() })).mutation(({ input }) => closeCashSession(input.id, input.closingAmount, input.notes)), audit: adminProcedure.input(z2.object({ id: z2.number().positive(), notes: z2.string().optional() })).mutation(({ ctx, input }) => auditCashSession(input.id, ctx.user.id, input.notes)) }),
    reports: router({
      salesByMonth: adminProcedure.query(() => getReportSalesByMonth()),
      ordersByStatus: adminProcedure.query(() => getReportOrdersByStatus()),
      ordersBySource: adminProcedure.query(() => getReportOrdersBySource()),
      topProducts: adminProcedure.query(() => getReportTopProducts()),
      deliveriesByStatus: adminProcedure.query(() => getReportDeliveriesByStatus()),
      cashSummary: adminProcedure.query(() => getReportCashSummary()),
      customersByCity: adminProcedure.query(() => getReportCustomersByCity()),
      inventoryLow: adminProcedure.query(() => getReportInventoryLow()),
      quoteConversion: adminProcedure.query(() => getReportQuoteConversion())
    })
  })
});

// server/streaming-router.ts
import { Router } from "express";
import { parse as parseCookieHeader2 } from "cookie";
var MODULES = [
  "customer",
  "delivery",
  "admin",
  "catalog",
  "inventory",
  "finance",
  "crm",
  "security",
  "seo",
  "pwa"
];
var ROLE_MODULE_ACCESS = {
  admin: ["admin", "delivery", "customer", "catalog", "inventory", "finance", "crm", "security", "seo", "pwa"],
  manager: ["admin", "delivery", "customer", "catalog", "inventory", "finance", "crm", "security", "seo", "pwa"],
  logistics: ["delivery", "customer"],
  sales: ["crm", "customer", "catalog"],
  stock: ["inventory", "catalog", "customer"],
  user: ["customer"]
};
var streamingRouter = Router();
async function authenticateFromRequest(req) {
  const cookies = parseCookieHeader2(req.headers.cookie || "");
  let sessionToken = cookies[COOKIE_NAME];
  if (!sessionToken) {
    const authHeader = req.headers.authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      sessionToken = authHeader.slice(7);
    }
  }
  if (!sessionToken) return null;
  try {
    const payload = await sdk.verifySession(sessionToken);
    if (!payload?.openId) return null;
    const user = await getUserByOpenId(payload.openId);
    return { openId: payload.openId, role: user?.role || "user" };
  } catch {
    return null;
  }
}
function denyAccess(res, status, message) {
  res.status(status).json({ error: message });
}
function writeSseHeaders(res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });
}
streamingRouter.get("/api/assistant/stream", async (req, res) => {
  const module = String(req.query.module || "admin");
  const message = String(req.query.message || "").trim();
  const context = req.query.context ? String(req.query.context) : void 0;
  const roleParam = req.query.role ? String(req.query.role) : void 0;
  if (!MODULES.includes(module)) {
    denyAccess(res, 400, "M\xF3dulo inv\xE1lido.");
    return;
  }
  if (!message || message.length < 2) {
    denyAccess(res, 400, "Mensagem deve ter pelo menos 2 caracteres.");
    return;
  }
  let userRole = "user";
  if (module !== "customer") {
    const auth = await authenticateFromRequest(req);
    if (!auth) {
      denyAccess(res, 401, "Autentica\xE7\xE3o necess\xE1ria.");
      return;
    }
    userRole = auth.role;
  } else {
    if (roleParam && ["user", "admin", "manager", "logistics", "sales", "stock"].includes(roleParam)) {
      userRole = roleParam;
    }
  }
  const allowed = ROLE_MODULE_ACCESS[userRole] || ["customer"];
  if (!allowed.includes(module)) {
    denyAccess(res, 403, "Sem permiss\xE3o para este m\xF3dulo.");
    return;
  }
  writeSseHeaders(res);
  res.write(`data: ${JSON.stringify({ type: "start", module })}

`);
  try {
    const stream = await streamAssistant(module, message, context, userRole);
    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}

`);
    }
    res.write("data: [DONE]\n\n");
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error(`[Streaming] Error for module ${module}:`, msg);
    res.write(`data: ${JSON.stringify({ type: "error", message: msg })}

`);
  }
  res.end();
});
streamingRouter.post("/api/assistant/stream", async (req, res) => {
  const { module: mod, message, context, role: roleParam } = req.body || {};
  if (!MODULES.includes(mod)) {
    denyAccess(res, 400, "M\xF3dulo inv\xE1lido.");
    return;
  }
  if (!message || String(message).length < 2) {
    denyAccess(res, 400, "Mensagem deve ter pelo menos 2 caracteres.");
    return;
  }
  let userRole = "user";
  if (mod !== "customer") {
    const auth = await authenticateFromRequest(req);
    if (!auth) {
      denyAccess(res, 401, "Autentica\xE7\xE3o necess\xE1ria.");
      return;
    }
    userRole = auth.role;
  } else {
    if (roleParam && ["user", "admin", "manager", "logistics", "sales", "stock"].includes(roleParam)) {
      userRole = roleParam;
    }
  }
  const allowed = ROLE_MODULE_ACCESS[userRole] || ["customer"];
  if (!allowed.includes(mod)) {
    denyAccess(res, 403, "Sem permiss\xE3o para este m\xF3dulo.");
    return;
  }
  writeSseHeaders(res);
  res.write(`data: ${JSON.stringify({ type: "start", module: mod })}

`);
  try {
    const stream = await streamAssistant(mod, message, context, userRole);
    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}

`);
    }
    res.write("data: [DONE]\n\n");
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error(`[Streaming] Error for module ${mod}:`, msg);
    res.write(`data: ${JSON.stringify({ type: "error", message: msg })}

`);
  }
  res.end();
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs from "fs";
import { nanoid } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";
var plugins = [react(), tailwindcss()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // NOTE: manualChunks removed. The previous function-based split put
        // "icons-vendor" (lucide-react) and "react-vendor" in different chunks,
        // while the generic "vendor" catch-all ended up depending on BOTH of
        // them — creating a real circular chunk dependency:
        //   icons-vendor -> react-vendor -> vendor -> icons-vendor
        // With ESM circular imports, whichever chunk closes the cycle can
        // execute before its dependency has finished initializing, which is
        // exactly what caused "Cannot read properties of undefined
        // (reading 'forwardRef')" in icons-vendor at runtime (confirmed by
        // rebuilding this exact commit and tracing the chunk import graph).
        // Letting Rollup's automatic chunking handle this avoids the cycle.
        // If you want manual vendor splitting back for cache/perf reasons,
        // make sure nothing outside "react-vendor" is allowed to be a
        // dependency of "react-vendor" (no back-edges into it).
      }
    }
  },
  server: {
    host: true,
    allowedHosts: [
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("/{*splat}", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.VERCEL ? path2.resolve(process.cwd(), "dist", "public") : process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("/{*splat}", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/_core/configDiagnostics.ts
var CONFIG_ITEMS = [
  { key: "DATABASE_URL", description: "liga\xE7\xE3o MySQL/TiDB para dados persistentes", required: true },
  { key: "JWT_SECRET", description: "assinatura segura das sess\xF5es", required: true },
  { key: "LOCAL_ADMIN_USERNAME", description: "utilizador do acesso administrativo local", required: false },
  { key: "LOCAL_ADMIN_PASSWORD", description: "password do acesso administrativo local", required: false },
  { key: "ALLOW_LOCAL_ADMIN_LOGIN", description: "permite login local em produ\xE7\xE3o", required: false },
  { key: "NVIDIA_API_KEY", description: "chave do fornecedor LLM principal", required: false },
  { key: "NVIDIA_BASE_URL", description: "endpoint OpenAI-compatible principal", required: false },
  { key: "NVIDIA_MODEL", description: "modelo LLM principal", required: false },
  { key: "GROQ_API_KEY", description: "chave do fornecedor LLM alternativo", required: false },
  { key: "GROQ_BASE_URL", description: "endpoint OpenAI-compatible alternativo", required: false },
  { key: "GROQ_MODEL", description: "modelo LLM alternativo", required: false },
  { key: "SERVICE_API_URL", description: "servi\xE7o externo opcional de armazenamento", required: false },
  { key: "SERVICE_API_KEY", description: "credencial do servi\xE7o externo de armazenamento", required: false },
  { key: "VITE_ANALYTICS_ENDPOINT", description: "endpoint opcional de analytics", required: false },
  { key: "VITE_ANALYTICS_WEBSITE_ID", description: "identificador opcional de analytics", required: false }
];
function getMissingConfig(env = process.env) {
  return CONFIG_ITEMS.filter((item) => !env[item.key]?.trim());
}
function hasLocalAdminConfig(env = process.env) {
  return Boolean(env.LOCAL_ADMIN_USERNAME?.trim() && env.LOCAL_ADMIN_PASSWORD?.trim());
}
function hasAccessMethod(env = process.env) {
  return hasLocalAdminConfig(env);
}
function logConfigDiagnostics(env = process.env) {
  const missing = getMissingConfig(env);
  const required = missing.filter((item) => item.required);
  const optional = missing.filter((item) => !item.required);
  if (required.length) console.warn("[Config] Configura\xE7\xF5es obrigat\xF3rias em falta:", required.map((item) => item.key).join(", "));
  if (optional.length) console.warn("[Config] Configura\xE7\xF5es opcionais em falta:", optional.map((item) => item.key).join(", "));
  if (!hasAccessMethod(env)) console.warn("[Config] Configure LOCAL_ADMIN_USERNAME e LOCAL_ADMIN_PASSWORD para aceder \xE0 gest\xE3o.");
}

// server/_core/index.ts
async function createApp() {
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  if (isSupabaseConfigured()) {
    registerSupabaseAuthRoutes(app);
  }
  app.use(streamingRouter);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  return { app, server };
}
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  logConfigDiagnostics();
  const { server } = await createApp();
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
if (process.env.VERCEL !== "1") {
  startServer().catch(console.error);
}
export {
  createApp
};
