import { InboxList } from "@/components/inbox/inbox-list";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const items = await prisma.inboxItem.findMany({ orderBy: { createdAt: "desc" }, take: 50 });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Inbox</h2>
      <form action="/api/inbox" method="post" className="rounded-lg border border-zinc-200 bg-white p-4">
        <textarea name="rawContent" required className="h-24 w-full rounded border px-3 py-2" placeholder="Cole texto bruto para triagem" />
        <button className="mt-2 rounded bg-zinc-900 px-4 py-2 text-white">Adicionar na inbox</button>
      </form>
      <InboxList items={items} />
    </div>
  );
}
