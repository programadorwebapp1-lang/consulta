import { connectMongo } from "./mongodb";
import Appointment from "@/models/Appointment";
import Doctor from "@/models/Doctor";
import Patient from "@/models/Patient";
import Specialty from "@/models/Specialty";
import { sendBotClinicaMessage } from "./bot-clinica";

type ReminderTarget = {
  _id: string;
  patientPhone: string;
  patientName: string;
  doctorName: string;
  specialtyName: string;
  appointmentDate: string;
  appointmentTime: string;
};

type ReminderRunResult = {
  scanned: number;
  sent: number;
  skipped: number;
  failed: number;
  errors: Array<{ appointmentId: string; reason: string }>;
};

const REMINDER_WINDOW_MINUTES = Number(process.env.APPOINTMENT_REMINDER_WINDOW_MINUTES ?? 180);

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toLocalDateString(value: Date) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function parseLocalAppointment(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);

  if (!year || !month || !day || Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

function normalizePhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) {
    return digits;
  }
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

function formatAppointmentDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function getClinicName() {
  return process.env.CLINIC_NAME?.trim() || process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Clínica";
}

function buildReminderMessage(input: ReminderTarget) {
  const clinicName = getClinicName();

  return [
    `Olá, ${input.patientName}! Aqui é da ${clinicName}.`,
    "",
    `Você tem uma consulta com ${input.doctorName}, especialidade ${input.specialtyName}, no dia ${formatAppointmentDate(input.appointmentDate)} às ${input.appointmentTime}.`,
    "",
    "Caso não possa comparecer, entre em contato com a clínica.",
  ].join("\n");
}

async function findDueAppointments() {
  const now = new Date();
  const horizon = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60 * 1000);
  const startDate = toLocalDateString(now);
  const endDate = toLocalDateString(horizon);

  return Appointment.find({
    date: { $gte: startDate, $lte: endDate },
    status: { $in: ["AGENDADA", "CONFIRMADA"] },
    reminderSentAt: null,
  })
    .sort({ date: 1, time: 1 })
    .populate("doctorId")
    .populate("patientId")
    .populate("specialtyId")
    .lean()
    .exec();
}

function extractReminderTarget(appointment: Record<string, any>): ReminderTarget | null {
  const doctor = appointment.doctorId;
  const patient = appointment.patientId;
  const specialty = appointment.specialtyId;

  const reminderDateTime = parseLocalAppointment(String(appointment.date ?? ""), String(appointment.time ?? ""));
  if (!reminderDateTime) {
    return null;
  }

  const now = new Date();
  const diffMs = reminderDateTime.getTime() - now.getTime();
  if (diffMs < 0 || diffMs > REMINDER_WINDOW_MINUTES * 60 * 1000) {
    return null;
  }

  const patientPhone = normalizePhoneNumber(String(patient?.phone ?? ""));
  if (!patientPhone || patientPhone.length < 12) {
    return null;
  }

  return {
    _id: String(appointment._id),
    patientPhone,
    patientName: String(patient?.name ?? "Paciente"),
    doctorName: String(doctor?.name ?? "Médico"),
    specialtyName: String(specialty?.name ?? "Especialidade"),
    appointmentDate: String(appointment.date ?? ""),
    appointmentTime: String(appointment.time ?? ""),
  };
}

export function buildAppointmentReminderPreview(input: ReminderTarget) {
  return buildReminderMessage(input);
}

export async function runAppointmentReminderSweep(): Promise<ReminderRunResult> {
  await connectMongo();

  const appointments = await findDueAppointments();
  const result: ReminderRunResult = {
    scanned: appointments.length,
    sent: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const appointment of appointments) {
    const target = extractReminderTarget(appointment);
    if (!target) {
      result.skipped += 1;
      continue;
    }

    const message = buildReminderMessage(target);

    try {
      const response = await sendBotClinicaMessage({
        number: target.patientPhone,
        message,
      });

      if (!response.ok) {
        const reason = typeof response.body === "object" && response.body !== null && "error" in response.body
          ? String((response.body as Record<string, unknown>).error)
          : `Bot clínico respondeu com status ${response.status}`;
        await Appointment.updateOne(
          { _id: target._id },
          {
            $set: {
              reminderLastError: reason,
            },
          }
        ).exec();
        result.failed += 1;
        result.errors.push({ appointmentId: target._id, reason });
        continue;
      }

      await Appointment.updateOne(
        { _id: target._id },
        {
          $set: {
            reminderSentAt: new Date(),
            reminderLastError: null,
            reminderPayloadSent: true,
          },
        }
      ).exec();

      result.sent += 1;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Falha ao enviar lembrete";
      await Appointment.updateOne(
        { _id: target._id },
        {
          $set: {
            reminderLastError: reason,
          },
        }
      ).exec();
      result.failed += 1;
      result.errors.push({ appointmentId: target._id, reason });
    }
  }

  return result;
}

export const reminderSchedulerConfig = {
  intervalMs: Number(process.env.APPOINTMENT_REMINDER_SWEEP_INTERVAL_MS ?? 5 * 60 * 1000),
  enabled: process.env.APPOINTMENT_REMINDER_SWEEP_ENABLED !== "false",
};
