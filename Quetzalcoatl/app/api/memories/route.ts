import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { buildMemoryWhere } from "@/lib/services/memory-query";
import { memoryFilterSchema, memorySchema } from "@/lib/validators/memory";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const filter = memoryFilterSchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!filter.success) return NextResponse.json({ error: filter.error.flatten() }, { status: 400 });

  const memories = await prisma.memory.findMany({
    where: buildMemoryWhere(filter.data),
    include: { project: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: filter.data.limit,
    skip: filter.data.offset,
  });

  return NextResponse.json(memories);
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await request.json().catch(() => null) : Object.fromEntries((await request.formData()).entries());

  const normalized = {
    ...body,
    tags:
      typeof body.tags === "string"
        ? body.tags
            .split(",")
            .map((value: string) => value.trim())
            .filter(Boolean)
        : body.tags,
  };

  const parsed = memorySchema.safeParse(normalized);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const memory = await prisma.memory.create({ data: parsed.data as never });
  return NextResponse.json(memory, { status: 201 });
}
