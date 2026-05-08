import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { projectSchema } from "@/lib/validators/project";

export async function GET() {
  const projects = await prisma.project.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const project = await prisma.project.create({ data: parsed.data });
  return NextResponse.json(project, { status: 201 });
}
