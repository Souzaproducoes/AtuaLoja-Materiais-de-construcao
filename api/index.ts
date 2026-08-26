// @ts-nocheck
import type { IncomingMessage, ServerResponse } from "http";

let cachedApp: any = null;

async function getApp() {
  if (cachedApp) return cachedApp;
  const { createApp } = await import("./_server.mjs");
  const result = await createApp();
  cachedApp = result.app;
  return cachedApp;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (error: any) {
    console.error("[Vercel Handler] Fatal error:", error?.message || error);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal Server Error", message: error?.message || "Unknown error" }));
    }
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
