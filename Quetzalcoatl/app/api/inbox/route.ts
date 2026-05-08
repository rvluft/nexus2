import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { inboxSchema } from "@/lib/validators/inbox";

export async function GET() {
  const items = await prisma.inboxItem.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await request.json().catch(() => null) : Object.fromEntries((await request.formData()).entries());
  const parsed = inboxSchema.safeParse(body);

  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const item = await prisma.inboxItem.create({ data: parsed.data });
  return NextResponse.json(item, { status: 201 });
}
