import Link from "next/link";
import { ArrowLeft, FileText, Shield, Stethoscope, UserRound, PhoneCall } from "lucide-react";
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

export default async function TermsPage() {
  const clinicName = await getClinicName();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)]">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Voltar para a página inicial
        </Link>

        <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
              <FileText className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">Termos de uso</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-950">{clinicName}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Estes termos descrevem como pacientes, médicos e administradores podem usar a plataforma da clínica,
                incluindo cadastro, agendamento, painel administrativo, notificações e acesso à página pública.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4">
            <Section title="1. Aceite dos termos">
              <p>
                Ao criar uma conta, acessar a área pública, agendar consultas ou usar o painel da clínica, você declara
                estar de acordo com estes termos e com a Política de Privacidade e a Política de Cookies.
              </p>
            </Section>

            <Section title="2. Sobre o sistema">
              <p>
                A plataforma organiza informações da clínica, especialidades, médicos, preços, fotos, horários,
                localização, agendamento e comunicação com pacientes. O sistema é personalizado para a operação do
                consultório e usa dados reais cadastrados no banco de dados.
              </p>
            </Section>

            <Section title="3. Contas e perfis">
              <div className="flex items-start gap-3">
                <UserRound className="mt-1 h-4 w-4 text-sky-600" />
                <p>Pacientes, médicos e administradores devem fornecer informações corretas, atualizadas e verdadeiras.</p>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="mt-1 h-4 w-4 text-sky-600" />
                <p>
                  O acesso é pessoal e intransferível. Cada perfil visualiza apenas as informações necessárias para sua
                  função.
                </p>
              </div>
            </Section>

            <Section title="4. Agendamentos e atendimento">
              <div className="flex items-start gap-3">
                <Stethoscope className="mt-1 h-4 w-4 text-sky-600" />
                <p>
                  Os horários exibidos dependem da agenda configurada pelo médico ou administrador. A clínica pode
                  confirmar, reagendar ou cancelar atendimentos conforme a operação interna.
                </p>
              </div>
              <p>
                O paciente é responsável por comparecer no horário informado e por manter seu telefone atualizado para
                receber avisos, inclusive pelo WhatsApp quando habilitado.
              </p>
            </Section>

            <Section title="5. Comunicação">
              <div className="flex items-start gap-3">
                <PhoneCall className="mt-1 h-4 w-4 text-sky-600" />
                <p>
                  O sistema pode usar e-mail, telefone e WhatsApp para confirmação de consultas, lembretes e suporte
                  operacional relacionado ao atendimento.
                </p>
              </div>
            </Section>

            <Section title="6. Limitação de responsabilidade">
              <p>
                A clínica se compromete a manter as informações atualizadas, mas não responde por falhas decorrentes de
                dados incorretos fornecidos pelo usuário, instabilidade de terceiros ou indisponibilidade momentânea de
                serviços externos.
              </p>
            </Section>

            <Section title="7. Alterações">
              <p>
                Estes termos podem ser atualizados para refletir mudanças operacionais, legais ou tecnológicas. A versão
                vigente será sempre a publicada nesta área.
              </p>
            </Section>

            <Section title="8. Contato">
              <p>
                Dúvidas podem ser tratadas pelos canais oficiais cadastrados na clínica, como telefone, WhatsApp ou
                e-mail exibidos na página pública.
              </p>
            </Section>
          </div>

          <p className="mt-8 text-xs leading-6 text-slate-500">
            Última atualização: {new Date().toLocaleDateString("pt-BR")}. Este conteúdo é um modelo operacional e não
            substitui revisão jurídica profissional.
          </p>
        </div>
      </div>
    </main>
  );
}
