import { z } from "zod";
import { INBOX_STATUS, MEMORY_TYPES } from "@/lib/constants/domain";

export const inboxSchema = z.object({
  rawContent: z.string().min(2),
  suggestedProjectId: z.string().uuid().optional(),
  suggestedType: z.enum(MEMORY_TYPES).optional(),
  status: z.enum(INBOX_STATUS).default("pendente"),
  source: z.string().max(300).optional().or(z.literal("")),
});

export const inboxPatchSchema = inboxSchema.partial();

export const inboxConvertSchema = z.object({
  projectId: z.string().uuid(),
  type: z.enum(MEMORY_TYPES),
  title: z.string().min(2).max(240),
  content: z.string().min(3),
  status: z.enum(["vigente", "rascunho", "obsoleto", "referencia"]).default("vigente"),
  priority: z.enum(["baixa", "media", "alta", "critica"]).default("media"),
  tags: z.array(z.string()).default([]),
});
