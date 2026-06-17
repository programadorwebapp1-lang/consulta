import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import Specialty from "@/models/Specialty";
import Appointment from "@/models/Appointment";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = context.params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });

  await connectMongo();
  const specialty = await Specialty.findByIdAndUpdate(id, { ...body }, { new: true });
  if (!specialty) return NextResponse.json({ error: "Especialidade não encontrada." }, { status: 404 });
  return NextResponse.json({ specialty });
}

export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = context.params;
  await connectMongo();
  const hasAppointments = await Appointment.exists({ specialtyId: id });
  const specialty = await Specialty.findByIdAndUpdate(id, { active: false }, { new: true });
  if (!specialty) return NextResponse.json({ error: "Especialidade não encontrada." }, { status: 404 });

  return NextResponse.json({
    ok: true,
    softDeleted: true,
    linkedAppointments: Boolean(hasAppointments),
    specialty,
  });
}
