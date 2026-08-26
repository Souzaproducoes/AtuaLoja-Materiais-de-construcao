import { timingSafeEqual } from "node:crypto";
import { ENV } from "./_core/env";

type LocalAdminConfig = Pick<typeof ENV, "allowLocalAdminLogin" | "localAdminUsername" | "localAdminPassword">;

export function isLocalAdminLoginConfigured(config: LocalAdminConfig = ENV) {
  return config.allowLocalAdminLogin && Boolean(config.localAdminUsername && config.localAdminPassword);
}

export function credentialsMatch(username: string, password: string, config: LocalAdminConfig = ENV) {
  if (!isLocalAdminLoginConfigured(config)) return false;
  return safeEqual(username, config.localAdminUsername) && safeEqual(password, config.localAdminPassword);
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}
