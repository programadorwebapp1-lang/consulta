import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { removeLegacyPatientCpfIndex } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import Patient from "@/models/Patient";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await connectMongo();
  const patients = await Patient.find().lean();
  return NextResponse.json({ patients });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectMongo();
  await removeLegacyPatientCpfIndex();
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.email) {
    return NextResponse.json({ error: "Nome e e-mail são obrigatórios." }, { status: 400 });
  }

  if (!body.password) {
    return NextResponse.json({ error: "Senha do paciente é obrigatória." }, { status: 400 });
  }

  const existingUser = await User.findOne({ email: String(body.email).toLowerCase() });
  if (existingUser) {
    return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 });
  }

  const patient = await Patient.create({
    name: body.name,
    email: String(body.email).toLowerCase(),
    phone: body.phone || "",
    address: body.address || "",
    birthDate: body.birthDate || "",
    active: body.active ?? true,
  });

  const passwordHash = await hashPassword(String(body.password));
  const user = await User.create({
    name: body.name,
    email: String(body.email).toLowerCase(),
    passwordHash,
    role: "PACIENTE",
    patientId: patient._id,
  });

  patient.userId = user._id;
  patient.email = user.email;
  await patient.save();

  return NextResponse.json({ patient, user }, { status: 201 });
}
