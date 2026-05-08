import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    project: { findUnique: vi.fn() },
    memory: { findMany: vi.fn() },
  },
}));

import { prisma } from "../lib/db/prisma";
import { getProjectAIContext } from "../lib/services/ai-context";

describe("getProjectAIContext", () => {
  it("returns null when project does not exist", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValueOnce(null as never);
    const result = await getProjectAIContext("missing-id");
    expect(result).toBeNull();
  });
});
