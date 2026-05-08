import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { memoryPatchSchema } from "@/lib/validators/memory";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memory = await prisma.memory.findUnique({ where: { id } });
  if (!memory) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(memory);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = memoryPatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const current = await prisma.memory.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.saveVersion !== false) {
    await prisma.memoryVersion.create({
      data: {
        memoryId: current.id,
        title: current.title,
        content: current.content,
        status: current.status,
        priority: current.priority,
        tags: current.tags,
      },
    });
  }

  const { saveVersion, projectId, ...rest } = parsed.data;
  void saveVersion;
  const data = {
    ...rest,
    ...(projectId ? { project: { connect: { id: projectId } } } : {}),
  };

  const updated = await prisma.memory.update({ where: { id }, data: data as never });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.memory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
