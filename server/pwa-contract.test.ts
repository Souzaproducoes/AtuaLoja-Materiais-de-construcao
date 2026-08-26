import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const publicDir = path.resolve(import.meta.dirname, "../client/public");

describe("PWA contract", () => {
  it("ships a standalone manifest with required install metadata", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(publicDir, "manifest.webmanifest"), "utf8"));
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.icons.length).toBeGreaterThan(0);
    expect(manifest.theme_color).toBeTruthy();
  });

  it("ships a service worker that caches the app shell and avoids caching API responses", () => {
    const serviceWorker = fs.readFileSync(path.join(publicDir, "sw.js"), "utf8");
    expect(serviceWorker).toContain("install");
    expect(serviceWorker).toContain("caches.open");
    expect(serviceWorker).toContain("/api/");
  });

  it("registers the service worker only in production", () => {
    const main = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/main.tsx"), "utf8");
    expect(main).toContain('import.meta.env.PROD');
    expect(main).toContain('navigator.serviceWorker.register("/sw.js")');
  });
});
