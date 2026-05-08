import { prisma } from "@/lib/db/prisma";
import { MEMORY_PRIORITY, MEMORY_STATUS, MEMORY_TYPES } from "@/lib/constants/domain";

export const dynamic = "force-dynamic";

export default async function NewMemoryPage() {
  const projects = await prisma.project.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Nova memoria</h2>
      <form action="/api/memories" method="post" className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
        <label className="block text-sm">Projeto<select name="projectId" className="mt-1 w-full rounded border px-3 py-2" required>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        <label className="block text-sm">Tipo<select name="type" className="mt-1 w-full rounded border px-3 py-2">{MEMORY_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="block text-sm">Titulo<input name="title" className="mt-1 w-full rounded border px-3 py-2" required /></label>
        <label className="block text-sm">Conteudo (Markdown)<textarea name="content" className="mt-1 h-40 w-full rounded border px-3 py-2" required /></label>
        <label className="block text-sm">Status<select name="status" className="mt-1 w-full rounded border px-3 py-2">{MEMORY_STATUS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="block text-sm">Prioridade<select name="priority" className="mt-1 w-full rounded border px-3 py-2">{MEMORY_PRIORITY.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="block text-sm">Tags (csv)<input name="tags" className="mt-1 w-full rounded border px-3 py-2" /></label>
        <button className="rounded bg-zinc-900 px-4 py-2 text-white">Salvar memoria</button>
      </form>
    </div>
  );
}
