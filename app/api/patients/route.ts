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
  const fullName = String(body?.fullName || body?.name || "").trim();
  const email = String(body?.email || "").toLowerCase().trim();
  const phone = String(body?.phone || "").trim();
  const birthDate = String(body?.birthDate || "").trim();
  const gender = String(body?.gender || "").trim();

  if (!fullName || !email || !phone || !birthDate || !gender) {
    return NextResponse.json({ error: "Nome completo, e-mail, telefone, data de nascimento e sexo são obrigatórios." }, { status: 400 });
  }

  if (!body.password) {
    return NextResponse.json({ error: "Senha do paciente é obrigatória." }, { status: 400 });
  }

  const date = new Date(`${birthDate}T12:00:00`);
  const today = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const birthDateValue = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (Number.isNaN(date.getTime()) || birthDateValue > todayDate) {
    return NextResponse.json({ error: "Informe uma data de nascimento válida." }, { status: 400 });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 });
  }

  const patient = await Patient.create({
    name: fullName,
    fullName,
    email,
    phone,
    address: body.address || "",
    birthDate,
    gender,
    bloodType: body.bloodType || "",
    allergies: body.allergies || "",
    currentMedications: body.currentMedications || "",
    chronicDiseases: body.chronicDiseases || "",
    emergencyContact: body.emergencyContact || "",
    emergencyPhone: body.emergencyPhone || "",
    active: body.active ?? true,
  });

  const passwordHash = await hashPassword(String(body.password));
  const user = await User.create({
    name: fullName,
    email,
    passwordHash,
    role: "PACIENTE",
    patientId: patient._id,
  });

  patient.userId = user._id;
  patient.email = user.email;
  await patient.save();

  return NextResponse.json({ patient, user }, { status: 201 });
}
