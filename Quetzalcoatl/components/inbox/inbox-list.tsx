type InboxItem = { id: string; rawContent: string; status: string; source: string | null };

export function InboxList({ items }: { items: InboxItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article key={item.id} className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm">{item.rawContent}</p>
          <p className="mt-2 text-xs text-zinc-500">Status: {item.status} | Fonte: {item.source || "-"}</p>
        </article>
      ))}
    </div>
  );
}
