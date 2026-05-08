import { ProjectList } from "@/components/projects/project-list";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({ include: { _count: { select: { memories: true } } }, orderBy: { updatedAt: "desc" } });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Projetos</h2>
      <ProjectList projects={projects} />
    </div>
  );
}
