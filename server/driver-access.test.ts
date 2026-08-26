import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("driver access", () => {
  it("denies delivery operations to regular users", async () => {
    const ctx: TrpcContext = { user: { id: 4, openId: "regular", name: "Cliente", email: "cliente@example.com", loginMethod: "local", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
    await expect(appRouter.createCaller(ctx).driver.assigned()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
