type ProjectItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  _count: { memories: number };
};

export function ProjectList({ projects }: { projects: ProjectItem[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {projects.map((project) => (
        <article key={project.id} className="rounded-lg border border-zinc-200 bg-white p-4">
          <h3 className="font-semibold">{project.name}</h3>
          <p className="text-sm text-zinc-500">/{project.slug}</p>
          <p className="mt-2 text-sm text-zinc-600">{project.description || "Sem descricao"}</p>
          <p className="mt-3 text-xs text-zinc-500">Status: {project.status} | Memorias: {project._count.memories}</p>
        </article>
      ))}
    </div>
  );
}
