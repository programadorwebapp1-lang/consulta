import { NextRequest, NextResponse } from "next/server";
import { connectMongo, removeLegacyPatientCpfIndex } from "@/lib/mongodb";
import User from "@/models/User";
import Patient from "@/models/Patient";
import { hashPassword, signSessionToken, buildAuthCookie } from "@/lib/auth";
import { roleHome } from "@/lib/guards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function buildPatientName(email: string) {
  const localPart = email.split("@")[0] || "Paciente";
  return localPart
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeDigits(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function isValidBirthDate(value: string) {
  if (!value) return false;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const birthDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return birthDate <= todayDate;
}

export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    await removeLegacyPatientCpfIndex();
    const existingUsers = await User.countDocuments();
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "");
    const phone = normalizeDigits(body.phone);
    const name = normalizeText(body.fullName || body.name) || buildPatientName(email);
    const birthDate = normalizeText(body.birthDate);
    const gender = normalizeText(body.gender);
    const bloodType = normalizeText(body.bloodType);
    const allergies = normalizeText(body.allergies);
    const currentMedications = normalizeText(body.currentMedications);
    const chronicDiseases = normalizeText(body.chronicDiseases);
    const emergencyContact = normalizeText(body.emergencyContact);
    const emergencyPhone = normalizeDigits(body.emergencyPhone);

    if (existingUsers === 0) {
      if (body.role !== "ADMIN") {
        return NextResponse.json({ error: "O primeiro usuário deve ser administrador." }, { status: 400 });
      }

      if (!body.name || !body.email || !body.password) {
        return NextResponse.json({ error: "Nome, e-mail e senha são obrigatórios." }, { status: 400 });
      }

      const passwordHash = await hashPassword(password);
      const user = await User.create({
        name: String(body.name),
        email,
        passwordHash,
        role: "ADMIN",
      });

      const token = await signSessionToken({
        id: user._id.toString(),
        role: "ADMIN",
        name: user.name,
        email: user.email,
      });

      const response = NextResponse.json({ ok: true, redirectTo: roleHome("ADMIN") });
      response.cookies.set(buildAuthCookie(token));
      return response;
    }

    if (body.role !== "PACIENTE") {
      return NextResponse.json({ error: "Cadastro público disponível apenas para pacientes." }, { status: 403 });
    }

    if (!email || !phone || !password || !name || !birthDate || !gender) {
      return NextResponse.json({ error: "Nome completo, data de nascimento, sexo, e-mail, telefone e senha são obrigatórios." }, { status: 400 });
    }

    if (!isValidBirthDate(birthDate)) {
      return NextResponse.json({ error: "Informe uma data de nascimento válida." }, { status: 400 });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const patient = await Patient.create({
      name,
      fullName: name,
      email,
      phone,
      birthDate,
      gender,
      bloodType,
      allergies,
      currentMedications,
      chronicDiseases,
      emergencyContact,
      emergencyPhone,
      active: true,
    });

    const user = await User.create({
      name,
      email,
      passwordHash,
      role: "PACIENTE",
      patientId: patient._id,
    });

    patient.userId = user._id;
    await patient.save();

    const token = await signSessionToken({
      id: user._id.toString(),
      role: "PACIENTE",
      name: user.name,
      email: user.email,
      patientId: patient._id.toString(),
    });

    const response = NextResponse.json({ ok: true, redirectTo: roleHome("PACIENTE") });
    response.cookies.set(buildAuthCookie(token));
    return response;
  } catch (error) {
    console.error("Erro MongoDB register:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: `Não foi possível conectar ao MongoDB. ${message}` }, { status: 503 });
  }
}
