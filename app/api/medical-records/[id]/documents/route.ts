import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import MedicalRecord from "@/models/MedicalRecord";
import Prescription from "@/models/Prescription";
import ExamRequest from "@/models/ExamRequest";
import MedicalCertificate from "@/models/MedicalCertificate";
import Referral from "@/models/Referral";
import { buildAuditEntry } from "@/lib/medical-records";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getPdfUrl(type: string, id: string) {
  return `/api/medical-documents/${type}/${id}/pdf`;
}

function resolveObjectId(value: any) {
  return String(value?._id || value || "");
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "MEDICO") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = params;
  await connectMongo();

  const record = await MedicalRecord.findById(id);
  if (!record) return NextResponse.json({ error: "Prontuário não encontrado." }, { status: 404 });
  if (resolveObjectId(record.doctorId) !== session.doctorId) {
    return NextResponse.json({ error: "Apenas o médico responsável pode emitir documentos." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body?.type) return NextResponse.json({ error: "Tipo do documento é obrigatório." }, { status: 400 });

  const type = String(body.type);
  let document: any = null;

  if (type === "prescription") {
    document = await Prescription.create({
      patientId: record.patientId,
      doctorId: record.doctorId,
      medicalRecordId: record._id,
      medications: Array.isArray(body.medications) ? body.medications : [],
      pdfUrl: "",
    });
  } else if (type === "certificate") {
    document = await MedicalCertificate.create({
      patientId: record.patientId,
      doctorId: record.doctorId,
      medicalRecordId: record._id,
      daysOff: Number(body.daysOff || 0),
      startDate: String(body.startDate || ""),
      cid: String(body.cid || ""),
      observations: String(body.observations || ""),
      pdfUrl: "",
    });
  } else if (type === "examRequest") {
    document = await ExamRequest.create({
      patientId: record.patientId,
      doctorId: record.doctorId,
      medicalRecordId: record._id,
      exams: Array.isArray(body.exams) ? body.exams : [],
      pdfUrl: "",
    });
  } else if (type === "referral") {
    document = await Referral.create({
      patientId: record.patientId,
      doctorId: record.doctorId,
      medicalRecordId: record._id,
      destination: String(body.destination || ""),
      reason: String(body.reason || ""),
      observations: String(body.observations || ""),
      pdfUrl: "",
    });
  } else {
    return NextResponse.json({ error: "Tipo de documento inválido." }, { status: 400 });
  }

  document.pdfUrl = getPdfUrl(type, String(document._id));
  await document.save();

  record.auditTrail.push(buildAuditEntry("DOCUMENT", session, `Documento emitido: ${type}.`));
  await record.save();

  return NextResponse.json({ document });
}
