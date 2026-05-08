import { prisma } from "@/lib/db/prisma";

export async function getProjectAIContext(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, name: true, slug: true, aiSummary: true } });
  if (!project) return null;

  const memories = await prisma.memory.findMany({
    where: {
      projectId,
      status: { in: ["vigente", "referencia"] },
      OR: [{ priority: "critica" }, { priority: "alta" }, { type: "decisao" }, { type: "regra" }, { type: "prompt" }, { type: "solucao" }, { type: "erro" }, { type: "licao_aprendida" }],
    },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    take: 30,
    select: { id: true, type: true, title: true, content: true, status: true, priority: true },
  });

  return { project, critical_memories: memories };
}
