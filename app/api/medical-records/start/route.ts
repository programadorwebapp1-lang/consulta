import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import Appointment from "@/models/Appointment";
import MedicalRecord from "@/models/MedicalRecord";
import ClinicSettings from "@/models/ClinicSettings";
import { buildAuditEntry } from "@/lib/medical-records";
import { loadAppointmentContext } from "@/lib/medical-records-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function resolveObjectId(value: any) {
  return String(value?._id || value || "");
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || session.role !== "MEDICO") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectMongo();
    const body = await req.json().catch(() => null);
    const appointmentId = String(body?.appointmentId || "");
    if (!appointmentId) {
      return NextResponse.json({ error: "Consulta é obrigatória." }, { status: 400 });
    }

    const appointment = await Appointment.findById(appointmentId)
      .populate("patientId")
      .populate("doctorId")
      .populate("specialtyId");

    if (!appointment) {
      return NextResponse.json({ error: "Consulta não encontrada." }, { status: 404 });
    }

    const doctorId = resolveObjectId(appointment.doctorId);
    const patientId = resolveObjectId(appointment.patientId);
    if (!doctorId || !patientId) {
      return NextResponse.json({ error: "Consulta incompleta. Verifique os vínculos do paciente e do médico." }, { status: 409 });
    }

    if (doctorId !== session.doctorId) {
      return NextResponse.json({ error: "Você não tem permissão para abrir este prontuário." }, { status: 403 });
    }

    let record = await MedicalRecord.findOne({ appointmentId: appointment._id });
    if (!record) {
      record = await MedicalRecord.create({
        patientId,
        doctorId,
        appointmentId: appointment._id,
        status: "EM_ATENDIMENTO",
        auditTrail: [buildAuditEntry("CREATE", session, "Prontuário iniciado a partir da agenda.")],
      });
    } else {
      record.status = record.status === "FINALIZADO" ? record.status : "EM_ATENDIMENTO";
      record.auditTrail.push(buildAuditEntry("OPEN", session, "Prontuário reaberto para atendimento."));
      await record.save();
    }

    if (appointment.status !== "EM_ATENDIMENTO" && appointment.status !== "FINALIZADA") {
      appointment.status = "EM_ATENDIMENTO";
      await appointment.save();
    }

    const context = await loadAppointmentContext(appointmentId);
    const clinicSettings = await ClinicSettings.findOne().lean();

    return NextResponse.json({
      user: session,
      clinicSettings,
      ...context,
      record: context?.record || record,
      startedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erro ao iniciar prontuario:", error);
    const message = error instanceof Error ? error.message : "Falha ao abrir prontuario.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

