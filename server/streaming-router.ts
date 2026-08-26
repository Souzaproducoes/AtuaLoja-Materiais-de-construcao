import { Router, Request, Response } from "express";
import { streamAssistant, AssistantModule } from "./assistant";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME } from "@shared/const";
import * as db from "./db";
import { parse as parseCookieHeader } from "cookie";

const MODULES: AssistantModule[] = [
  "customer",
  "delivery",
  "admin",
  "catalog",
  "inventory",
  "finance",
  "crm",
  "security",
  "seo",
  "pwa",
];

export type UserRole = "user" | "admin" | "manager" | "sales" | "stock" | "logistics";

/** Modules each role may access via the streaming assistant. */
const ROLE_MODULE_ACCESS: Record<UserRole, AssistantModule[]> = {
  admin: ["admin", "delivery", "customer", "catalog", "inventory", "finance", "crm", "security", "seo", "pwa"],
  manager: ["admin", "delivery", "customer", "catalog", "inventory", "finance", "crm", "security", "seo", "pwa"],
  logistics: ["delivery", "customer"],
  sales: ["crm", "customer", "catalog"],
  stock: ["inventory", "catalog", "customer"],
  user: ["customer"],
};

export const streamingRouter = Router();

async function authenticateFromRequest(req: Request): Promise<{ openId: string; role: UserRole } | null> {
  const cookies = parseCookieHeader(req.headers.cookie || "");
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

    const user = await db.getUserByOpenId(payload.openId);
    return { openId: payload.openId, role: (user?.role as UserRole) || "user" };
  } catch {
    return null;
  }
}

function denyAccess(res: Response, status: number, message: string) {
  res.status(status).json({ error: message });
}

function writeSseHeaders(res: Response) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
}

streamingRouter.get("/api/assistant/stream", async (req: Request, res: Response) => {
  const module = String(req.query.module || "admin") as AssistantModule;
  const message = String(req.query.message || "").trim();
  const context = req.query.context ? String(req.query.context) : undefined;
  const roleParam = req.query.role ? String(req.query.role) : undefined;

  if (!MODULES.includes(module)) {
    denyAccess(res, 400, "Módulo inválido.");
    return;
  }

  if (!message || message.length < 2) {
    denyAccess(res, 400, "Mensagem deve ter pelo menos 2 caracteres.");
    return;
  }

  // Authenticate (skip for customer module which is public)
  let userRole: UserRole = "user";
  if (module !== "customer") {
    const auth = await authenticateFromRequest(req);
    if (!auth) {
      denyAccess(res, 401, "Autenticação necessária.");
      return;
    }
    userRole = auth.role;
  } else {
    // Customer module: use role param if provided (client tells us), else "user"
    if (roleParam && ["user", "admin", "manager", "logistics", "sales", "stock"].includes(roleParam)) {
      userRole = roleParam as UserRole;
    }
  }

  // Role-based module access check
  const allowed = ROLE_MODULE_ACCESS[userRole] || ["customer"];
  if (!allowed.includes(module)) {
    denyAccess(res, 403, "Sem permissão para este módulo.");
    return;
  }

  writeSseHeaders(res);
  res.write(`data: ${JSON.stringify({ type: "start", module })}\n\n`);

  try {
    const stream = await streamAssistant(module, message, context, userRole);
    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
    res.write("data: [DONE]\n\n");
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error(`[Streaming] Error for module ${module}:`, msg);
    res.write(`data: ${JSON.stringify({ type: "error", message: msg })}\n\n`);
  }

  res.end();
});

streamingRouter.post("/api/assistant/stream", async (req: Request, res: Response) => {
  const { module: mod, message, context, role: roleParam } = req.body || {};

  if (!MODULES.includes(mod)) {
    denyAccess(res, 400, "Módulo inválido.");
    return;
  }

  if (!message || String(message).length < 2) {
    denyAccess(res, 400, "Mensagem deve ter pelo menos 2 caracteres.");
    return;
  }

  let userRole: UserRole = "user";
  if (mod !== "customer") {
    const auth = await authenticateFromRequest(req);
    if (!auth) {
      denyAccess(res, 401, "Autenticação necessária.");
      return;
    }
    userRole = auth.role;
  } else {
    if (roleParam && ["user", "admin", "manager", "logistics", "sales", "stock"].includes(roleParam)) {
      userRole = roleParam as UserRole;
    }
  }

  const allowed = ROLE_MODULE_ACCESS[userRole] || ["customer"];
  if (!allowed.includes(mod)) {
    denyAccess(res, 403, "Sem permissão para este módulo.");
    return;
  }

  writeSseHeaders(res);
  res.write(`data: ${JSON.stringify({ type: "start", module: mod })}\n\n`);

  try {
    const stream = await streamAssistant(mod, message, context, userRole);
    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
    res.write("data: [DONE]\n\n");
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error(`[Streaming] Error for module ${mod}:`, msg);
    res.write(`data: ${JSON.stringify({ type: "error", message: msg })}\n\n`);
  }

  res.end();
});
