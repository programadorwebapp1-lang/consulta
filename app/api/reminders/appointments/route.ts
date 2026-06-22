import { NextResponse } from "next/server";
import { runAppointmentReminderNow } from "@/lib/appointment-reminder-scheduler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireCronToken(request: Request) {
  const expected = process.env.REMINDER_CRON_TOKEN?.trim();
  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ ok: false, error: "REMINDER_CRON_TOKEN is not defined" }, { status: 500 });
    }
    return null;
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (token !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

export async function GET(request: Request) {
  const unauthorized = requireCronToken(request);
  if (unauthorized) return unauthorized;

  const result = await runAppointmentReminderNow();
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: Request) {
  const unauthorized = requireCronToken(request);
  if (unauthorized) return unauthorized;

  const result = await runAppointmentReminderNow();
  return NextResponse.json({ ok: true, ...result });
}
