import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import Schedule from "@/models/Schedule";
import Doctor from "@/models/Doctor";
import { isDateBlocked, isSlotBlocked, isWithinWorkingHours } from "@/lib/medical";
import Appointment from "@/models/Appointment";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function resolveDoctor(req: NextRequest, sessionRole: string, doctorId?: string) {
  if (sessionRole === "MEDICO") return doctorId;
  return doctorId;
}

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectMongo();
  const doctorId = session.role === "MEDICO" ? session.doctorId : req.nextUrl.searchParams.get("doctorId");
  if (!doctorId) return NextResponse.json({ schedule: null });

  const schedule = await Schedule.findOne({ doctorId }).lean();
  return NextResponse.json({ schedule });
}

export async function PUT(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "MEDICO") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectMongo();
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });

  const doctor = await Doctor.findById(session.doctorId);
  if (!doctor) return NextResponse.json({ error: "Médico não encontrado." }, { status: 404 });

  const schedule = await Schedule.findOneAndUpdate(
    { doctorId: doctor._id },
    {
      doctorId: doctor._id,
      availableDays: Array.isArray(body.availableDays) ? body.availableDays : [],
      startTime: body.startTime || "08:00",
      endTime: body.endTime || "18:00",
      slotDuration: Number(body.slotDuration || 30),
      lunchStart: body.lunchStart || "",
      lunchEnd: body.lunchEnd || "",
      blockedDates: body.blockedDates || [],
      vacationDates: body.vacationDates || [],
      blockedSlots: body.blockedSlots || [],
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({ schedule });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "MEDICO") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectMongo();
  const body = await req.json().catch(() => null);
  if (!body?.type || !body?.date) {
    return NextResponse.json({ error: "Tipo e data são obrigatórios." }, { status: 400 });
  }

  let schedule = await Schedule.findOne({ doctorId: session.doctorId });
  if (!schedule) {
    schedule = await Schedule.create({
      doctorId: session.doctorId,
      availableDays: [],
      startTime: "08:00",
      endTime: "18:00",
      slotDuration: 30,
      lunchStart: "",
      lunchEnd: "",
      blockedDates: [],
      vacationDates: [],
      blockedSlots: [],
    });
  }

  if (body.type === "DATE" || body.type === "VACATION") {
    if (schedule.blockedDates.some((item: { date: string }) => item.date === body.date)) {
      return NextResponse.json({ error: "Data já bloqueada." }, { status: 409 });
    }
    if (body.type === "VACATION") {
      if (schedule.vacationDates.some((item: { date: string }) => item.date === body.date)) {
        return NextResponse.json({ error: "Data de férias já cadastrada." }, { status: 409 });
      }
      schedule.vacationDates.push({ date: body.date, reason: body.reason || "" });
    } else {
      schedule.blockedDates.push({ date: body.date, reason: body.reason || "" });
    }
  } else {
    if (!body.time) return NextResponse.json({ error: "Horário é obrigatório." }, { status: 400 });
    if (schedule.blockedSlots.some((item: { date: string; time: string }) => item.date === body.date && item.time === body.time)) {
      return NextResponse.json({ error: "Horário já bloqueado." }, { status: 409 });
    }
    if (!isWithinWorkingHours(schedule.startTime, schedule.endTime, schedule.slotDuration, body.time)) {
      return NextResponse.json({ error: "Horário fora do atendimento configurado." }, { status: 409 });
    }
    schedule.blockedSlots.push({ date: body.date, time: body.time, reason: body.reason || "" });
  }

  await schedule.save();
  return NextResponse.json({ schedule });
}
