import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { memoryFilterSchema } from "@/lib/validators/memory";

export type MemoryFilterInput = z.infer<typeof memoryFilterSchema>;

export function buildMemoryWhere(filter: Partial<MemoryFilterInput>): Prisma.MemoryWhereInput {
  return {
    AND: [
      filter.projectId ? { projectId: filter.projectId } : {},
      filter.type ? { type: filter.type } : {},
      filter.status ? { status: filter.status } : {},
      filter.priority ? { priority: filter.priority } : {},
      filter.tag ? { tags: { has: filter.tag } } : {},
      filter.q ? { OR: [{ title: { contains: filter.q, mode: "insensitive" } }, { content: { contains: filter.q, mode: "insensitive" } }] } : {},
    ],
  };
}
