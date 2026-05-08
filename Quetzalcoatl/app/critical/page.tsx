import { MemoryList } from "@/components/memories/memory-list";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function CriticalMemoriesPage() {
  const memories = await prisma.memory.findMany({ where: { priority: { in: ["alta", "critica"] } }, include: { project: { select: { name: true } } }, orderBy: [{ priority: "desc" }, { updatedAt: "desc" }] });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Memorias criticas e altas</h2>
      <MemoryList memories={memories} />
    </div>
  );
}
