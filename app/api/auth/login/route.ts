import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import User from "@/models/User";
import { roleHome } from "@/lib/guards";
import { buildAuthCookie, signSessionToken, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    const body = await req.json().catch(() => null);

    if (!body?.email || !body?.password) {
      return NextResponse.json({ error: "E-mail e senha são obrigatórios." }, { status: 400 });
    }

    const email = String(body.email).toLowerCase();
    const user = await User.findOne({ email });

    if (!user || !user.active) {
      return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
    }

    const valid = await verifyPassword(String(body.password), user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
    }

    const token = await signSessionToken({
      id: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email,
      doctorId: user.doctorId?.toString?.() ?? null,
      patientId: user.patientId?.toString?.() ?? null,
    });

    const response = NextResponse.json({
      ok: true,
      redirectTo: roleHome(user.role),
    });
    response.cookies.set(buildAuthCookie(token));
    return response;
  } catch (error) {
    console.error("Erro MongoDB login:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      { error: `Não foi possível conectar ao MongoDB. ${message}` },
      { status: 503 }
    );
  }
}
