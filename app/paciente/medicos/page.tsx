"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BadgeCheck, Calendar, Clock, Stethoscope, Users } from "lucide-react";
import { RoleShell } from "@/components/role-shell";
import { Button, Card, Empty, PageHeader, Select, StatCard } from "@/components/system-ui";

type AnyRecord = Record<string, any>;

const navItems = [
  { id: "dashboard", label: "Início", icon: Calendar },
  { id: "book", label: "Agendar", icon: Clock },
  { id: "appointments", label: "Consultas", icon: Users },
  { id: "doctors", label: "Médicos", icon: Stethoscope },
];

function resolveName(value: any) {
  if (!value) return "—";
  if (typeof value === "string") return value;
  return value.name || value.title || "—";
}

function getInitials(name?: string) {
  if (!name) return "MD";
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "MD"
  );
}

export default function PatientDoctorsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/patient/doctors", { cache: "no-store" });
    if (response.status === 401) {
      router.replace("/login");
      return;
    }
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error || "Erro ao carregar médicos.");
      setLoading(false);
      return;
    }
    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const specialties = data?.specialties || [];
  const doctors = useMemo(() => {
    const activeDoctors = (data?.doctors || []).filter(
      (item: AnyRecord) => item.active !== false && item.status !== "INATIVO"
    );
    if (!specialtyFilter) return activeDoctors;
    return activeDoctors.filter(
      (item: AnyRecord) => String(item.specialtyId?._id || item.specialtyId) === specialtyFilter
    );
  }, [data, specialtyFilter]);

  return (
    <RoleShell
      userName={data?.user?.name || "Paciente"}
      roleLabel="Paciente"
      navItems={navItems}
      active="doctors"
      onNavigate={(id) => {
        if (id === "dashboard") router.push("/paciente");
        if (id === "book") router.push("/paciente?tab=book");
        if (id === "appointments") router.push("/paciente?tab=appointments");
        if (id === "doctors") router.push("/paciente/medicos");
      }}
      onLogout={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
      }}
    >
      {loading ? (
        <Card className="p-8 text-sm text-slate-500">Carregando médicos disponíveis...</Card>
      ) : (
        <div>
          <PageHeader
            title="Nossos Médicos"
            sub="Escolha um profissional por especialidade e inicie o agendamento"
            action={<Button variant="secondary" onClick={() => router.push("/paciente")}>Voltar ao painel</Button>}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard label="Médicos ativos" value={doctors.length} icon={Stethoscope} color="bg-sky-50 text-sky-600" />
            <StatCard label="Especialidades" value={specialties.length} icon={BadgeCheck} color="bg-violet-50 text-violet-600" />
            <StatCard label="Lista filtrada" value={specialtyFilter ? "Sim" : "Não"} icon={Users} color="bg-emerald-50 text-emerald-600" />
          </div>

          <Card className="p-5 mb-6">
            <label className="block max-w-sm">
              <span className="text-sm font-medium text-slate-700">Filtrar por especialidade</span>
              <Select value={specialtyFilter} onChange={(e) => setSpecialtyFilter(e.target.value)}>
                <option value="">Todas as especialidades</option>
                {specialties.map((item: AnyRecord) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </label>
          </Card>

          {error ? (
            <Card className="p-8">
              <Empty label={error} />
            </Card>
          ) : doctors.length === 0 ? (
            <Card className="p-8">
              <Empty
                label={
                  specialtyFilter
                    ? "Nenhum médico ativo encontrado para o filtro selecionado."
                    : "Nenhum médico ativo cadastrado ainda."
                }
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {doctors.map((doctor: AnyRecord) => {
                const specialtyId = String(doctor.specialtyId?._id || doctor.specialtyId || "");
                const specialtyName = resolveName(doctor.specialtyId);
                const photoUrl = doctor.photoUrl || "";

                return (
                  <Card key={doctor._id} className="p-5 flex flex-col gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-16 w-16 overflow-hidden rounded-2xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                        {photoUrl ? (
                          <Image src={photoUrl} alt={doctor.name} width={64} height={64} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                            {getInitials(doctor.name)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-slate-900">{doctor.name}</h3>
                        <p className="text-sm text-slate-500">{specialtyName}</p>
                        {doctor.crm && <p className="text-xs text-slate-400 mt-1">CRM {doctor.crm}</p>}
                      </div>
                    </div>

                    {doctor.bio ? (
                      <p className="text-sm text-slate-600 leading-relaxed">{doctor.bio}</p>
                    ) : (
                      <p className="text-sm text-slate-400 leading-relaxed">
                        Profissional cadastrado e disponível para atendimento.
                      </p>
                    )}

                    <div className="mt-auto pt-2">
                      <Button
                        className="w-full"
                        onClick={() =>
                          router.push(
                            `/paciente?tab=book&specialtyId=${encodeURIComponent(specialtyId)}&doctorId=${encodeURIComponent(
                              doctor._id
                            )}`
                          )
                        }
                      >
                        Agendar consulta
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </RoleShell>
  );
}
