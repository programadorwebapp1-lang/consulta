import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ensureAppointmentReminderScheduler } from "@/lib/appointment-reminder-scheduler";
import { connectMongo } from "@/lib/mongodb";
import ClinicSettings from "@/models/ClinicSettings";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  try {
    await connectMongo();
    const settings = await ClinicSettings.findOne().lean();
    const clinicName = String((settings as Record<string, any> | null)?.clinicName || "MediClinic");
    return {
      title: {
        default: clinicName,
        template: `%s | ${clinicName}`,
      },
      description: "Página pública, agendamento e painel da clínica com Next.js e MongoDB.",
    };
  } catch {
    return {
      title: "MediClinic",
      description: "Página pública, agendamento e painel da clínica com Next.js e MongoDB.",
    };
  }
}

export default function RootLayout({ children }: { children: ReactNode }) {
  ensureAppointmentReminderScheduler();

  return (
    <html lang="pt-BR">
      <body>
        {children}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
