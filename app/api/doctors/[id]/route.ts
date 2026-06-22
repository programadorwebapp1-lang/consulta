import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import Doctor from "@/models/Doctor";
import Schedule from "@/models/Schedule";
import Appointment from "@/models/Appointment";
import User from "@/models/User";
import { deleteImageFromCloudinary, uploadImageToCloudinary, validateImageFile } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DOCTOR_IMAGE_FOLDER = "consultorio/medicos";

function getBodyValue(body: FormData | Record<string, unknown> | null, key: string) {
  if (!body) return undefined;
  if (body instanceof FormData) return body.get(key);
  return body[key];
}

function parseSpecialtyIds(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }

  return [];
}

async function readPayload(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    return req.formData();
  }

  return req.json().catch(() => null);
}

async function resolvePhoto(body: FormData | Record<string, unknown> | null, previousPhotoUrl = "") {
  const removePhoto = String(getBodyValue(body, "removePhoto") || "").toLowerCase() === "true";
  const photoEntry = getBodyValue(body, "photo");

  if (removePhoto) {
    if (previousPhotoUrl) {
      await deleteImageFromCloudinary(previousPhotoUrl);
    }
    return "";
  }

  if (photoEntry instanceof File && photoEntry.size > 0) {
    validateImageFile(photoEntry);
    const uploaded = await uploadImageToCloudinary(photoEntry, DOCTOR_IMAGE_FOLDER);
    if (previousPhotoUrl) {
      await deleteImageFromCloudinary(previousPhotoUrl);
    }
    return uploaded.secureUrl;
  }

  if (previousPhotoUrl.startsWith("data:")) {
    return "";
  }

  return previousPhotoUrl;
}

export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  const session = await getSessionUser(req);
  const { id } = context.params;

  if (!session || (session.role !== "ADMIN" && !(session.role === "MEDICO" && session.doctorId === id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await readPayload(req);
  if (!body) return NextResponse.json({ error: "Payload invalido." }, { status: 400 });

  await connectMongo();
  const doctorBeforeUpdate = await Doctor.findById(id).lean();
  if (!doctorBeforeUpdate) {
    return NextResponse.json({ error: "Medico nao encontrado." }, { status: 404 });
  }

  const updatePayload: Record<string, unknown> = {};
  const hasField = (key: string) => {
    if (body instanceof FormData) return body.has(key);
    return Object.prototype.hasOwnProperty.call(body, key);
  };

  if (hasField("name")) updatePayload.name = String(getBodyValue(body, "name") || "").trim();
  if (hasField("phone")) updatePayload.phone = String(getBodyValue(body, "phone") || "").trim();
  if (hasField("bio")) updatePayload.bio = String(getBodyValue(body, "bio") || "");
  if (hasField("consultationPrice")) {
    const value = String(getBodyValue(body, "consultationPrice") || "").trim();
    const parsed = Number(value);
    updatePayload.consultationPrice = value === "" ? null : Number.isFinite(parsed) ? parsed : null;
  }
  if (session.role === "ADMIN") {
    if (hasField("crm")) updatePayload.crm = String(getBodyValue(body, "crm") || "").trim();
    if (hasField("specialtyIds")) {
      const specialtyIds = parseSpecialtyIds(getBodyValue(body, "specialtyIds"));
      if (specialtyIds.length > 0) {
        updatePayload.specialtyIds = specialtyIds;
        updatePayload.specialtyId = specialtyIds[0];
      }
    } else if (hasField("specialtyId")) {
      const specialtyId = String(getBodyValue(body, "specialtyId") || "").trim();
      if (specialtyId) {
        updatePayload.specialtyId = specialtyId;
        updatePayload.specialtyIds = [specialtyId];
      }
    }
    if (hasField("email")) updatePayload.email = String(getBodyValue(body, "email") || "").trim().toLowerCase();
    if (hasField("active")) {
      const active = String(getBodyValue(body, "active") ?? "true") !== "false";
      updatePayload.active = active;
      updatePayload.status = active ? "ATIVO" : "INATIVO";
    }
    if (hasField("status")) {
      const status = String(getBodyValue(body, "status") || "ATIVO");
      updatePayload.status = status;
      updatePayload.active = status === "ATIVO";
    }
  }

  try {
    const nextPhotoUrl = await resolvePhoto(body, String(doctorBeforeUpdate.photoUrl || ""));
    updatePayload.photoUrl = nextPhotoUrl;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nao foi possivel processar a foto." }, { status: 400 });
  }

  const doctor = await Doctor.findByIdAndUpdate(id, updatePayload, { new: true });
  if (!doctor) return NextResponse.json({ error: "Medico nao encontrado." }, { status: 404 });

  if (doctor.userId) {
    await User.findByIdAndUpdate(doctor.userId, {
      name: doctor.name,
      email: doctor.email,
    });
  }

  const schedulePayloadRaw = getBodyValue(body, "schedule");
  if (schedulePayloadRaw) {
    const schedule =
      typeof schedulePayloadRaw === "string"
        ? (() => {
            try {
              return JSON.parse(schedulePayloadRaw);
            } catch {
              return null;
            }
          })()
        : schedulePayloadRaw;

    if (schedule) {
      await Schedule.findOneAndUpdate({ doctorId: doctor._id }, { doctorId: doctor._id, ...schedule }, { upsert: true, new: true });
    }
  }

  return NextResponse.json({ doctor });
}

export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = context.params;
  await connectMongo();
  const hasAppointments = await Appointment.exists({ doctorId: id });
  const doctor = await Doctor.findByIdAndUpdate(id, { active: false, status: "INATIVO" }, { new: true });
  if (!doctor) return NextResponse.json({ error: "Medico nao encontrado." }, { status: 404 });

  return NextResponse.json({
    ok: true,
    softDeleted: true,
    linkedAppointments: Boolean(hasAppointments),
    doctor,
  });
}
