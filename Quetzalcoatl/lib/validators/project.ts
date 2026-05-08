import { z } from "zod";
import { PROJECT_STATUS } from "@/lib/constants/domain";

export const projectSchema = z.object({
  slug: z.string().min(2).max(120),
  name: z.string().min(2).max(120),
  description: z.string().max(5000).optional().or(z.literal("")),
  status: z.enum(PROJECT_STATUS).default("ativo"),
  aiSummary: z.string().max(10000).optional().or(z.literal("")),
});

export const projectPatchSchema = projectSchema.partial();
