import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import { hashPassword } from "@/lib/auth";
import User from "@/models/User";
import Doctor from "@/models/Doctor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  const session = await getSessionUser(req);
  const { id } = context.params;

  if (!session || session.role !== "MEDICO" || session.doctorId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectMongo();

  const doctor = await Doctor.findById(id).select("userId").lean();
  if (!doctor) {
    return NextResponse.json({ error: "Médico não encontrado." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const currentPassword = String(body?.currentPassword || "").trim();
  const password = String(body?.password || "").trim();

  if (password.length < 6) {
    return NextResponse.json({ error: "A nova senha deve ter pelo menos 6 caracteres." }, { status: 400 });
  }
  if (!currentPassword) {
    return NextResponse.json({ error: "Informe a senha atual." }, { status: 400 });
  }

  const user = await User.findById(doctor.userId);
  if (!user) {
    return NextResponse.json({ error: "Conta de usuário do médico não encontrada." }, { status: 404 });
  }

  const { verifyPassword } = await import("@/lib/auth");
  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Senha atual inválida." }, { status: 401 });
  }

  user.passwordHash = await hashPassword(password);
  await user.save();

  return NextResponse.json({ ok: true });
}
