import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import ClinicSettings from "@/models/ClinicSettings";
import { deleteImageFromCloudinary, uploadImageToCloudinary, validateImageFile } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SETTINGS_FOLDER = "consultorio/publico";

function getBodyValue(body: FormData | Record<string, unknown> | null, key: string) {
  if (!body) return undefined;
  if (body instanceof FormData) return body.get(key);
  return body[key];
}

function asString(value: unknown) {
  return String(value ?? "").trim();
}

function parseJsonArray(value: unknown) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isUploadFile(value: unknown): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "size" in value &&
    "type" in value &&
    "arrayBuffer" in value
  );
}

async function readPayload(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    return req.formData();
  }
  return req.json().catch(() => null);
}

async function uploadMaybeImage(body: FormData | Record<string, unknown> | null, key: string, currentUrl = "") {
  const entry = getBodyValue(body, key);
  if (isUploadFile(entry) && entry.size > 0) {
    validateImageFile(entry);
    const uploaded = await uploadImageToCloudinary(entry, SETTINGS_FOLDER);
    if (currentUrl) {
      await deleteImageFromCloudinary(currentUrl);
    }
    return uploaded.secureUrl;
  }
  return currentUrl;
}

export async function GET() {
  await connectMongo();
  const settings = (await ClinicSettings.findOne().lean()) || null;
  return NextResponse.json({
    clinicSettings:
      settings || {
        clinicName: "MediClinic",
        logoUrl: "",
        bannerUrl: "",
        description: "",
        address: "",
        googleMapsUrl: "",
        phone: "",
        whatsapp: "",
        email: "",
        openingHours: "",
        galleryImages: [],
        showPricesPublicly: true,
      },
  });
}

export async function PUT(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectMongo();
  const body = await readPayload(req);
  if (!body) {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const current = (await ClinicSettings.findOne().lean()) || {};
  const hasField = (key: string) => {
    if (body instanceof FormData) return body.has(key);
    return Object.prototype.hasOwnProperty.call(body, key);
  };
  const galleryImages = parseJsonArray(getBodyValue(body, "galleryImages")).map((item) => asString(item)).filter(Boolean);
  const removedGalleryImages = parseJsonArray(getBodyValue(body, "removedGalleryImages")).map((item) => asString(item)).filter(Boolean);
  const hasGalleryImagesField = hasField("galleryImages");
  const removeLogo = String(getBodyValue(body, "removeLogo") || "").toLowerCase() === "true";
  const removeBanner = String(getBodyValue(body, "removeBanner") || "").toLowerCase() === "true";
  const showPricesPubliclyValue = getBodyValue(body, "showPricesPublicly");

  let logoUrl = asString(current.logoUrl || "");
  let bannerUrl = asString(current.bannerUrl || "");

  try {
    if (removeLogo && logoUrl) {
      await deleteImageFromCloudinary(logoUrl);
      logoUrl = "";
    } else {
      logoUrl = await uploadMaybeImage(body, "logoFile", logoUrl);
    }

    if (removeBanner && bannerUrl) {
      await deleteImageFromCloudinary(bannerUrl);
      bannerUrl = "";
    } else {
      bannerUrl = await uploadMaybeImage(body, "bannerFile", bannerUrl);
    }

    const galleryUploads: string[] = [];
    if (body instanceof FormData) {
      const files = body.getAll("galleryFiles").filter(isUploadFile).filter((item) => item.size > 0);
      for (const file of files) {
        validateImageFile(file);
        const uploaded = await uploadImageToCloudinary(file, SETTINGS_FOLDER);
        galleryUploads.push(uploaded.secureUrl);
      }
    }

    for (const removedUrl of removedGalleryImages) {
      if (removedUrl) {
        await deleteImageFromCloudinary(removedUrl);
      }
    }

    const nextSettings = {
      clinicName: hasField("clinicName") ? asString(getBodyValue(body, "clinicName")) : asString(current.clinicName || "MediClinic"),
      logoUrl,
      bannerUrl,
      description: hasField("description") ? asString(getBodyValue(body, "description")) : asString(current.description || ""),
      address: hasField("address") ? asString(getBodyValue(body, "address")) : asString(current.address || ""),
      googleMapsUrl: hasField("googleMapsUrl") ? asString(getBodyValue(body, "googleMapsUrl")) : asString(current.googleMapsUrl || ""),
      phone: hasField("phone") ? asString(getBodyValue(body, "phone")) : asString(current.phone || ""),
      whatsapp: hasField("whatsapp") ? asString(getBodyValue(body, "whatsapp")) : asString(current.whatsapp || ""),
      email: hasField("email") ? asString(getBodyValue(body, "email")) : asString(current.email || ""),
      openingHours: hasField("openingHours") ? asString(getBodyValue(body, "openingHours")) : asString(current.openingHours || ""),
      galleryImages: hasGalleryImagesField
        ? galleryImages.concat(galleryUploads)
        : (current.galleryImages || []).concat(galleryUploads).filter(Boolean),
      showPricesPublicly:
        typeof showPricesPubliclyValue === "string"
          ? showPricesPubliclyValue !== "false"
          : typeof showPricesPubliclyValue === "boolean"
            ? showPricesPubliclyValue
            : Boolean(current.showPricesPublicly ?? true),
    };

    const saved = await ClinicSettings.findOneAndUpdate({}, nextSettings, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });

    return NextResponse.json({ clinicSettings: saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel salvar as configuracoes.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
