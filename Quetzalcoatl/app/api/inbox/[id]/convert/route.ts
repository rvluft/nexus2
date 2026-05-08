import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { inboxConvertSchema } from "@/lib/validators/inbox";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = inboxConvertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const memory = await prisma.$transaction(async (tx) => {
    const created = await tx.memory.create({ data: parsed.data });
    await tx.inboxItem.update({ where: { id }, data: { status: "convertido" } });
    return created;
  });

  return NextResponse.json(memory, { status: 201 });
}
