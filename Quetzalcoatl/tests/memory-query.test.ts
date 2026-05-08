import { describe, expect, it } from "vitest";
import { buildMemoryWhere } from "../lib/services/memory-query";

describe("buildMemoryWhere", () => {
  it("builds text search and filters", () => {
    const where = buildMemoryWhere({ q: "pdf", status: "vigente", priority: "alta", tag: "dwg", limit: 50, offset: 0 });
    expect(where.AND).toHaveLength(6);
  });
});
