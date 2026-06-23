import MedicalCertificate from "@/models/MedicalCertificate";
import MedicalRecord from "@/models/MedicalRecord";
import Prescription from "@/models/Prescription";
import ExamRequest from "@/models/ExamRequest";
import Referral from "@/models/Referral";
import Schedule from "@/models/Schedule";
import Appointment from "@/models/Appointment";
import { calculateAge, formatDateBR, formatDateTimeBR, splitList } from "./medical-records";
import { generateAvailableSlots } from "./medical";

function resolveObjectId(value: any) {
  return String(value?._id || value || "");
}

export function parseMedicalRecordPayload(body: Record<string, unknown>) {
  return {
    chiefComplaint: String(body.chiefComplaint || ""),
    historyOfPresentIllness: String(body.historyOfPresentIllness || ""),
    medicalHistory: {
      previousDiseases: String((body.medicalHistory as Record<string, unknown> | undefined)?.previousDiseases || ""),
      surgeries: String((body.medicalHistory as Record<string, unknown> | undefined)?.surgeries || ""),
      hospitalizations: String((body.medicalHistory as Record<string, unknown> | undefined)?.hospitalizations || ""),
      previousTreatments: String((body.medicalHistory as Record<string, unknown> | undefined)?.previousTreatments || ""),
    },
    allergies: String(body.allergies || ""),
    currentMedications: splitList(body.currentMedications as string | string[] | undefined),
    familyHistory: String(body.familyHistory || ""),
    lifestyle: {
      smoker: Boolean((body.lifestyle as Record<string, unknown> | undefined)?.smoker),
      exSmoker: Boolean((body.lifestyle as Record<string, unknown> | undefined)?.exSmoker),
      alcohol: Boolean((body.lifestyle as Record<string, unknown> | undefined)?.alcohol),
      physicalActivity: Boolean((body.lifestyle as Record<string, unknown> | undefined)?.physicalActivity),
      notes: String((body.lifestyle as Record<string, unknown> | undefined)?.notes || ""),
    },
    physicalExam: String(body.physicalExam || ""),
    assessment: String(body.assessment || ""),
    diagnosis: String(body.diagnosis || ""),
    conduct: String(body.conduct || ""),
    notes: String(body.notes || ""),
    status: String(body.status || "ABERTO"),
    returnDate: String(body.returnDate || ""),
    returnType: String(body.returnType || ""),
  };
}

export async function loadMedicalRecordDetails(recordId: string) {
  const record = await MedicalRecord.findById(recordId)
    .populate("patientId")
    .populate("doctorId")
    .populate({ path: "appointmentId", populate: "specialtyId" })
    .lean();

  if (!record) return null;

  const [prescriptions, certificates, examRequests, referrals] = await Promise.all([
    Prescription.find({ medicalRecordId: recordId }).sort({ createdAt: -1 }).lean(),
    MedicalCertificate.find({ medicalRecordId: recordId }).sort({ createdAt: -1 }).lean(),
    ExamRequest.find({ medicalRecordId: recordId }).sort({ createdAt: -1 }).lean(),
    Referral.find({ medicalRecordId: recordId }).sort({ createdAt: -1 }).lean(),
  ]);

  return {
    record,
    documents: {
      prescriptions,
      certificates,
      examRequests,
      referrals,
    },
  };
}

export async function loadPatientHistory(patientId: string, currentRecordId?: string) {
  const history = await MedicalRecord.find({
    patientId,
    ...(currentRecordId ? { _id: { $ne: currentRecordId } } : {}),
  })
    .sort({ createdAt: -1 })
    .populate("doctorId")
    .populate({ path: "appointmentId", populate: "specialtyId" })
    .lean();

  return Promise.all(
    history.map(async (record) => {
      const [prescriptions, certificates, examRequests, referrals] = await Promise.all([
        Prescription.find({ medicalRecordId: record._id }).select("_id createdAt pdfUrl").lean(),
        MedicalCertificate.find({ medicalRecordId: record._id }).select("_id createdAt pdfUrl").lean(),
        ExamRequest.find({ medicalRecordId: record._id }).select("_id createdAt pdfUrl").lean(),
        Referral.find({ medicalRecordId: record._id }).select("_id createdAt pdfUrl").lean(),
      ]);

      return {
        ...record,
        documents: {
          prescriptions,
          certificates,
          examRequests,
          referrals,
        },
      };
    })
  );
}

