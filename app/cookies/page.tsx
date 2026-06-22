import Link from "next/link";
import { ArrowLeft, Cookie, ShieldCheck, Settings2 } from "lucide-react";
import { connectMongo } from "@/lib/mongodb";
import ClinicSettings from "@/models/ClinicSettings";

export const dynamic = "force-dynamic";

async function getClinicName() {
  try {
    await connectMongo();
    const settings = await ClinicSettings.findOne().lean();
    return String((settings as Record<string, any> | null)?.clinicName || "MediClinic");
  } catch {
    return "MediClinic";
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">{children}</div>
    </section>
  );
}

export default async function CookiesPage() {
  const clinicName = await getClinicName();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_28%),linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)]">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Voltar para a página inicial
        </Link>

        <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
              <Cookie className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">Cookies</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-950">{clinicName}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Aqui você entende quais cookies e tecnologias de armazenamento são usados no sistema e como
                controlar suas preferências.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4">
            <Section title="1. O que são cookies?">
              <p>
                Cookies são pequenos arquivos que ajudam o sistema a lembrar a sessão de acesso, preferências e
                configurações de uso. Também podem ser usados por serviços externos integrados.
              </p>
            </Section>

            <Section title="2. Cookies usados no sistema">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>Essenciais:</strong> mantêm o login e a segurança da sessão, como o cookie de autenticação.
                </li>
                <li>
                  <strong>Funcionais:</strong> podem lembrar preferências do usuário, como e-mail salvo no login.
                </li>
                <li>
                  <strong>Analíticos e marketing:</strong> não são usados por padrão no sistema. Caso sejam ativados
                  futuramente, dependerão do seu consentimento.
                </li>
              </ul>
            </Section>

            <Section title="3. Como gerenciar">
              <div className="flex items-start gap-3">
                <Settings2 className="mt-1 h-4 w-4 text-sky-600" />
                <p>
                  Na página pública você pode aceitar apenas os cookies essenciais, aceitar todos ou abrir as
                  configurações para personalizar as categorias permitidas.
                </p>
              </div>
            </Section>

            <Section title="4. Impacto da recusa">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 h-4 w-4 text-sky-600" />
                <p>
                  Se você permitir apenas os cookies essenciais, o sistema continuará funcionando. Recursos opcionais
                  de conveniência podem ficar limitados.
                </p>
              </div>
            </Section>

            <Section title="5. Armazenamento local">
              <p>
                Além de cookies, algumas preferências podem ser guardadas no navegador pelo próprio sistema, como o
                e-mail lembrado no login e a escolha de consentimento. Essas informações não são usadas para rastrear
                você fora do ambiente da clínica.
              </p>
            </Section>
          </div>

          <p className="mt-8 text-xs leading-6 text-slate-500">
            Última atualização: {new Date().toLocaleDateString("pt-BR")}. Modelo operacional para o sistema da clínica;
            revise com o jurídico antes da publicação definitiva.
          </p>
        </div>
      </div>
    </main>
  );
}
