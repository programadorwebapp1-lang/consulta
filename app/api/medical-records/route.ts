import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import MedicalRecord from "@/models/MedicalRecord";
import { loadMedicalRecordDetails, loadPatientHistory } from "@/lib/medical-records-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const recordId = req.nextUrl.searchParams.get("medicalRecordId") || "";
  const appointmentId = req.nextUrl.searchParams.get("appointmentId") || "";
  const patientId = req.nextUrl.searchParams.get("patientId") || "";

  await connectMongo();

  let record: any = null;

  if (recordId || appointmentId) {
    if (recordId) {
      record = await MedicalRecord.findById(recordId).lean();
    } else if (appointmentId) {
      record = await MedicalRecord.findOne({ appointmentId }).lean();
    }
  }

  if (record) {
    if (session.role === "MEDICO" && String(record.doctorId) !== session.doctorId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (session.role === "PACIENTE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const details = await loadMedicalRecordDetails(String(record._id));
    const history = await loadPatientHistory(String(record.patientId), String(record._id));
    return NextResponse.json({ ...details, history });
  }

  if (patientId) {
    if (session.role !== "ADMIN" && session.role !== "MEDICO") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const history = await loadPatientHistory(patientId);
    return NextResponse.json({ record: null, history, documents: null });
  }

  return NextResponse.json({ record: null, history: [], documents: null });
}
