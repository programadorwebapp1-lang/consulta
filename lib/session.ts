import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "./jwt";

export async function readSessionFromRequest(req?: NextRequest) {
  const token = req ? req.cookies.get("sgm_token")?.value : cookies().get("sgm_token")?.value;
  if (!token) return null;

  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}
