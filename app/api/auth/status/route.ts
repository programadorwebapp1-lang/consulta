import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await connectMongo();
    const users = await User.countDocuments();
    return NextResponse.json({ hasUsers: users > 0, dbReady: true });
  } catch (error) {
    console.error("Erro MongoDB status:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      {
        hasUsers: false,
        dbReady: false,
        error: `Banco indisponível ou MONGODB_URI inválido. ${message}`,
      },
      { status: 503 }
    );
  }
}
