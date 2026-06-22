import { AuthPage } from "@/components/auth-page";

export default function CadastroPage({ searchParams }: { searchParams?: { next?: string } }) {
  return <AuthPage defaultMode="signup" returnTo={searchParams?.next || ""} />;
}
