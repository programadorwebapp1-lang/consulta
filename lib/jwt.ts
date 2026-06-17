import { SignJWT, jwtVerify } from "jose";

export type SessionRole = "ADMIN" | "MEDICO" | "PACIENTE";

export type SessionUser = {
  id: string;
  role: SessionRole;
  name: string;
  email: string;
  doctorId?: string | null;
  patientId?: string | null;
};

const COOKIE_NAME = "sgm_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function secretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET environment variable");
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(user: SessionUser) {
  return new SignJWT({
    role: user.role,
    name: user.name,
    email: user.email,
    doctorId: user.doctorId ?? null,
    patientId: user.patientId ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, secretKey());
  const role = payload.role as SessionRole | undefined;

  if (!payload.sub || !role || typeof payload.name !== "string" || typeof payload.email !== "string") {
    throw new Error("Invalid session token");
  }

  return {
    id: payload.sub,
    role,
    name: payload.name,
    email: payload.email,
    doctorId: typeof payload.doctorId === "string" ? payload.doctorId : null,
    patientId: typeof payload.patientId === "string" ? payload.patientId : null,
  } as SessionUser;
}

export function buildAuthCookie(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}

export function clearAuthCookie() {
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}
