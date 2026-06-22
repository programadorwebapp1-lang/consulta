import { NextResponse } from "next/server";
import { getPublicClinicSnapshot } from "@/lib/public-clinic";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const snapshot = await getPublicClinicSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel carregar os dados publicos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
