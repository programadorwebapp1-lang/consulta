import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  ImageIcon,
  Mail,
  MapPinned,
  MessageCircle,
  Phone,
  Sparkles,
  Stethoscope,
  Users,
  BadgeCheck,
  Map,
  Star,
} from "lucide-react";
import { getPublicClinicSnapshot, formatCurrencyBRL, resolvePublicPrice } from "@/lib/public-clinic";

export const dynamic = "force-dynamic";

const scheduleHref = `/login?next=${encodeURIComponent("/paciente?tab=book")}`;
const signupHref = `/cadastro?next=${encodeURIComponent("/paciente?tab=book")}`;

function cleanPhone(value?: string) {
  return String(value || "").replace(/\D/g, "");
}

function buildWhatsAppLink(value?: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const digits = cleanPhone(raw);
  if (!digits) return "";
  return `https://wa.me/${digits}`;
}

function getMapsEmbedUrl(value?: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const url = new URL(raw);
    const hostname = url.hostname.toLowerCase();
    const isGoogleMaps = hostname.includes("google.com") || hostname.includes("goo.gl");

    if (!isGoogleMaps) {
      return raw.includes("maps/embed") || raw.includes("output=embed") ? raw : "";
    }

    if (raw.includes("output=embed") || raw.includes("/maps/embed")) {
      return raw;
    }

    const coordsMatch = raw.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (coordsMatch) {
      return `https://www.google.com/maps?q=${coordsMatch[1]},${coordsMatch[2]}&z=15&output=embed`;
    }

    const placeMatch = raw.match(/\/maps\/place\/([^/]+)/i);
    if (placeMatch?.[1]) {
      return `https://www.google.com/maps?q=${decodeURIComponent(placeMatch[1]).replace(/\+/g, " ")}&output=embed`;
    }

    const queryMatch = raw.match(/[?&]q=([^&]+)/i);
    if (queryMatch?.[1]) {
      return `https://www.google.com/maps?q=${decodeURIComponent(queryMatch[1]).replace(/\+/g, " ")}&output=embed`;
    }

    return `https://www.google.com/maps?q=${encodeURIComponent(raw)}&output=embed`;
  } catch {
    return raw.includes("output=embed") || raw.includes("maps/embed")
      ? raw
      : `https://www.google.com/maps?q=${encodeURIComponent(raw)}&output=embed`;
  }
}

function sectionTitle(title: string, subtitle: string, dark = false) {
  return (
    <div className="max-w-2xl">
      <p className={`text-sm font-semibold uppercase tracking-[0.28em] ${dark ? "text-sky-300" : "text-sky-600"}`}>{title}</p>
      <p className={`mt-3 leading-relaxed ${dark ? "text-slate-300" : "text-slate-600"}`}>{subtitle}</p>
    </div>
  );
}

function placeholderCard(label: string, icon: typeof ImageIcon = ImageIcon) {
  const Icon = icon;
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-sky-50 p-6 shadow-sm">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.08),transparent_36%)]" />
      <div className="relative flex h-56 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
            <Icon className="h-7 w-7" />
          </div>
          <p className="text-sm font-medium text-slate-700">{label}</p>
        </div>
      </div>
    </div>
  );
}

function getDoctorSpecialtyNames(doctor: Record<string, any>, specialties: Record<string, any>[]) {
  const ids = [
    String(doctor?.specialtyId?._id || doctor?.specialtyId || ""),
    ...(Array.isArray(doctor?.specialtyIds) ? doctor.specialtyIds.map((item: any) => String(item?._id || item)) : []),
  ].filter(Boolean);

  const names = ids
    .map((id) => specialties.find((specialty) => String(specialty._id) === id)?.name)
    .filter((name): name is string => Boolean(name));

  return Array.from(new Set(names));
}

function getDoctorPriceLabel(doctorId: string, prices: { doctorId?: string; showPrice: boolean; rawPrice: number | null; priceLabel: string }[]) {
  const doctorPrices = prices.filter((price) => String(price.doctorId || "") === String(doctorId));
  const visiblePrices = doctorPrices.filter((price) => price.showPrice && price.rawPrice !== null);
  if (visiblePrices.length === 0) {
    return "Preço sob consulta";
  }

  const lowestPrice = Math.min(...visiblePrices.map((price) => Number(price.rawPrice)));
  return formatCurrencyBRL(lowestPrice);
}

