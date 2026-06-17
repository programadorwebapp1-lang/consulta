import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import Specialty from "@/models/Specialty";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await connectMongo();
  const specialties = await Specialty.find().lean();
  return NextResponse.json({ specialties });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectMongo();
  const body = await req.json().catch(() => null);
  if (!body?.name) {
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  }

  const specialty = await Specialty.create({
    name: body.name,
    description: body.description || "",
    active: body.active ?? true,
  });

  return NextResponse.json({ specialty }, { status: 201 });
}
