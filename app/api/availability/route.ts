import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import Doctor from "@/models/Doctor";
import Schedule from "@/models/Schedule";
import Appointment from "@/models/Appointment";
import Specialty from "@/models/Specialty";
import { generateAvailableSlots, isPastDate } from "@/lib/medical";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectMongo();

  const specialtyId = req.nextUrl.searchParams.get("specialtyId") || "";
  const doctorId = req.nextUrl.searchParams.get("doctorId") || "";
  const startDate = req.nextUrl.searchParams.get("startDate") || new Date().toISOString().split("T")[0];
  const days = Math.min(Number(req.nextUrl.searchParams.get("days") || 30), 90);
  const date = req.nextUrl.searchParams.get("date") || "";

  const specialties = specialtyId ? await Specialty.find({ _id: specialtyId, active: true }).lean() : [];
  const doctors = await Doctor.find(
    specialtyId ? { active: true, $or: [{ specialtyId }, { specialtyIds: specialtyId }] } : { active: true }
  )
    .populate("specialtyId")
    .lean();

  const filteredDoctors = doctorId ? doctors.filter((doctor) => String(doctor._id) === String(doctorId)) : doctors;

  if (!doctorId) {
    return NextResponse.json({ specialties, doctors: filteredDoctors });
  }

  const schedule = await Schedule.findOne({ doctorId }).lean();
  if (!schedule) {
    return NextResponse.json({ specialties, doctors: filteredDoctors, schedule: null, availableDates: [], slots: [] });
  }

  const rangeAppointments = await Appointment.find({
    doctorId,
    status: { $ne: "CANCELADA" },
    date: { $gte: startDate },
  })
    .select("date time")
    .lean();

  const bookedByDate = new Map<string, string[]>();
  for (const item of rangeAppointments) {
    const list = bookedByDate.get(item.date) || [];
    list.push(item.time);
    bookedByDate.set(item.date, list);
  }

  const availableDates: string[] = [];
  const start = new Date(`${startDate}T12:00:00`);

  for (let index = 0; index < days; index += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    const currentDate = current.toISOString().split("T")[0];
    if (isPastDate(currentDate)) continue;
    const slots = generateAvailableSlots(schedule, currentDate, bookedByDate.get(currentDate) || []);
    if (slots.length > 0) {
      availableDates.push(currentDate);
    }
  }

  const slots = date ? generateAvailableSlots(schedule, date, bookedByDate.get(date) || []) : [];

  return NextResponse.json({
    specialties,
    doctors: filteredDoctors,
    schedule,
    availableDates,
    slots,
  });
}
