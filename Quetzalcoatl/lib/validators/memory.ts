import { z } from "zod";
import { CONFIDENCE_LEVEL, MEMORY_PRIORITY, MEMORY_STATUS, MEMORY_TYPES } from "@/lib/constants/domain";

export const memorySchema = z.object({
  projectId: z.string().uuid(),
  type: z.enum(MEMORY_TYPES),
  title: z.string().min(2).max(240),
  content: z.string().min(3),
  status: z.enum(MEMORY_STATUS).default("vigente"),
  priority: z.enum(MEMORY_PRIORITY).default("media"),
  tags: z.array(z.string()).default([]),
  source: z.string().max(300).optional().or(z.literal("")),
  confidence: z.enum(CONFIDENCE_LEVEL).default("alta"),
  metadata: z.any().default({}),
});

export const memoryPatchSchema = memorySchema.partial().extend({ saveVersion: z.boolean().default(true) });

export const memoryFilterSchema = z.object({
  q: z.string().optional(),
  projectId: z.string().uuid().optional(),
  type: z.enum(MEMORY_TYPES).optional(),
  status: z.enum(MEMORY_STATUS).optional(),
  priority: z.enum(MEMORY_PRIORITY).optional(),
  tag: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
