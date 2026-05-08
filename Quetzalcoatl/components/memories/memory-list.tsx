import { Badge } from "@/components/ui/badge";

type MemoryItem = {
  id: string;
  type: string;
  title: string;
  status: string;
  priority: string;
  tags: string[];
  content: string;
  project: { name: string };
};

function statusVariant(status: string): "default" | "success" | "warning" | "danger" | "muted" {
  if (status === "vigente") return "success";
  if (status === "rascunho") return "warning";
  if (status === "obsoleto") return "muted";
  return "default";
}

function priorityVariant(priority: string): "default" | "success" | "warning" | "danger" | "muted" {
  if (priority === "critica") return "danger";
  if (priority === "alta") return "warning";
  return "default";
}

export function MemoryList({ memories }: { memories: MemoryItem[] }) {
  return (
    <div className="space-y-3">
      {memories.map((memory) => (
        <article key={memory.id} className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge>{memory.type}</Badge>
            <Badge variant={statusVariant(memory.status)}>{memory.status}</Badge>
            <Badge variant={priorityVariant(memory.priority)}>{memory.priority}</Badge>
            <span className="text-xs text-zinc-500">{memory.project.name}</span>
          </div>
          <h3 className="text-sm font-semibold">{memory.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{memory.content}</p>
          <p className="mt-2 text-xs text-zinc-500">Tags: {memory.tags.join(", ") || "-"}</p>
        </article>
      ))}
    </div>
  );
}
