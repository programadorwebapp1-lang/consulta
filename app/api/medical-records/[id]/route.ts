import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import Appointment from "@/models/Appointment";
import MedicalRecord from "@/models/MedicalRecord";
import { buildAuditEntry } from "@/lib/medical-records";
import { loadMedicalRecordDetails, parseMedicalRecordPayload } from "@/lib/medical-records-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function resolveObjectId(value: any) {
  return String(value?._id || value || "");
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;
  await connectMongo();

  const details = await loadMedicalRecordDetails(id);
  if (!details) return NextResponse.json({ error: "Prontuário não encontrado." }, { status: 404 });

  if (session.role === "MEDICO" && resolveObjectId(details.record.doctorId) !== session.doctorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.role === "PACIENTE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(details);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "MEDICO") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = params;
  await connectMongo();
  const record = await MedicalRecord.findById(id);
  if (!record) return NextResponse.json({ error: "Prontuário não encontrado." }, { status: 404 });
  if (resolveObjectId(record.doctorId) !== session.doctorId) {
    return NextResponse.json({ error: "Apenas o médico responsável pode editar o prontuário." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });

  const previousStatus = record.status;
  const payload = parseMedicalRecordPayload(body);
  Object.assign(record, payload);
  record.auditTrail.push(buildAuditEntry("UPDATE", session, "Campos do prontuário atualizados."));

  const statusChangedToFinalized = payload.status === "FINALIZADO" && previousStatus !== "FINALIZADO";
  await record.save();

  if (statusChangedToFinalized) {
    await Appointment.findByIdAndUpdate(record.appointmentId, { status: "FINALIZADA" });
    record.auditTrail.push(buildAuditEntry("FINALIZE", session, "Atendimento finalizado."));
    await record.save();
  }

  const details = await loadMedicalRecordDetails(id);
  return NextResponse.json(details);
}
