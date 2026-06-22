import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import User from "@/models/User";
import Doctor from "@/models/Doctor";
import Patient from "@/models/Patient";
import Specialty from "@/models/Specialty";
import Schedule from "@/models/Schedule";
import Appointment from "@/models/Appointment";
import ClinicSettings from "@/models/ClinicSettings";
import { purgeLegacyDoctorPhotoUrls } from "@/lib/doctor-media";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectMongo();

  if (session.role === "ADMIN") {
    await purgeLegacyDoctorPhotoUrls();
    const [users, doctors, patients, specialties, schedules, appointments, clinicSettings] = await Promise.all([
      User.find({ role: { $in: ["ADMIN", "MEDICO"] } })
        .select("name email role active")
        .sort({ role: 1, name: 1 })
        .lean(),
      Doctor.find().populate("specialtyId").lean(),
      Patient.find().lean(),
      Specialty.find().lean(),
      Schedule.find().lean(),
      Appointment.find().populate("doctorId").populate("patientId").populate("specialtyId").lean(),
      ClinicSettings.findOne().lean(),
    ]);

    return NextResponse.json({
      user: session,
      users,
      doctors,
      patients,
      specialties,
      schedules,
      appointments,
      clinicSettings,
    });
  }

  if (session.role === "MEDICO") {
    await purgeLegacyDoctorPhotoUrls();
    const clinicSettings = await ClinicSettings.findOne().lean();
    const doctor = await Doctor.findById(session.doctorId).populate("specialtyId").lean();
    const schedule = doctor ? await Schedule.findOne({ doctorId: doctor._id }).lean() : null;
    const appointments = doctor
      ? await Appointment.find({ doctorId: doctor._id }).populate("patientId").populate("specialtyId").lean()
      : [];

    return NextResponse.json({
      user: session,
      doctor,
      schedule,
      appointments,
      clinicSettings,
    });
  }

  const patient = await Patient.findById(session.patientId).lean();
  const specialties = await Specialty.find({ active: true }).lean();
  await purgeLegacyDoctorPhotoUrls();
  const doctors = await Doctor.find({ active: true, status: { $ne: "INATIVO" } }).populate("specialtyId").lean();
  const schedules = await Schedule.find({ doctorId: { $in: doctors.map((doctor) => doctor._id) } }).lean();
  const appointments = patient
    ? await Appointment.find({ patientId: patient._id }).populate("doctorId").populate("specialtyId").lean()
    : [];

  return NextResponse.json({
    user: session,
    patient,
    specialties,
    doctors,
    schedules,
    appointments,
    clinicSettings: await ClinicSettings.findOne().lean(),
  });
}
