import { notFound } from "next/navigation";
import { MemoryList } from "@/components/memories/memory-list";
import { prisma } from "@/lib/db/prisma";

const tabs = ["Visao Geral", "Decisoes", "Regras", "Prompts", "Codigos", "Erros/Solucoes", "Licoes Aprendidas", "Historico", "Todas"];

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) notFound();

  const memories = await prisma.memory.findMany({ where: { projectId: id }, include: { project: { select: { name: true } } }, orderBy: { updatedAt: "desc" }, take: 50 });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">{project.name}</h2>
      <p className="text-sm text-zinc-600">{project.description || "Sem descricao"}</p>
      <p className="text-sm text-zinc-600">Resumo IA: {project.aiSummary || "Nao definido"}</p>
      <div className="flex flex-wrap gap-2">{tabs.map((tab) => <span key={tab} className="rounded bg-zinc-100 px-2 py-1 text-xs">{tab}</span>)}</div>
      <MemoryList memories={memories} />
    </div>
  );
}
