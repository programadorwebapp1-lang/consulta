import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import Doctor from "@/models/Doctor";
import Specialty from "@/models/Specialty";
import ClinicSettings from "@/models/ClinicSettings";
import { purgeLegacyDoctorPhotoUrls } from "@/lib/doctor-media";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "PACIENTE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectMongo();
  await purgeLegacyDoctorPhotoUrls();

  const [specialties, doctors, clinicSettings] = await Promise.all([
    Specialty.find({ active: true }).lean(),
    Doctor.find({ active: true, status: { $ne: "INATIVO" } }).populate(["specialtyId", "specialtyIds"]).lean(),
    ClinicSettings.findOne().lean(),
  ]);

  return NextResponse.json({
    user: session,
    specialties,
    doctors,
    clinicSettings,
  });
}
