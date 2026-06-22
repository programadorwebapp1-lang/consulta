"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Calendar, Edit2, KeyRound, MessageCircle, Plus, RefreshCw, Sparkles, Stethoscope, Users, XCircle } from "lucide-react";
import { RoleShell } from "@/components/role-shell";
import { Button, Card, Empty, Input, Modal, PageHeader, Select, StatCard, Textarea } from "@/components/system-ui";
import { PasswordInput } from "@/components/password-input";
import { DAY_NAMES } from "@/lib/medical";
import { PhotoPicker } from "@/components/photo-picker";
import { fireSwal } from "@/lib/swal";
import { PublicSettingsForm } from "@/components/admin/public-settings-form";

type AnyRecord = Record<string, any>;

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: Calendar },
  { id: "doctors", label: "Médicos", icon: Stethoscope },
  { id: "patients", label: "Pacientes", icon: Users },
  { id: "specialties", label: "Especialidades", icon: BadgeCheck },
  { id: "users", label: "Usuários", icon: Users },
  { id: "appointments", label: "Consultas", icon: Calendar },
  { id: "publicPage", label: "Página Pública", icon: Sparkles },
];

function resolveName(value: any) {
  if (!value) return "—";
  if (typeof value === "string") return value;
  return value.name || value.email || value.title || "—";
}

function activeLabel(active: boolean) {
  return active ? "Ativo" : "Inativo";
}

function cleanPhone(value?: string) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeWhatsAppPhone(value?: string) {
  const digits = cleanPhone(value);
  if (!digits) return "";
  return digits.startsWith("55") && digits.length > 11 ? digits : `55${digits}`;
}

