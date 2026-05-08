import { MemoryList } from "@/components/memories/memory-list";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function MemoriesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;

  const memories = await prisma.memory.findMany({
    where: {
      projectId: sp.projectId || undefined,
      type: (sp.type as never) || undefined,
      status: (sp.status as never) || undefined,
      priority: (sp.priority as never) || undefined,
      tags: sp.tag ? { has: sp.tag } : undefined,
      OR: sp.q ? [{ title: { contains: sp.q, mode: "insensitive" } }, { content: { contains: sp.q, mode: "insensitive" } }] : undefined,
    },
    include: { project: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Memorias</h2>
      <form className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-3">
        <input name="q" defaultValue={sp.q} placeholder="Busca textual" className="rounded border px-3 py-2" />
        <input name="projectId" defaultValue={sp.projectId} placeholder="Project UUID" className="rounded border px-3 py-2" />
        <input name="tag" defaultValue={sp.tag} placeholder="Tag" className="rounded border px-3 py-2" />
        <button type="submit" className="rounded bg-zinc-900 px-3 py-2 text-sm text-white">Filtrar</button>
      </form>
      <MemoryList memories={memories} />
    </div>
  );
}
