import { ENV } from "./_core/env";

function getServiceConfig() {
  const baseUrl = ENV.serviceApiUrl;
  const apiKey = ENV.serviceApiKey;
  if (!baseUrl || !apiKey) {
    throw new Error("Storage config missing: set SERVICE_API_URL and SERVICE_API_KEY");
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(relKey: string, data: Buffer | Uint8Array | string, contentType = "application/octet-stream"): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getServiceConfig();
  const key = appendHashSuffix(normalizeKey(relKey));
  const presignUrl = new URL("v1/storage/presign/put", `${baseUrl}/`);
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!presignResp.ok) throw new Error(`Storage presign failed (${presignResp.status}): ${await presignResp.text().catch(() => presignResp.statusText)}`);
  const { url: uploadUrl } = await presignResp.json() as { url: string };
  if (!uploadUrl) throw new Error("Storage service returned an empty upload URL");
  const body = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data as any], { type: contentType });
  const uploadResp = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body });
  if (!uploadResp.ok) throw new Error(`Storage upload failed (${uploadResp.status})`);
  return { key, url: `/storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const { baseUrl, apiKey } = getServiceConfig();
  const getUrl = new URL("v1/storage/presign/get", `${baseUrl}/`);
  getUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(getUrl, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!response.ok) throw new Error(`Storage signed URL failed (${response.status}): ${await response.text().catch(() => response.statusText)}`);
  const { url } = await response.json() as { url: string };
  return url;
}