export async function loadAppointmentContext(appointmentId: string) {
  const appointment = await Appointment.findById(appointmentId)
    .populate("patientId")
    .populate("doctorId")
    .populate("specialtyId")
    .lean();

  if (!appointment) return null;

  const record = await MedicalRecord.findOne({ appointmentId: String(appointment._id) })
    .populate("patientId")
    .populate("doctorId")
    .populate({ path: "appointmentId", populate: "specialtyId" })
    .lean();

  const doctorId = resolveObjectId(appointment.doctorId);
  const patientId = resolveObjectId(appointment.patientId);
  const schedule = await Schedule.findOne({ doctorId }).lean();
  const bookedAppointments = await Appointment.find({
    doctorId,
    status: { $ne: "CANCELADA" },
  })
    .select("date time")
    .lean();

  const availableReturnDates: Array<{ date: string; label: string }> = [];
  if (schedule) {
    const today = new Date();
    for (let offset = 7; offset <= 45; offset += 1) {
      const current = new Date(today);
      current.setDate(today.getDate() + offset);
      const date = current.toISOString().split("T")[0];
      const bookedTimes = bookedAppointments.filter((item) => String(item.date) === date).map((item) => String(item.time));
      if (generateAvailableSlots(schedule as any, date, bookedTimes).length > 0) {
        availableReturnDates.push({ date, label: formatDateBR(date) });
      }
      if (availableReturnDates.length >= 12) break;
    }
  }

  const history = await loadPatientHistory(patientId, record?._id?.toString?.());
  const details = record ? await loadMedicalRecordDetails(String(record._id)) : null;

  return {
    appointment,
    patient: appointment.patientId || null,
    doctor: appointment.doctorId || null,
    specialty: appointment.specialtyId || null,
    record: details?.record || record || null,
    documents: details?.documents || {
      prescriptions: [],
      certificates: [],
      examRequests: [],
      referrals: [],
    },
    history,
    availableReturnDates,
  };
}

export function buildPatientSnapshot(patient: Record<string, any> | null | undefined) {
  if (!patient) return null;
  return {
    name: String(patient.name || ""),
    birthDate: String(patient.birthDate || ""),
    age: calculateAge(String(patient.birthDate || "")),
    gender: String(patient.gender || ""),
    phone: String(patient.phone || ""),
    email: String(patient.email || ""),
    bloodType: String(patient.bloodType || ""),
    allergies: String(patient.allergies || ""),
    currentMedications: String(patient.currentMedications || ""),
    chronicDiseases: String(patient.chronicDiseases || ""),
    emergencyContact: String(patient.emergencyContact || ""),
    emergencyPhone: String(patient.emergencyPhone || ""),
  };
}

export function buildAppointmentSnapshot(appointment: Record<string, any> | null | undefined) {
  if (!appointment) return null;
  return {
    date: String(appointment.date || ""),
    time: String(appointment.time || ""),
    status: String(appointment.status || ""),
    createdAt: formatDateTimeBR(appointment.createdAt),
  };
}

export async function loadReturnSuggestions(doctorId: string, baseDate: string) {
  const schedule = await Schedule.findOne({ doctorId }).lean();
  if (!schedule) return [];

  const dates = [7, 15, 30].map((days) => {
    const target = new Date(`${baseDate}T12:00:00`);
    target.setDate(target.getDate() + days);
    return target.toISOString().split("T")[0];
  });

  return dates.map((date) => ({
    date,
    label: formatDateBR(date),
    schedule,
  }));
}
