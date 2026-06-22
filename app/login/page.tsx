import { AuthPage } from "@/components/auth-page";
import { connectMongo } from "@/lib/mongodb";
import ClinicSettings from "@/models/ClinicSettings";

export default async function LoginPage({ searchParams }: { searchParams?: { next?: string } }) {
  let clinicName = "MediClinic";
  let logoUrl = "";

  try {
    await connectMongo();
    const settings = await ClinicSettings.findOne().lean();
    clinicName = String((settings as Record<string, any> | null)?.clinicName || clinicName);
    logoUrl = String((settings as Record<string, any> | null)?.logoUrl || "");
  } catch {
    // Mantém os valores padrão se o banco ainda não estiver pronto.
  }

  return <AuthPage defaultMode="login" title={clinicName} logoUrl={logoUrl} returnTo={searchParams?.next || ""} />;
}
