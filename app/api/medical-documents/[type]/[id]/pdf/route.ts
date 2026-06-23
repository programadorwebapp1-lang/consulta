import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import MedicalRecord from "@/models/MedicalRecord";
import Prescription from "@/models/Prescription";
import MedicalCertificate from "@/models/MedicalCertificate";
import ExamRequest from "@/models/ExamRequest";
import Referral from "@/models/Referral";
import ClinicSettings from "@/models/ClinicSettings";
import { createMedicalDocumentPdf } from "@/lib/pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function resolveObjectId(value: any) {
  return String(value?._id || value || "");
}

export async function GET(req: NextRequest, { params }: { params: { type: string; id: string } }) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, id } = params;
  await connectMongo();

  let document: Record<string, any> | null = null;
  if (type === "prescription") document = await Prescription.findById(id).lean();
  if (type === "certificate") document = await MedicalCertificate.findById(id).lean();
  if (type === "examRequest") document = await ExamRequest.findById(id).lean();
  if (type === "referral") document = await Referral.findById(id).lean();
  if (!document) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });

  const record = await MedicalRecord.findById(document.medicalRecordId)
    .populate("patientId")
    .populate({ path: "doctorId", populate: "specialtyId" })
    .lean();
  if (!record) return NextResponse.json({ error: "Prontuário não encontrado." }, { status: 404 });

  if (session.role === "MEDICO" && resolveObjectId(record.doctorId) !== session.doctorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.role === "PACIENTE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clinicSettings = await ClinicSettings.findOne().lean();
  const doctor = record.doctorId as Record<string, any> | undefined;
  const patient = record.patientId as Record<string, any> | undefined;
  const titleMap: Record<string, string> = {
    prescription: "Receita Medica",
    certificate: "Atestado Medico",
    examRequest: "Solicitacao de Exames",
    referral: "Encaminhamento",
  };

  const pdf = await createMedicalDocumentPdf({
    type: type as "prescription" | "certificate" | "examRequest" | "referral",
    title: titleMap[type] || "Documento Clinico",
    issuedAt: document.createdAt || new Date(),
    clinic: {
      name: String((clinicSettings as Record<string, any> | null)?.clinicName || "MediClinic"),
      cnpj: String((clinicSettings as Record<string, any> | null)?.cnpj || ""),
      logoUrl: String((clinicSettings as Record<string, any> | null)?.logoUrl || ""),
      phone: String((clinicSettings as Record<string, any> | null)?.phone || ""),
      whatsapp: String((clinicSettings as Record<string, any> | null)?.whatsapp || ""),
      email: String((clinicSettings as Record<string, any> | null)?.email || ""),
      address: String((clinicSettings as Record<string, any> | null)?.address || ""),
    },
    patient: {
      name: String(patient?.name || ""),
      cpf: String(patient?.cpf || ""),
      birthDate: String(patient?.birthDate || ""),
      phone: String(patient?.phone || ""),
      email: String(patient?.email || ""),
    },
    doctor: {
      name: String(doctor?.name || ""),
      crm: String(doctor?.crm || ""),
      specialty: String((doctor?.specialtyId as Record<string, any> | undefined)?.name || ""),
    },
    prescription:
      type === "prescription"
        ? {
            medications: Array.isArray(document.medications)
              ? document.medications.map((item: Record<string, any>) => ({
                  medication: String(item.medication || ""),
                  dosage: String(item.dosage || ""),
                  frequency: String(item.frequency || ""),
                  duration: String(item.duration || ""),
                  observations: String(item.observations || ""),
                }))
              : [],
          }
        : undefined,
    certificate:
      type === "certificate"
        ? {
            daysOff: Number(document.daysOff || 0),
            startDate: String(document.startDate || ""),
            cid: String(document.cid || ""),
            observations: String(document.observations || ""),
          }
        : undefined,
    examRequest:
      type === "examRequest"
        ? {
            exams: Array.isArray(document.exams)
              ? document.exams.map((item: Record<string, any>) => String(item.name || item || "")).filter(Boolean)
              : [],
            justification: String((document as Record<string, any>).justification || record.assessment || record.diagnosis || record.conduct || ""),
            observations: String((document as Record<string, any>).observations || record.notes || ""),
          }
        : undefined,
    referral:
      type === "referral"
        ? {
            destination: String(document.destination || ""),
            reason: String(document.reason || ""),
            summary: String(record.diagnosis || record.assessment || record.conduct || record.notes || ""),
            observations: String(document.observations || ""),
          }
        : undefined,
    recordSummary: {
      diagnosis: String(record.diagnosis || ""),
      assessment: String(record.assessment || ""),
      conduct: String(record.conduct || ""),
      notes: String(record.notes || ""),
    },
  });

  const filename = `${String(titleMap[type] || "documento").replace(/\s+/g, "_").toLowerCase()}_${id}.pdf`;
  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=\"${filename}\"`,
    },
  });
}