function buildWhatsAppLink(patient: AnyRecord, appointment: AnyRecord) {
  const phone = normalizeWhatsAppPhone(patient?.phone);
  if (!phone) return "";

  const doctorName = resolveName(appointment.doctorId);
  const specialtyName = resolveName(appointment.specialtyId);
  const patientName = resolveName(patient);
  const message = [
    `Olá, ${patientName}!`,
    "",
    `A sua consulta está agendada para ${appointment.date} às ${appointment.time}.`,
    `Especialidade: ${specialtyName}.`,
    `Profissional: ${doctorName}.`,
    "",
    "Se precisar reagendar ou confirmar, responda por aqui.",
  ].join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export default function AdminPage() {
  const router = useRouter();
  const [active, setActive] = useState("dashboard");
  const [data, setData] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [doctorModal, setDoctorModal] = useState<AnyRecord | null>(null);
  const [specialtyModal, setSpecialtyModal] = useState<AnyRecord | null>(null);
  const [passwordModal, setPasswordModal] = useState<AnyRecord | null>(null);
  const [patientForm, setPatientForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    birthDate: "",
  });

  async function loadData() {
    setLoading(true);
    const response = await fetch("/api/dashboard", { cache: "no-store" });
    if (response.status === 401) {
      router.replace("/login");
      return;
    }
    const json = await response.json();
    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function request(path: string, options: RequestInit = {}) {
    setMessage("");
    const isFormData = options.body instanceof FormData;
    const response = await fetch(path, {
      headers: isFormData ? options.headers : { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(json.error || "Não foi possível concluir a ação.");
      await fireSwal({
        icon: "error",
        title: "Erro",
        text: json.error || "Não foi possível concluir a ação.",
      });
      return null;
    }
    setMessage("Alteração salva com sucesso.");
    await fireSwal({
      icon: "success",
      title: "Concluído",
      text: "Alteração salva com sucesso.",
    });
    await loadData();
    return json;
  }

  const stats = useMemo(() => {
    const doctors = data?.doctors || [];
    const patients = data?.patients || [];
    const specialties = data?.specialties || [];
    const appointments = data?.appointments || [];
    return {
      doctors: doctors.filter((item: AnyRecord) => item.active).length,
      patients: patients.filter((item: AnyRecord) => item.active).length,
      specialties: specialties.filter((item: AnyRecord) => item.active).length,
      appointments: appointments.length,
    };
  }, [data]);

  async function saveDoctor() {
    const specialtyIds = Array.isArray(doctorModal?.specialtyIds)
      ? doctorModal.specialtyIds.map((item: any) => String(item)).filter(Boolean)
      : doctorModal?.specialtyId
        ? [String(doctorModal.specialtyId?._id || doctorModal.specialtyId)]
        : [];

    if (!doctorModal?.name || !doctorModal?.crm || specialtyIds.length === 0) {
      setMessage("Preencha nome, CRM e selecione ao menos uma especialidade.");
      return;
    }
    const payload = new FormData();
    payload.append("name", doctorModal.name);
    payload.append("email", doctorModal.email || "");
    payload.append("phone", doctorModal.phone || "");
    payload.append("crm", doctorModal.crm);
    payload.append("specialtyId", specialtyIds[0]);
    payload.append("specialtyIds", JSON.stringify(specialtyIds));
    payload.append("active", String(doctorModal.active));
    payload.append("status", doctorModal.active ? "ATIVO" : "INATIVO");
    payload.append("bio", doctorModal.bio || "");
    payload.append("consultationPrice", doctorModal.consultationPrice ?? "");
    payload.append("availableDays", JSON.stringify(doctorModal.availableDays || []));
    payload.append("startTime", doctorModal.startTime || "08:00");
    payload.append("endTime", doctorModal.endTime || "18:00");
    payload.append("slotDuration", String(doctorModal.slotDuration || 30));
    payload.append(
      "schedule",
      JSON.stringify({
        availableDays: doctorModal.availableDays || [],
        startTime: doctorModal.startTime || "08:00",
        endTime: doctorModal.endTime || "18:00",
        slotDuration: doctorModal.slotDuration || 30,
      })
    );
    if (!doctorModal._id && doctorModal.password) {
      payload.append("password", doctorModal.password);
    }
    if (doctorModal.photoFile instanceof File) {
      payload.append("photo", doctorModal.photoFile);
    }
    if (doctorModal.removePhoto) {
      payload.append("removePhoto", "true");
    }
    if (doctorModal._id) {
      await request(`/api/doctors/${doctorModal._id}`, {
        method: "PUT",
        body: payload,
      });
    } else {
      await request("/api/doctors", {
        method: "POST",
        body: payload,
      });
    }
    setDoctorModal(null);
  }

  async function saveSpecialty() {
    if (!specialtyModal?.name) {
      setMessage("Informe o nome da especialidade.");
      return;
    }
    const payload = {
      name: specialtyModal.name,
      description: specialtyModal.description || "",
      consultationPrice: specialtyModal.consultationPrice ?? "",
      showPricePublicly: specialtyModal.showPricePublicly ?? true,
      active: specialtyModal.active ?? true,
    };
    if (specialtyModal._id) {
      await request(`/api/specialties/${specialtyModal._id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      await request("/api/specialties", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
    setSpecialtyModal(null);
  }

  async function savePatient() {
    await request("/api/patients", {
      method: "POST",
      body: JSON.stringify(patientForm),
    });
    setPatientForm({ name: "", email: "", password: "", phone: "", address: "", birthDate: "" });
  }

  async function savePassword() {
    if (!passwordModal?.password || passwordModal.password.length < 6) {
      setMessage("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    await request(`/api/users/${passwordModal._id}/password`, {
      method: "PUT",
      body: JSON.stringify({ password: passwordModal.password }),
    });
    setPasswordModal(null);
  }

  const doctors = data?.doctors || [];
  const specialties = data?.specialties || [];
  const patients = data?.patients || [];
  const appointments = data?.appointments || [];
  const users = data?.users || [];

  function getDoctorSpecialtyIds(doctor: AnyRecord | null | undefined) {
    if (!doctor) return [];
    const ids = Array.isArray(doctor.specialtyIds) ? doctor.specialtyIds : [];
    const normalized = ids.map((item: any) => String(item?._id || item)).filter(Boolean);
    if (normalized.length > 0) return Array.from(new Set(normalized));
    const primary = doctor.specialtyId ? String(doctor.specialtyId?._id || doctor.specialtyId) : "";
    return primary ? [primary] : [];
  }

  function getDoctorSpecialtyNames(doctor: AnyRecord | null | undefined) {
    return getDoctorSpecialtyIds(doctor)
      .map((id) => resolveName(specialties.find((item: AnyRecord) => String(item._id) === id)))
      .filter((name, index, list) => name && list.indexOf(name) === index);
  }

  function setDoctorSpecialtyIds(nextIds: string[]) {
    if (!doctorModal) return;
    setDoctorModal({
      ...doctorModal,
      specialtyIds: nextIds,
      specialtyId: nextIds[0] || "",
    });
  }

  function openDoctorModal(item?: AnyRecord) {
    if (!item) {
      setDoctorModal({
        active: true,
        status: "ATIVO",
        startTime: "08:00",
        endTime: "18:00",
        slotDuration: 30,
        availableDays: [1, 2, 3, 4, 5],
        photoUrl: "",
        photoFile: null,
        removePhoto: false,
        bio: "",
        consultationPrice: "",
        specialtyIds: [],
      });
      return;
    }

    const specialtyIds = getDoctorSpecialtyIds(item);
    setDoctorModal({
      ...item,
      specialtyIds,
      specialtyId: specialtyIds[0] || item.specialtyId || "",
      active: item.active !== false,
      availableDays: Array.isArray(item.availableDays) ? item.availableDays : [1, 2, 3, 4, 5],
      photoFile: null,
      removePhoto: false,
    });
  }

  return (
    <RoleShell
      userName={data?.user?.name || "Administrador"}
      roleLabel="Administrador"
      clinicName={data?.clinicSettings?.clinicName || "MediClinic"}
      clinicLogoUrl={data?.clinicSettings?.logoUrl || ""}
      navItems={navItems}
      active={active}
      onNavigate={setActive}
      onLogout={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
      }}
    >
      {loading ? (
        <Card className="p-8 text-sm text-slate-500">Carregando dados...</Card>
      ) : (
        <>
          {message && <div className="mb-4 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-700">{message}</div>}

          {active === "dashboard" && (
            <div>
              <PageHeader
                title="Dashboard"
                sub="Visão geral do consultório"
                action={<Button variant="secondary" onClick={loadData}><RefreshCw className="w-4 h-4" />Atualizar</Button>}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                <StatCard label="Médicos ativos" value={stats.doctors} icon={Stethoscope} color="bg-sky-50 text-sky-600" />
                <StatCard label="Pacientes ativos" value={stats.patients} icon={Users} color="bg-violet-50 text-violet-600" />
                <StatCard label="Especialidades" value={stats.specialties} icon={BadgeCheck} color="bg-emerald-50 text-emerald-600" />
                <StatCard label="Consultas" value={stats.appointments} icon={Calendar} color="bg-amber-50 text-amber-600" />
              </div>

              <Card>
                <div className="px-5 py-4 border-b border-slate-50">
                  <h2 className="font-semibold text-slate-800">Consultas registradas</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                      {["Data", "Hora", "Paciente", "Médico", "Especialidade", "Status", "Contato"].map((item) => (
                          <th key={item} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">{item}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {appointments.length === 0 ? (
                        <tr>
                          <td colSpan={7}><Empty label="Nenhuma consulta registrada." /></td>
                        </tr>
                      ) : (
                        appointments.map((item: AnyRecord) => (
                          <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 text-slate-600 text-xs">{item.date}</td>
                            <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{item.time}</td>
                            <td className="px-4 py-3 text-slate-700">{resolveName(item.patientId)}</td>
                            <td className="px-4 py-3 text-slate-600">{resolveName(item.doctorId)}</td>
                            <td className="px-4 py-3 text-slate-500">{resolveName(item.specialtyId)}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                {item.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {item.status === "AGENDADA" && item.patientId?.phone ? (
                                <a
                                  href={buildWhatsAppLink(item.patientId, item)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                  WhatsApp
                                </a>
                              ) : (
                                <span className="text-xs text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {active === "doctors" && (
            <div>
              <PageHeader
                title="Médicos"
                sub="Cadastro, edição e inativação de médicos"
                action={<Button onClick={() => openDoctorModal()}><Plus className="w-4 h-4" />Novo Médico</Button>}
              />
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {["Foto", "Nome", "CRM", "Especialidade", "Contato", "Status", "Ações"].map((item) => (
                          <th key={item} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">{item}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {doctors.length === 0 ? (
                        <tr><td colSpan={7}><Empty label="Nenhum médico cadastrado." /></td></tr>
                      ) : doctors.map((item: AnyRecord) => (
                        <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="h-10 w-10 overflow-hidden rounded-xl bg-slate-100 flex items-center justify-center">
                              {item.photoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.photoUrl} alt={item.name} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-xs font-bold text-slate-500">{(item.name || "MD").split(" ").filter(Boolean).slice(0, 2).map((part: string) => part[0]?.toUpperCase() || "").join("") || "MD"}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-xs">{item.crm}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {getDoctorSpecialtyNames(item).join(", ") || resolveName(item.specialtyId)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{item.email || item.phone || "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.active ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
                              {activeLabel(item.active)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openDoctorModal(item)}><Edit2 className="w-3.5 h-3.5" /></Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  const result = await fireSwal({
                                    icon: "warning",
                                    title: "Inativar médico?",
                                    text: "O médico não será excluído se houver consultas vinculadas, apenas ficará inativo.",
                                    showCancelButton: true,
                                    confirmButtonText: "Sim, inativar",
                                    cancelButtonText: "Cancelar",
                                  });
                                  if (result.isConfirmed) {
                                    await request(`/api/doctors/${item._id}`, { method: "DELETE" });
                                  }
                                }}
                              >
                                <XCircle className="w-3.5 h-3.5 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {active === "specialties" && (
            <div>
              <PageHeader
                title="Especialidades"
                sub="Cadastro, edição e inativação de especialidades"
                action={<Button onClick={() => setSpecialtyModal({ active: true, showPricePublicly: true, consultationPrice: "" })}><Plus className="w-4 h-4" />Nova Especialidade</Button>}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {specialties.length === 0 ? (
                  <Card className="p-8"><Empty label="Nenhuma especialidade cadastrada." /></Card>
                ) : specialties.map((item: AnyRecord) => (
                  <Card key={item._id} className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-800">{item.name}</h3>
                        <p className="text-sm text-slate-500 mt-1">{item.description || "Sem descrição"}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.active ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
                        {activeLabel(item.active)}
                      </span>
                    </div>
                    <div className="flex gap-1 mt-4">
                      <Button variant="ghost" size="sm" onClick={() => setSpecialtyModal(item)}><Edit2 className="w-3.5 h-3.5" /></Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          const result = await fireSwal({
                            icon: "warning",
                            title: "Inativar especialidade?",
                            text: "A especialidade não será removida se já houver consultas vinculadas.",
                            showCancelButton: true,
                            confirmButtonText: "Sim, inativar",
                            cancelButtonText: "Cancelar",
                          });
                          if (result.isConfirmed) {
                            await request(`/api/specialties/${item._id}`, { method: "DELETE" });
                          }
                        }}
                      >
                        <XCircle className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {active === "patients" && (
            <div>
              <PageHeader title="Pacientes" sub="Cadastro de pacientes com dados reais" />
              <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
                <Card className="p-5 space-y-4">
                  <h2 className="font-semibold text-slate-800">Novo paciente</h2>
                  {[
                    ["name", "Nome"],
                    ["email", "E-mail"],
                    ["password", "Senha"],
                    ["phone", "Telefone"],
                    ["address", "Endereço"],
                    ["birthDate", "Data de nascimento"],
                  ].map(([key, label]) => (
                    <label key={key} className="block">
                      <span className="text-sm font-medium text-slate-700">{label}</span>
                      <Input
                        value={(patientForm as AnyRecord)[key]}
                        onChange={(e) => setPatientForm((curr) => ({ ...curr, [key]: e.target.value }))}
                        type={key === "birthDate" ? "date" : key === "password" ? "password" : "text"}
                      />
                    </label>
                  ))}
                  <Button onClick={savePatient} className="w-full">Cadastrar paciente</Button>
                </Card>

                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100">
                          {["Nome", "Contato", "Nascimento", "Status"].map((item) => (
                            <th key={item} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">{item}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {patients.length === 0 ? (
                          <tr><td colSpan={4}><Empty label="Nenhum paciente cadastrado." /></td></tr>
                        ) : patients.map((item: AnyRecord) => (
                          <tr key={item._id}>
                            <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                            <td className="px-4 py-3 text-slate-600">{item.email || item.phone}</td>
                            <td className="px-4 py-3 text-slate-600">{item.birthDate}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.active ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
                                {activeLabel(item.active)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {active === "appointments" && (
            <div>
              <PageHeader title="Consultas" sub="Consulta, status e histórico" />
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {["Data", "Hora", "Paciente", "Médico", "Especialidade", "Status"].map((item) => (
                          <th key={item} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">{item}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {appointments.length === 0 ? (
                        <tr><td colSpan={6}><Empty label="Nenhuma consulta encontrada." /></td></tr>
                      ) : appointments.map((item: AnyRecord) => (
                        <tr key={item._id}>
                          <td className="px-4 py-3 text-slate-600 text-xs">{item.date}</td>
                          <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{item.time}</td>
                          <td className="px-4 py-3 text-slate-800 font-medium">{resolveName(item.patientId)}</td>
                          <td className="px-4 py-3 text-slate-600">{resolveName(item.doctorId)}</td>
                          <td className="px-4 py-3 text-slate-500">{resolveName(item.specialtyId)}</td>
                          <td className="px-4 py-3">
                            <Select
                              value={item.status}
                              onChange={(e) => request("/api/appointments", {
                                method: "PATCH",
                                body: JSON.stringify({ appointmentId: item._id, status: e.target.value }),
                              })}
                              className="max-w-44"
                            >
                              {["AGENDADA", "CONFIRMADA", "EM_ATENDIMENTO", "FINALIZADA", "CANCELADA"].map((status) => (
                                <option key={status} value={status}>{status}</option>
                              ))}
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {active === "users" && (
            <div>
              <PageHeader title="Usuários" sub="Controle de acesso e status de conta" />
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {["Nome", "E-mail", "Perfil", "Status", "Ações"].map((item) => (
                          <th key={item} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">{item}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {users.length === 0 ? (
                        <tr><td colSpan={5}><Empty label="Nenhum usuário encontrado." /></td></tr>
                      ) : users.map((item: AnyRecord) => (
                        <tr key={item._id}>
                          <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                          <td className="px-4 py-3 text-slate-600">{item.email}</td>
                          <td className="px-4 py-3 text-slate-500">{item.role}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.active ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
                              {activeLabel(item.active)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={item._id === data?.user?.id}
                                onClick={() => request("/api/users", {
                                  method: "PATCH",
                                  body: JSON.stringify({ userId: item._id, active: !item.active }),
                                })}
                              >
                                {item._id === data?.user?.id ? "Conta atual" : item.active ? "Inativar" : "Ativar"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPasswordModal({ ...item, password: "" })}
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                {item._id === data?.user?.id ? "Trocar minha senha" : "Trocar senha"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {active === "publicPage" && (
            <div>
              <PageHeader
                title="Configurações da Página Pública"
                sub="Identidade visual, galeria e visibilidade dos preços"
              />
              <PublicSettingsForm
                initialSettings={data?.clinicSettings || {}}
                onSaved={(clinicSettings) => setData((curr) => (curr ? { ...curr, clinicSettings } : curr))}
              />
            </div>
          )}

          {doctorModal && (
            <Modal title={doctorModal._id ? "Editar Médico" : "Novo Médico"} onClose={() => setDoctorModal(null)} wide>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="md:col-span-2 block"><span className="text-sm font-medium text-slate-700">Nome</span><Input value={doctorModal.name || ""} onChange={(e) => setDoctorModal({ ...doctorModal, name: e.target.value })} /></label>
                <label className="block"><span className="text-sm font-medium text-slate-700">CRM</span><Input value={doctorModal.crm || ""} onChange={(e) => setDoctorModal({ ...doctorModal, crm: e.target.value })} /></label>
                <label className="block"><span className="text-sm font-medium text-slate-700">E-mail</span><Input value={doctorModal.email || ""} onChange={(e) => setDoctorModal({ ...doctorModal, email: e.target.value })} /></label>
                <label className="block"><span className="text-sm font-medium text-slate-700">Telefone</span><Input value={doctorModal.phone || ""} onChange={(e) => setDoctorModal({ ...doctorModal, phone: e.target.value })} /></label>
                {!doctorModal._id && (
                  <PasswordInput
                    label="Senha"
                    value={doctorModal.password || ""}
                    onChange={(value) => setDoctorModal({ ...doctorModal, password: value })}
                  />
                )}
                <div className="md:col-span-2 block">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-700">Especialidades</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setDoctorSpecialtyIds(specialties.map((item: AnyRecord) => String(item._id)).filter(Boolean))}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Selecionar todas
                      </button>
                      <button
                        type="button"
                        onClick={() => setDoctorSpecialtyIds([])}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {specialties.map((item: AnyRecord) => {
                      const selected = getDoctorSpecialtyIds(doctorModal).includes(String(item._id));
                      return (
                        <button
                          key={item._id}
                          type="button"
                          onClick={() => {
                            const current = getDoctorSpecialtyIds(doctorModal);
                            const next = selected
                              ? current.filter((id) => id !== String(item._id))
                              : [...current, String(item._id)];
                            setDoctorSpecialtyIds(Array.from(new Set(next)));
                          }}
                          className={`rounded-2xl border px-4 py-2 text-sm font-medium transition-all ${
                            selected
                              ? "border-sky-500 bg-sky-50 text-sky-700 shadow-sm"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {item.name}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    O médico pode ser vinculado a mais de uma especialidade. A primeira selecionada será mantida como principal para compatibilidade.
                  </p>
                </div>
                <label className="block"><span className="text-sm font-medium text-slate-700">Preço da consulta</span><Input type="number" step="0.01" min="0" value={doctorModal.consultationPrice ?? ""} onChange={(e) => setDoctorModal({ ...doctorModal, consultationPrice: e.target.value })} placeholder="Opcional" /></label>
                <label className="block"><span className="text-sm font-medium text-slate-700">Status</span><Select value={doctorModal.active ? "true" : "false"} onChange={(e) => setDoctorModal({ ...doctorModal, active: e.target.value === "true" })}>
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </Select></label>
                <div className="md:col-span-2">
                  <PhotoPicker
                    label="Foto do médico"
                    name={doctorModal.name || ""}
                    currentUrl={doctorModal.photoUrl || ""}
                    onFileChange={(file) => setDoctorModal({ ...doctorModal, photoFile: file, removePhoto: false })}
                    onRemove={() => setDoctorModal({ ...doctorModal, photoFile: null, removePhoto: true })}
                    helperText="Envie JPG, PNG ou WEBP."
                  />
                </div>
                <label className="md:col-span-2 block">
                  <span className="text-sm font-medium text-slate-700">Biografia profissional</span>
                  <Textarea
                    rows={4}
                    value={doctorModal.bio || ""}
                    onChange={(e) => setDoctorModal({ ...doctorModal, bio: e.target.value })}
                    placeholder="Resumo da experiência, formação e áreas de atuação"
                  />
                </label>
                <div className="block md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Dias de atendimento</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DAY_NAMES.map((label, index) => {
                      const selected = (doctorModal.availableDays || []).includes(index);
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() =>
                            setDoctorModal({
                              ...doctorModal,
                              availableDays: selected
                                ? (doctorModal.availableDays || []).filter((item: number) => item !== index)
                                : [...(doctorModal.availableDays || []), index].sort(),
                            })
                          }
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            selected ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Selecione os dias em que o médico atende. O sistema salva isso como números de 0 a 6.</p>
                </div>
                <label className="block"><span className="text-sm font-medium text-slate-700">Início</span><Input type="time" value={doctorModal.startTime || "08:00"} onChange={(e) => setDoctorModal({ ...doctorModal, startTime: e.target.value })} /></label>
                <label className="block"><span className="text-sm font-medium text-slate-700">Fim</span><Input type="time" value={doctorModal.endTime || "18:00"} onChange={(e) => setDoctorModal({ ...doctorModal, endTime: e.target.value })} /></label>
                <label className="block"><span className="text-sm font-medium text-slate-700">Duração</span><Input type="number" value={doctorModal.slotDuration || 30} onChange={(e) => setDoctorModal({ ...doctorModal, slotDuration: Number(e.target.value) })} /></label>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="secondary" onClick={() => setDoctorModal(null)}>Cancelar</Button>
                <Button onClick={saveDoctor}>Salvar</Button>
              </div>
            </Modal>
          )}

          {specialtyModal && (
            <Modal title={specialtyModal._id ? "Editar Especialidade" : "Nova Especialidade"} onClose={() => setSpecialtyModal(null)}>
              <div className="space-y-4">
                <label className="block"><span className="text-sm font-medium text-slate-700">Nome</span><Input value={specialtyModal.name || ""} onChange={(e) => setSpecialtyModal({ ...specialtyModal, name: e.target.value })} /></label>
                <label className="block"><span className="text-sm font-medium text-slate-700">Descrição</span><Textarea value={specialtyModal.description || ""} onChange={(e) => setSpecialtyModal({ ...specialtyModal, description: e.target.value })} /></label>
                <label className="block"><span className="text-sm font-medium text-slate-700">Preço da consulta</span><Input type="number" step="0.01" min="0" value={specialtyModal.consultationPrice ?? ""} onChange={(e) => setSpecialtyModal({ ...specialtyModal, consultationPrice: e.target.value })} placeholder="Opcional" /></label>
                <label className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={specialtyModal.showPricePublicly ?? true}
                    onChange={(e) => setSpecialtyModal({ ...specialtyModal, showPricePublicly: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Mostrar preço publicamente</span>
                </label>
                <label className="block"><span className="text-sm font-medium text-slate-700">Status</span><Select value={specialtyModal.active ? "true" : "false"} onChange={(e) => setSpecialtyModal({ ...specialtyModal, active: e.target.value === "true" })}>
                  <option value="true">Ativa</option>
                  <option value="false">Inativa</option>
                </Select></label>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="secondary" onClick={() => setSpecialtyModal(null)}>Cancelar</Button>
                <Button onClick={saveSpecialty}>Salvar</Button>
              </div>
            </Modal>
          )}

          {passwordModal && (
            <Modal
              title={passwordModal._id === data?.user?.id ? "Trocar minha senha" : `Trocar senha de ${passwordModal.name}`}
              onClose={() => setPasswordModal(null)}
            >
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {passwordModal.role === "ADMIN"
                    ? "A senha será atualizada para a sua própria conta de administrador."
                    : "A senha será atualizada para a conta do médico selecionado."}
                </div>
                <PasswordInput
                  label="Nova senha"
                  value={passwordModal.password || ""}
                  onChange={(value) => setPasswordModal({ ...passwordModal, password: value })}
                  placeholder="Digite a nova senha"
                />
                <PasswordInput
                  label="Confirmar senha"
                  value={passwordModal.confirmPassword || ""}
                  onChange={(value) => setPasswordModal({ ...passwordModal, confirmPassword: value })}
                  placeholder="Repita a nova senha"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="secondary" onClick={() => setPasswordModal(null)}>Cancelar</Button>
                <Button
                  onClick={async () => {
                    if (passwordModal.password !== passwordModal.confirmPassword) {
                      setMessage("As senhas informadas não conferem.");
                      return;
                    }
                    await savePassword();
                  }}
                >
                  Salvar senha
                </Button>
              </div>
            </Modal>
          )}
        </>
      )}
    </RoleShell>
  );
}
