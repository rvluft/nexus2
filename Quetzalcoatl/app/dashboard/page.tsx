import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [projects, inboxCount, draftCount, criticalCount, recent] = await Promise.all([
    prisma.project.findMany({ where: { status: { not: "arquivado" } }, include: { _count: { select: { memories: true } } }, orderBy: { updatedAt: "desc" }, take: 8 }),
    prisma.inboxItem.count({ where: { status: "pendente" } }),
    prisma.memory.count({ where: { status: "rascunho" } }),
    prisma.memory.count({ where: { priority: { in: ["alta", "critica"] } } }),
    prisma.memory.findMany({ orderBy: { updatedAt: "desc" }, include: { project: { select: { name: true } } }, take: 6 }),
  ]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Dashboard</h2>
      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">Inbox pendente: {inboxCount}</div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">Memorias em rascunho: {draftCount}</div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">Memorias criticas/altas: {criticalCount}</div>
      </section>
      <section className="grid gap-3 md:grid-cols-2">
        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <h3 className="mb-3 font-medium">Projetos ativos</h3>
          <ul className="space-y-2 text-sm">{projects.map((project) => <li key={project.id}>{project.name} - {project._count.memories} memorias</li>)}</ul>
        </article>
        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <h3 className="mb-3 font-medium">Ultimas atualizacoes</h3>
          <ul className="space-y-2 text-sm">{recent.map((memory) => <li key={memory.id}>{memory.title} ({memory.project.name})</li>)}</ul>
        </article>
      </section>
    </div>
  );
}
