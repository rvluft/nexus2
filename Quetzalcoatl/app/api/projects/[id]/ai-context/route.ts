import { NextResponse } from "next/server";
import { getProjectAIContext } from "@/lib/services/ai-context";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getProjectAIContext(id);
  if (!context) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  return NextResponse.json(context);
}
