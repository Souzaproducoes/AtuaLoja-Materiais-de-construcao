import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../DB-SCHEMA-REPAIR.sql", import.meta.url), "utf8");

describe("users role schema repair", () => {
  it("allows every supported role without destructive statements", () => {
    for (const role of ["user", "admin", "manager", "sales", "stock", "logistics"]) {
      expect(migration).toContain(`'${role}'`);
    }
    expect(migration.toUpperCase()).not.toContain("DROP TABLE");
    expect(migration.toUpperCase()).not.toContain("DELETE FROM");
    expect(migration).toContain("ALTER TABLE `users`");
  });
});
