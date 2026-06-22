import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import Doctor from "@/models/Doctor";
import Schedule from "@/models/Schedule";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { deleteImageFromCloudinary, uploadImageToCloudinary, validateImageFile } from "@/lib/cloudinary";
import { purgeLegacyDoctorPhotoUrls } from "@/lib/doctor-media";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DOCTOR_IMAGE_FOLDER = "consultorio/medicos";

function getBodyValue(body: FormData | Record<string, unknown> | null, key: string) {
  if (!body) return undefined;
  if (body instanceof FormData) return body.get(key);
  return body[key];
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

function parseAvailableDays(value: string) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectMongo();
  await purgeLegacyDoctorPhotoUrls();
  const doctors = await Doctor.find().populate("specialtyId").lean();
  return NextResponse.json({ doctors });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectMongo();
  const body = await readPayload(req);
  const name = String(getBodyValue(body, "name") || "").trim();
  const crm = String(getBodyValue(body, "crm") || "").trim();
  const specialtyId = String(getBodyValue(body, "specialtyId") || "").trim();
  const email = String(getBodyValue(body, "email") || "").trim().toLowerCase();
  const password = String(getBodyValue(body, "password") || "");
  const phone = String(getBodyValue(body, "phone") || "").trim();
  const bio = String(getBodyValue(body, "bio") || "");
  const consultationPriceRaw = getBodyValue(body, "consultationPrice");
  const specialtyIds = parseSpecialtyIds(getBodyValue(body, "specialtyIds"));
  const active = String(getBodyValue(body, "active") ?? "true") !== "false";
  const availableDaysRaw = String(getBodyValue(body, "availableDays") || "[]");
  const startTime = String(getBodyValue(body, "startTime") || "08:00");
  const endTime = String(getBodyValue(body, "endTime") || "18:00");
  const slotDuration = Number(getBodyValue(body, "slotDuration") || 30);

  if (!name || !crm || !email) {
    return NextResponse.json({ error: "Nome, CRM e e-mail são obrigatórios." }, { status: 400 });
  }

  const resolvedSpecialtyIds = specialtyIds.length ? specialtyIds : specialtyId ? [specialtyId] : [];
  if (!resolvedSpecialtyIds.length) {
    return NextResponse.json({ error: "Selecione ao menos uma especialidade." }, { status: 400 });
  }

  if (!password) {
    return NextResponse.json({ error: "Senha do médico é obrigatória." }, { status: 400 });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 });
  }

  let photoUrl = "";
  try {
    photoUrl = await resolvePhoto(body);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nao foi possivel processar a foto." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const parsedConsultationPrice = Number(consultationPriceRaw);

  try {
    const doctor = await Doctor.create({
      name,
      email,
      phone,
      crm,
      specialtyId: resolvedSpecialtyIds[0],
      specialtyIds: resolvedSpecialtyIds,
      photoUrl,
      bio,
      consultationPrice:
        consultationPriceRaw === undefined || consultationPriceRaw === null || consultationPriceRaw === ""
          ? null
          : Number.isFinite(parsedConsultationPrice)
            ? parsedConsultationPrice
            : null,
      status: active ? "ATIVO" : "INATIVO",
      active,
    });

    const user = await User.create({
      name,
      email,
      passwordHash,
      role: "MEDICO",
      doctorId: doctor._id,
    });

    doctor.userId = user._id;
    doctor.email = user.email;
    await doctor.save();

    await Schedule.findOneAndUpdate(
      { doctorId: doctor._id },
      {
        doctorId: doctor._id,
        availableDays: parseAvailableDays(availableDaysRaw),
        startTime,
        endTime,
        slotDuration,
        blockedDates: [],
        blockedSlots: [],
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ doctor, user }, { status: 201 });
  } catch (error) {
    if (photoUrl) {
      await deleteImageFromCloudinary(photoUrl);
    }
    const message = error instanceof Error ? error.message : "Nao foi possivel cadastrar o medico.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
