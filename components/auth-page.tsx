"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle, Stethoscope } from "lucide-react";
import { Input, Button } from "@/components/system-ui";
import { PasswordInput } from "@/components/password-input";
import type { FormEvent } from "react";

type Mode = "login" | "signup";

type Props = {
  defaultMode?: Mode;
  title?: string;
  subtitle?: string;
  logoUrl?: string;
  returnTo?: string;
};

function safeNextPath(value: string | null) {
  if (!value) return "";
  if (!value.startsWith("/")) return "";
  if (value.startsWith("//")) return "";
  return value;
}

export function AuthPage({
  defaultMode = "login",
  title = "MediClinic",
  subtitle = "Sistema de agendamento online.",
  logoUrl = "",
  returnTo = "",
}: Props) {
  const router = useRouter();
  const nextPath = safeNextPath(returnTo);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [firstAdminMode, setFirstAdminMode] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientPassword, setPatientPassword] = useState("");

  useEffect(() => {
    const savedEmail = window.localStorage.getItem("mediclinic:remembered-email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }

    fetch("/api/auth/status")
      .then((res) => res.json())
      .then((data) => {
        setFirstAdminMode(!data.hasUsers);
        setAppReady(true);
      })
      .catch(() => setAppReady(true));
  }, []);

  function redirectAfterAuth(path: string) {
    if (nextPath && path.startsWith("/paciente")) {
      router.replace(nextPath);
      return;
    }
    router.replace(path);
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error || "Nao foi possivel entrar.");
      return;
    }

    if (rememberEmail) {
      window.localStorage.setItem("mediclinic:remembered-email", email);
    } else {
      window.localStorage.removeItem("mediclinic:remembered-email");
    }

    redirectAfterAuth(data.redirectTo);
    router.refresh();
  }

  async function bootstrapAdmin(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: "ADMIN",
      }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error || "Nao foi possivel criar o administrador.");
      return;
    }
    redirectAfterAuth(data.redirectTo);
    router.refresh();
  }

  async function registerPatient(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "PACIENTE",
        email: patientEmail,
        phone: patientPhone,
        password: patientPassword,
      }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error || "Nao foi possivel criar sua conta.");
      return;
    }
    redirectAfterAuth(data.redirectTo);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.10),_transparent_28%),linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-sky-600 rounded-2xl shadow-lg shadow-sky-200 mb-4 overflow-hidden">
            {logoUrl ? (
              <Image src={logoUrl} alt={title} width={56} height={56} className="h-full w-full object-cover" />
            ) : (
              <Stethoscope className="w-7 h-7 text-white" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">
            {firstAdminMode ? "Crie o primeiro administrador" : mode === "login" ? "Acesse sua conta" : "Criar conta de paciente"}
          </h2>

          {!appReady ? (
            <p className="text-sm text-slate-500">Carregando...</p>
          ) : firstAdminMode ? (
            <form onSubmit={bootstrapAdmin} className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Nome</span>
                <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} required />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">E-mail</span>
                <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required />
              </label>
              <PasswordInput label="Senha" value={adminPassword} onChange={setAdminPassword} required />
              {error && <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-700 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}
              <Button type="submit" disabled={loading} className="w-full">{loading ? "Salvando..." : "Criar administrador"}</Button>
            </form>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                    mode === "login" ? "bg-sky-600 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                    mode === "signup" ? "bg-sky-600 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Criar conta
                </button>
              </div>

              {mode === "login" ? (
                <form onSubmit={login} className="space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">E-mail</span>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </label>
                  <PasswordInput label="Senha" value={password} onChange={setPassword} required />
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={rememberEmail}
                      onChange={(e) => setRememberEmail(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    Lembrar meu e-mail
                  </label>
                  {error && <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-700 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}
                  <Button type="submit" disabled={loading} className="w-full">{loading ? "Entrando..." : "Entrar"}</Button>
                </form>
              ) : (
                <form onSubmit={registerPatient} className="space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">E-mail</span>
                    <Input type="email" value={patientEmail} onChange={(e) => setPatientEmail(e.target.value)} required />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Telefone</span>
                    <Input value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} required placeholder="(00) 00000-0000" />
                  </label>
                  <PasswordInput label="Senha" value={patientPassword} onChange={setPatientPassword} required />
                  {error && <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-700 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}
                  <Button type="submit" disabled={loading} className="w-full">{loading ? "Criando..." : "Criar conta"}</Button>
                </form>
              )}
            </>
          )}

          {!firstAdminMode && (
            <div className="mt-6 pt-6 border-t border-slate-100 text-sm text-slate-500">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5" />
                <p>O acesso e controlado por perfil. O redirecionamento e automático após o login.</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-4">
                <Link href="/termos" className="font-medium text-sky-700 hover:text-sky-800">
                  Termos de uso
                </Link>
                <Link href="/privacidade" className="font-medium text-slate-600 hover:text-slate-900">
                  Privacidade
                </Link>
                <Link href="/cookies" className="font-medium text-slate-600 hover:text-slate-900">
                  Cookies
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
