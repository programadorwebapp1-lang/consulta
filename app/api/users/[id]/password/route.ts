import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import { hashPassword } from "@/lib/auth";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = context.params;
  await connectMongo();

  const body = await req.json().catch(() => null);
  const password = String(body?.password || "").trim();
  if (password.length < 6) {
    return NextResponse.json({ error: "A senha deve ter pelo menos 6 caracteres." }, { status: 400 });
  }

  const user = await User.findById(id);
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  if (user.role === "PACIENTE") {
    return NextResponse.json({ error: "Não é permitido alterar senha de pacientes por esta tela." }, { status: 403 });
  }

  if (user.role === "ADMIN" && user._id.toString() !== session.id) {
    return NextResponse.json({ error: "O admin só pode alterar a própria senha." }, { status: 403 });
  }

  user.passwordHash = await hashPassword(password);
  await user.save();

  return NextResponse.json({ ok: true });
}
