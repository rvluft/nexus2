import { SearchResults } from "@/components/search/search-results";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const q = sp.q || "";
  const memories = q
    ? await prisma.memory.findMany({
        where: { OR: [{ title: { contains: q, mode: "insensitive" } }, { content: { contains: q, mode: "insensitive" } }] },
        include: { project: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
      })
    : [];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Busca global</h2>
      <form className="rounded-lg border border-zinc-200 bg-white p-4">
        <input name="q" defaultValue={q} placeholder="Buscar em titulo e conteudo" className="w-full rounded border px-3 py-2" />
      </form>
      <SearchResults memories={memories} />
    </div>
  );
}
