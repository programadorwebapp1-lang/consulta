import bcrypt from "bcryptjs";
export { buildAuthCookie, clearAuthCookie, signSessionToken, verifySessionToken } from "./jwt";
export type { SessionRole, SessionUser } from "./jwt";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}
