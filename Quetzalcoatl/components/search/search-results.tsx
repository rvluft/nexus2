import { MemoryList } from "@/components/memories/memory-list";

type MemoryItem = Parameters<typeof MemoryList>[0]["memories"];

export function SearchResults({ memories }: { memories: MemoryItem }) {
  return <MemoryList memories={memories} />;
}
