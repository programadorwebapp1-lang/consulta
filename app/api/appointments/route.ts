import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import Appointment from "@/models/Appointment";
import Doctor from "@/models/Doctor";
import Patient from "@/models/Patient";
import Specialty from "@/models/Specialty";
import Schedule from "@/models/Schedule";
import { generateAvailableSlots, isPastDate } from "@/lib/medical";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function canBook(doctorId: string, date: string, time: string, excludeAppointmentId?: string) {
  if (isPastDate(date)) return { ok: false, message: "Não é permitido agendar em datas passadas." };

  const doctor = await Doctor.findById(doctorId);
  if (!doctor || !doctor.active) return { ok: false, message: "Médico indisponível." };

  const specialty = await Specialty.findById(doctor.specialtyId);
  if (!specialty || !specialty.active) return { ok: false, message: "Especialidade indisponível." };

  const schedule = await Schedule.findOne({ doctorId });
  if (!schedule) return { ok: false, message: "Agenda não configurada." };

  const availableSlots = generateAvailableSlots(schedule.toObject?.() || schedule, date, []);
  if (!availableSlots.includes(time)) {
    return { ok: false, message: "Horário fora da agenda do médico." };
  }

  const conflictFilter: Record<string, unknown> = {
    doctorId,
    date,
    time,
    status: { $ne: "CANCELADA" },
  };

  if (excludeAppointmentId) {
    conflictFilter._id = { $ne: excludeAppointmentId };
  }

  const conflict = await Appointment.exists(conflictFilter);
  if (conflict) return { ok: false, message: "Já existe um agendamento nesse horário." };

  return { ok: true, doctor, schedule, specialty };
}

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectMongo();
  if (session.role === "ADMIN") {
    const appointments = await Appointment.find().populate("doctorId").populate("patientId").populate("specialtyId").lean();
    return NextResponse.json({ appointments });
  }

  if (session.role === "MEDICO") {
    const appointments = await Appointment.find({ doctorId: session.doctorId }).populate("doctorId").populate("patientId").populate("specialtyId").lean();
    return NextResponse.json({ appointments });
  }

  const appointments = await Appointment.find({ patientId: session.patientId }).populate("doctorId").populate("patientId").populate("specialtyId").lean();
  return NextResponse.json({ appointments });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "PACIENTE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectMongo();
  const body = await req.json().catch(() => null);
  if (!body?.doctorId || !body?.date || !body?.time) {
    return NextResponse.json({ error: "Médico, data e horário são obrigatórios." }, { status: 400 });
  }

  const patient = await Patient.findById(session.patientId);
  if (!patient) return NextResponse.json({ error: "Paciente não encontrado." }, { status: 404 });

  const validation = await canBook(body.doctorId, body.date, body.time);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 409 });
  }

  const allowedSpecialties = new Set(
    [
      String(validation.doctor.specialtyId),
      ...(Array.isArray(validation.doctor.specialtyIds)
        ? validation.doctor.specialtyIds.map((item: unknown) => String(item))
        : []),
    ].filter(Boolean)
  );

  if (!allowedSpecialties.has(String(body.specialtyId))) {
    return NextResponse.json({ error: "Especialidade não corresponde ao médico selecionado." }, { status: 409 });
  }

  const appointment = await Appointment.create({
    doctorId: body.doctorId,
    patientId: patient._id,
    specialtyId: body.specialtyId,
    date: body.date,
    time: body.time,
    status: "AGENDADA",
    notes: body.notes || "",
  });

  return NextResponse.json({ appointment }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "PACIENTE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectMongo();
  const body = await req.json().catch(() => null);
  if (!body?.appointmentId || !body?.date || !body?.time) {
    return NextResponse.json({ error: "Consulta, data e horário são obrigatórios." }, { status: 400 });
  }

  const current = await Appointment.findById(body.appointmentId);
  if (!current || String(current.patientId) !== session.patientId) {
    return NextResponse.json({ error: "Consulta não encontrada." }, { status: 404 });
  }

  const previous = {
    appointmentId: current._id,
    date: current.date,
    time: current.time,
  };

  const validation = await canBook(String(current.doctorId), body.date, body.time, String(current._id));
  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 409 });
  }

  current.date = body.date;
  current.time = body.time;
  current.rescheduledFrom = previous as never;
  current.reminderSentAt = null;
  current.reminderLastError = null;
  current.reminderPayloadSent = false;
  await current.save();

  return NextResponse.json({ appointment: current });
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectMongo();
  const body = await req.json().catch(() => null);
  if (!body?.appointmentId || !body?.status) {
    return NextResponse.json({ error: "Consulta e status são obrigatórios." }, { status: 400 });
  }

  const appointment = await Appointment.findById(body.appointmentId);
  if (!appointment) return NextResponse.json({ error: "Consulta não encontrada." }, { status: 404 });

  if (session.role === "MEDICO" && String(appointment.doctorId) !== session.doctorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.role === "PACIENTE" && String(appointment.patientId) !== session.patientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.role === "ADMIN" || session.role === "MEDICO" || session.role === "PACIENTE") {
    appointment.status = body.status;
    if (typeof body.notes === "string") {
      appointment.notes = body.notes;
    }
  }
  await appointment.save();
  return NextResponse.json({ appointment });
}
