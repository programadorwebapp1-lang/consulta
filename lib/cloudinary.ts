import crypto from "node:crypto";

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary nao esta configurado. Defina CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET.");
  }

  return { cloudName, apiKey, apiSecret };
}

function buildSignature(params: Record<string, string | number>, apiSecret: string) {
  const payload = Object.entries(params)
    .filter(([, value]) => value !== "" && value !== null && value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto.createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

function ensureAcceptedImage(file: File) {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Use apenas JPG, PNG ou WEBP.");
  }
}

export function validateImageFile(file: File, maxSizeMB = 5) {
  ensureAcceptedImage(file);
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`A imagem deve ter no maximo ${maxSizeMB} MB.`);
  }
}

export async function uploadImageToCloudinary(file: File, folder: string) {
  validateImageFile(file);
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const uploadParams = { folder, timestamp };
  const signature = buildSignature(uploadParams, apiSecret);
  const formData = new FormData();

  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("folder", folder);
  formData.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.secure_url) {
    throw new Error(json?.error?.message || "Nao foi possivel enviar a imagem para o Cloudinary.");
  }

  return {
    secureUrl: String(json.secure_url),
    publicId: String(json.public_id || ""),
  };
}

export function extractPublicIdFromCloudinaryUrl(photoUrl: string) {
  if (!photoUrl) return "";

  try {
    const url = new URL(photoUrl);
    const uploadMarker = "/upload/";
    const uploadIndex = url.pathname.indexOf(uploadMarker);
    if (uploadIndex === -1) return "";

    const remainder = decodeURIComponent(url.pathname.slice(uploadIndex + uploadMarker.length)).replace(/^\/+/, "");
    const parts = remainder.split("/").filter(Boolean);
    if (parts.length === 0) return "";

    const versionIndex = parts.findIndex((part) => /^v\d+$/.test(part));
    const publicIdParts = versionIndex >= 0 ? parts.slice(versionIndex + 1) : parts.slice();
    if (!publicIdParts.length) return "";

    publicIdParts[publicIdParts.length - 1] = publicIdParts[publicIdParts.length - 1].replace(/\.[^.]+$/, "");
    return publicIdParts.join("/");
  } catch {
    return "";
  }
}

export async function deleteImageFromCloudinary(photoUrl: string) {
  const publicId = extractPublicIdFromCloudinaryUrl(photoUrl);
  if (!publicId) return false;

  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { invalidate: "true", public_id: publicId, timestamp };
  const signature = buildSignature(params, apiSecret);
  const formData = new FormData();

  formData.append("public_id", publicId);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("invalidate", "true");
  formData.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    return false;
  }

  return true;
}
