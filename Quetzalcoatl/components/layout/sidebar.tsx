import Link from "next/link";

const items = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Projetos" },
  { href: "/memories", label: "Memorias" },
  { href: "/inbox", label: "Inbox" },
  { href: "/critical", label: "Memorias criticas" },
  { href: "/search", label: "Busca" },
  { href: "/settings", label: "Configuracoes" },
];

export function Sidebar() {
  return (
    <aside className="w-full border-b border-zinc-200 bg-white p-4 md:w-60 md:border-r md:border-b-0">
      <h1 className="mb-4 text-lg font-semibold">Quetzalcoatl</h1>
      <nav className="flex flex-wrap gap-2 md:flex-col">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="rounded border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-100">
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
