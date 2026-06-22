import Link from "next/link";
import { ArrowLeft, LockKeyhole, ShieldCheck, Database, MessageCircle } from "lucide-react";
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

export default async function PrivacyPage() {
  const clinicName = await getClinicName();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.10),_transparent_28%),linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)]">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Voltar para a página inicial
        </Link>

        <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-600">Privacidade</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-950">{clinicName}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Esta política explica como dados de pacientes, médicos e administradores são coletados, usados,
                armazenados e protegidos dentro do sistema da clínica.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4">
            <Section title="1. Dados coletados">
              <div className="flex items-start gap-3">
                <Database className="mt-1 h-4 w-4 text-emerald-600" />
                <p>
                  Podemos tratar nome, e-mail, telefone, data de nascimento, endereço, histórico de agendamento,
                  especialidade, informações de contato e dados administrativos cadastrados pela clínica.
                </p>
              </div>
            </Section>

            <Section title="2. Finalidades">
              <p>Os dados são usados para:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>criar e autenticar contas;</li>
                <li>agendar, confirmar, remarcar e cancelar consultas;</li>
                <li>exibir a página pública da clínica;</li>
                <li>enviar lembretes, confirmações e mensagens operacionais;</li>
                <li>manter o painel administrativo e o painel do médico.</li>
              </ul>
            </Section>

            <Section title="3. Compartilhamento">
              <div className="flex items-start gap-3">
                <MessageCircle className="mt-1 h-4 w-4 text-emerald-600" />
                <p>
                  Os dados podem ser compartilhados apenas quando necessário para o funcionamento do sistema, como
                  envio de notificações por WhatsApp, hospedagem de imagens no Cloudinary e serviços de autenticação.
                </p>
              </div>
            </Section>

            <Section title="4. Armazenamento e segurança">
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-1 h-4 w-4 text-emerald-600" />
                <p>
                  Os dados são armazenados em MongoDB e as imagens ficam em armazenamento externo configurado pela
                  clínica. A plataforma usa medidas de proteção adequadas ao acesso por perfis.
                </p>
              </div>
            </Section>

            <Section title="5. Cookies e preferências">
              <p>
                O sistema utiliza cookies essenciais de sessão e preferências básicas. A página pública exibe um banner
                de consentimento para registrar sua escolha. Você pode aceitar apenas os essenciais ou salvar
                preferências adicionais.
              </p>
            </Section>

            <Section title="6. Direitos do titular">
              <p>
                Você pode solicitar acesso, correção, atualização ou exclusão dos seus dados quando aplicável. A
                solicitação deve ser feita pelos canais oficiais da clínica.
              </p>
            </Section>

            <Section title="7. Retenção">
              <p>
                Os dados são mantidos pelo tempo necessário para a prestação do serviço, cumprimento de obrigações
                legais e funcionamento do prontuário e do histórico de atendimento.
              </p>
            </Section>
          </div>

          <p className="mt-8 text-xs leading-6 text-slate-500">
            Última atualização: {new Date().toLocaleDateString("pt-BR")}. Modelo operacional para o sistema da clínica;
            recomendamos revisão jurídica antes da publicação final.
          </p>
        </div>
      </div>
    </main>
  );
}
