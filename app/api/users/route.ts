import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectMongo();
  const users = await User.find({ role: { $in: ["ADMIN", "MEDICO"] } })
    .select("name email role active doctorId patientId createdAt")
    .sort({ role: 1, name: 1 })
    .lean();
  return NextResponse.json({ users });
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectMongo();
  const body = await req.json().catch(() => null);
  if (!body?.userId) {
    return NextResponse.json({ error: "Usuário é obrigatório." }, { status: 400 });
  }

  if (String(body.userId) === session.id) {
    return NextResponse.json(
      { error: "Você não pode desativar a própria conta." },
      { status: 400 }
    );
  }

  const user = await User.findByIdAndUpdate(body.userId, { active: body.active ?? false }, { new: true });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  return NextResponse.json({ user });
}
