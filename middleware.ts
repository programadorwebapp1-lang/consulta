import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, type SessionRole } from "./lib/jwt";

const COOKIE_NAME = "sgm_token";

function roleHome(role: SessionRole) {
  return role === "ADMIN" ? "/admin" : role === "MEDICO" ? "/medico" : "/paciente";
}

async function readSession(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/cadastro",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/status",
  "/api/public-clinic",
  "/api/clinic-settings",
  "/api/test-db",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  const isPublic =
    pathname === "/" ||
    PUBLIC_PATHS.slice(1).some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const session = await readSession(req);

  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL(roleHome(session.role), req.url));
  }

  if (pathname === "/cadastro" && session) {
    return NextResponse.redirect(new URL(roleHome(session.role), req.url));
  }

  if (isPublic) {
    return NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/admin") && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL(roleHome(session.role), req.url));
  }

  if (pathname.startsWith("/medico") && session.role !== "MEDICO") {
    return NextResponse.redirect(new URL(roleHome(session.role), req.url));
  }

  if (pathname.startsWith("/paciente") && session.role !== "PACIENTE") {
    return NextResponse.redirect(new URL(roleHome(session.role), req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/admin/:path*", "/medico/:path*", "/paciente/:path*", "/api/:path*"],
};
