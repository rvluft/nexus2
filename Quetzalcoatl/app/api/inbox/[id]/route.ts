import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { inboxPatchSchema } from "@/lib/validators/inbox";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = inboxPatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const item = await prisma.inboxItem.update({ where: { id }, data: parsed.data });
  return NextResponse.json(item);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.inboxItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