export default async function HomePage() {
  const { clinicSettings, specialties, doctors, prices } = await getPublicClinicSnapshot();
  const whatsappLink = buildWhatsAppLink(clinicSettings.whatsapp || clinicSettings.phone);
  const priceEnabled = clinicSettings.showPricesPublicly !== false;
  const primarySpecialties = specialties.slice(0, 6);
  const gallery: string[] = clinicSettings.galleryImages || [];
  const heroHasImage = Boolean(clinicSettings.bannerUrl);
  const clinicLogo = clinicSettings.logoUrl || "";
  const activeDoctors = doctors.filter((doctor) => doctor.active !== false && doctor.status !== "INATIVO");
  const publicPrices = prices;
  const mapsEmbedUrl = getMapsEmbedUrl(clinicSettings.googleMapsUrl);

  return (
    <main className="min-h-screen text-slate-900">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-200">
              {clinicLogo ? (
                <Image src={clinicLogo} alt={clinicSettings.clinicName || "Clínica"} width={44} height={44} className="h-full w-full object-cover" />
              ) : (
                <Stethoscope className="h-6 w-6" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Clínica</p>
              <h1 className="text-base font-semibold">{clinicSettings.clinicName || "MediClinic"}</h1>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <a href="#especialidades" className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Especialidades</a>
            <a href="#medicos" className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Médicos</a>
            <a href="#precos" className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Preços</a>
            <a href="#localizacao" className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Localização</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:inline-flex">
              Entrar
            </Link>
            <Link href="/cadastro" className="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700">
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_30%),linear-gradient(180deg,#eff7ff_0%,#f7fbff_40%,#ffffff_100%)]" />
        <div className="absolute -left-24 top-28 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-emerald-200/30 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-24">
          <div className="flex flex-col justify-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-4 py-2 text-sm font-medium text-sky-700 shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4" />
              Atendimento médico com transparência, conforto e agendamento online
            </div>
            <h2 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              {clinicSettings.clinicName || "Sua clínica"} em uma experiência pública clara e profissional.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Veja especialidades, médicos, valores, fotos do consultório, localização e horários antes de entrar.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={scheduleHref} className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-700">
                Agendar Consulta
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Entrar
              </Link>
              <Link href={signupHref} className="inline-flex items-center justify-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-6 py-3.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100">
                Criar conta
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <p className="text-2xl font-semibold text-slate-950">{primarySpecialties.length}</p>
                <p className="mt-1 text-sm text-slate-500">Especialidades ativas</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <p className="text-2xl font-semibold text-slate-950">{activeDoctors.length}</p>
                <p className="mt-1 text-sm text-slate-500">Médicos disponíveis</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <p className="text-2xl font-semibold text-slate-950">{priceEnabled ? "Sim" : "Não"}</p>
                <p className="mt-1 text-sm text-slate-500">Preços públicos</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-sky-200/40 via-white to-emerald-100/40 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-2xl shadow-slate-200/60">
              <div className="relative h-[36rem]">
                {heroHasImage ? (
                  <Image src={clinicSettings.bannerUrl} alt={`${clinicSettings.clinicName || "Clínica"} - banner principal`} fill priority className="object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-[linear-gradient(160deg,#0f172a_0%,#155e75_50%,#0ea5e9_100%)]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 text-white">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
                    <BadgeCheck className="h-4 w-4" />
                    Clínica pronta para receber pacientes
                  </div>
                  <h3 className="text-2xl font-semibold sm:text-3xl">{clinicSettings.clinicName || "MediClinic"}</h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-100">
                    {clinicSettings.description ||
                      "Consultório com atendimento humanizado, agenda organizada e informações públicas sempre atualizadas."}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2 text-sm">
                    {clinicSettings.openingHours && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 backdrop-blur">
                        <Clock3 className="h-4 w-4" />
                        {clinicSettings.openingHours}
                      </span>
                    )}
                    {clinicSettings.phone && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 backdrop-blur">
                        <Phone className="h-4 w-4" />
                        {clinicSettings.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="especialidades" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {sectionTitle("Especialidades", "Especialidades ativas com descrição real e preço visível quando permitido pela configuração da clínica.")}
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {primarySpecialties.length === 0 ? (
            <div className="md:col-span-2 xl:col-span-3">{placeholderCard("Nenhuma especialidade ativa cadastrada", BadgeCheck)}</div>
          ) : (
            primarySpecialties.map((specialty) => {
              const priceInfo = resolvePublicPrice({
                showPricePublicly: clinicSettings.showPricesPublicly && specialty.showPricePublicly !== false,
                specialtyPrice: specialty.consultationPrice,
              });

              return (
                <article key={String(specialty._id)} className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Especialidade</p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-950">{specialty.name}</h3>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                      <BadgeCheck className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{specialty.description || "Descrição não informada."}</p>
                  <div className="mt-6 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm text-slate-500">Consulta</span>
                    <span className="text-sm font-semibold text-slate-950">
                      {priceInfo.showPrice ? priceInfo.priceLabel : "Preço oculto"}
                    </span>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <section id="medicos" className="border-y border-slate-200/70 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          {sectionTitle("Médicos", "Profissionais ativos, com foto, CRM, especialidade e botões para seguir para o agendamento.")}
              <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeDoctors.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3">{placeholderCard("Nenhum médico ativo cadastrado", Stethoscope)}</div>
            ) : (
              activeDoctors.slice(0, 6).map((doctor) => {
                const specialtyNames = getDoctorSpecialtyNames(doctor as Record<string, any>, specialties);
                const primarySpecialty = specialties.find(
                  (specialty) => String(specialty._id) === String(doctor.specialtyId?._id || doctor.specialtyId || "")
                ) as Record<string, any> | undefined;
                const priceLabel = getDoctorPriceLabel(String(doctor._id), publicPrices);

                return (
                  <article key={String(doctor._id)} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                    <div className="relative h-48 bg-slate-100">
                      {doctor.photoUrl ? (
                        <Image src={doctor.photoUrl} alt={doctor.name} fill className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.2),transparent_35%),linear-gradient(160deg,#eff6ff_0%,#dbeafe_100%)]">
                          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/80 text-2xl font-semibold text-sky-700 shadow">
                            {String(doctor.name || "MD")
                              .split(" ")
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((part: string) => part[0]?.toUpperCase() || "")
                              .join("") || "MD"}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-semibold text-slate-950">{doctor.name}</h3>
                          <p className="mt-1 text-sm text-slate-500">{primarySpecialty?.name || specialtyNames[0] || "Especialidade não informada"}</p>
                          {specialtyNames.length > 1 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {specialtyNames.map((name) => (
                                <span
                                  key={name}
                                  className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700"
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
                          CRM {doctor.crm}
                        </div>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-slate-600">
                        {doctor.bio || "Médico cadastrado e disponível para atendimento."}
                      </p>
                      <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                        <span className="text-sm text-slate-500">Consulta</span>
                        <span className="text-sm font-semibold text-slate-950">
                          {priceEnabled ? priceLabel : "Preço oculto"}
                        </span>
                      </div>
                      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                        <Link href={scheduleHref} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700">
                          Agendar
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link href="/login" className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                          Ver horários
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </section>

      <section id="precos" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {sectionTitle("Preços das consultas", "Valores por especialidade ou por médico, conforme configurado no painel administrativo.")}
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {priceEnabled ? (
            publicPrices.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3">{placeholderCard("Sem consultas cadastradas para exibir preços", Star)}</div>
            ) : (
              publicPrices.map((price) => {
                return (
                  <article key={`price-${String(price.doctorId)}-${String(price.specialtyId)}`} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">{price.specialtyName || "Consulta"}</p>
                        <h3 className="mt-2 text-lg font-semibold text-slate-950">{price.doctorName || "Médico"}</h3>
                      </div>
                      <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-emerald-700">
                        <Star className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-slate-500">{price.specialtyDescription || price.doctorBio || "Preço"}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                        {price.doctorName || "Médico"}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                        {price.specialtyName || "Especialidade"}
                      </span>
                    </div>
                    <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Valor</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-950">
                        {price.showPrice ? price.priceLabel : "Preço sob consulta"}
                      </p>
                    </div>
                  </article>
                );
              })
            )
          ) : (
            <div className="md:col-span-2 xl:col-span-3 rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
              Os preços estão ocultos na página pública.
            </div>
          )}
        </div>
      </section>

      <section className="border-y border-slate-200/70 bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          {sectionTitle("Galeria do consultório", "Fotos da recepção, salas, fachada e ambientes.", true)}
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {gallery.length === 0 ? (
              <>
                {placeholderCard("Adicione imagens do consultório no painel", ImageIcon)}
                {placeholderCard("A clínica ainda não cadastrou a galeria", ImageIcon)}
                {placeholderCard("Fotos aparecerão aqui quando forem enviadas", ImageIcon)}
              </>
            ) : (
              gallery.slice(0, 6).map((imageUrl, index) => (
                <div key={`${imageUrl}-${index}`} className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-lg">
                  <div className="relative h-64">
                    <Image src={imageUrl} alt={`Foto do consultório ${index + 1}`} fill className="object-cover" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section id="localizacao" className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div>
          {sectionTitle("Localização", "Endereço completo, mapa incorporado e acesso rápido ao Google Maps.")}
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                <MapPinned className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">Endereço</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{clinicSettings.address || "Endereço não informado pelo administrador."}</p>
              </div>
            </div>
            {clinicSettings.googleMapsUrl && (
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={clinicSettings.googleMapsUrl} target="_blank" className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700">
                  Abrir no Google Maps
                </Link>
              </div>
            )}
          </div>
          {clinicSettings.openingHours && (
            <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Clock3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">Horário de funcionamento</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{clinicSettings.openingHours}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
          {mapsEmbedUrl ? (
            <iframe
              src={mapsEmbedUrl}
              className="h-[30rem] w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Mapa da clínica"
            />
          ) : (
            <div className="flex h-[30rem] items-center justify-center bg-[linear-gradient(160deg,#eff6ff_0%,#dbeafe_50%,#f8fafc_100%)] p-6 text-center">
              <div className="text-center text-slate-600">
                <Map className="mx-auto h-12 w-12 text-sky-600" />
                <p className="mt-3 text-sm font-medium">
                  {clinicSettings.googleMapsUrl ? "Use o botão para abrir no Google Maps." : "Mapa não configurado ainda"}
                </p>
                {clinicSettings.googleMapsUrl && (
                  <div className="mt-4">
                    <Link href={clinicSettings.googleMapsUrl} target="_blank" className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700">
                      Abrir no Google Maps
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          {sectionTitle("Contato", "Telefone, WhatsApp, e-mail e atalhos rápidos para o paciente chegar ao atendimento.")}
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm">
                <Phone className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-950">Telefone</p>
              <p className="mt-1 text-sm text-slate-600">{clinicSettings.phone || "Não informado"}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                <MessageCircle className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-950">WhatsApp</p>
              {whatsappLink ? (
                <Link href={whatsappLink} target="_blank" className="mt-1 inline-flex text-sm text-slate-600 hover:text-sky-700">
                  {clinicSettings.whatsapp || clinicSettings.phone}
                </Link>
              ) : (
                <p className="mt-1 text-sm text-slate-600">Não informado</p>
              )}
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm">
                <Mail className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-950">E-mail</p>
              <p className="mt-1 text-sm text-slate-600">{clinicSettings.email || "Não informado"}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm">
                <CalendarDays className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-950">Horário</p>
              <p className="mt-1 text-sm text-slate-600">{clinicSettings.openingHours || "Não informado"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-300">Pronto para começar</p>
            <h2 className="mt-2 text-2xl font-semibold">{clinicSettings.clinicName || "MediClinic"}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Entre para agendar consulta, acompanhar sua jornada e continuar o fluxo com a conta já criada.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href={scheduleHref} className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
              Agendar Consulta
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              Entrar
            </Link>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-sm text-slate-300 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <p>Informações legais e consentimento de cookies disponíveis abaixo.</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/termos" className="font-medium text-white hover:text-sky-200">
                Termos de uso
              </Link>
              <Link href="/privacidade" className="font-medium text-white hover:text-sky-200">
                Privacidade
              </Link>
              <Link href="/cookies" className="font-medium text-white hover:text-sky-200">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
