"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, Eye, EyeOff, FileText, LockKeyhole, MessageCircle, RefreshCw, Stethoscope } from "lucide-react";
import { RoleShell } from "@/components/role-shell";
import { Button, Card, Empty, Input, Modal, PageHeader, Select, StatCard, Textarea } from "@/components/system-ui";
import { DAY_NAMES } from "@/lib/medical";
import { PhotoPicker } from "@/components/photo-picker";
import { fireSwal } from "@/lib/swal";

type AnyRecord = Record<string, any>;

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: Calendar },
  { id: "appointments", label: "Consultas", icon: Calendar },
  { id: "schedule", label: "Agenda", icon: Clock },
  { id: "profile", label: "Perfil", icon: Stethoscope },
];

function resolveName(value: any) {
  if (!value) return "-";
  if (typeof value === "string") return value;
  return value.name || value.email || "-";
}

function canDoctorChangeStatus(status?: string) {
  return status === "AGENDADA" || status === "CONFIRMADA" || status === "EM_ATENDIMENTO";
}

function getLocalDateTimeParts() {
  const now = new Date();
  const date = now.toLocaleDateString("sv-SE", { timeZone: "America/Rio_Branco" });
  const time = now.toLocaleTimeString("en-GB", {
    timeZone: "America/Rio_Branco",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  return { date, time };
}

function canStartAppointment(appointment: AnyRecord) {
  if (!appointment || appointment.status === "CANCELADA" || appointment.status === "FINALIZADA") return false;
  const current = getLocalDateTimeParts();
  return appointment.date < current.date || (appointment.date === current.date && appointment.time <= current.time);
}

function cleanPhone(value?: string) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeWhatsAppPhone(value?: string) {
  const digits = cleanPhone(value);
  if (!digits) return "";
  return digits.startsWith("55") && digits.length > 11 ? digits : `55${digits}`;
}

function buildWhatsAppLink(patient: AnyRecord, appointment: AnyRecord, doctorName?: string) {
  const phone = normalizeWhatsAppPhone(patient?.phone);
  if (!phone) return "";
  const resolvedDoctorName = doctorName || resolveName(appointment.doctorId);

  const message = [
    `Olá, ${resolveName(patient)}!`,
    "",
    `Sua consulta está agendada para ${appointment.date} às ${appointment.time}.`,
    `Especialidade: ${resolveName(appointment.specialtyId)}.`,
    `Médico: ${resolvedDoctorName}.`,
    "",
    "Se precisar de ajuda para confirmar ou reagendar, me avise por aqui.",
  ].join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export default function DoctorPage() {
  const router = useRouter();
  const [active, setActive] = useState("dashboard");
  const [data, setData] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [notesModal, setNotesModal] = useState<AnyRecord | null>(null);
  const [notes, setNotes] = useState("");
  const [passwordModal, setPasswordModal] = useState<AnyRecord | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    bio: "",
    photoUrl: "",
    photoFile: null as File | null,
    removePhoto: false,
  });
  const [scheduleForm, setScheduleForm] = useState({
    availableDays: [] as number[],
    startTime: "08:00",
    endTime: "18:00",
    slotDuration: 30,
    lunchStart: "",
    lunchEnd: "",
    blockDate: "",
    vacationDate: "",
    blockSlotDate: "",
    blockSlotTime: "",
    blockReason: "",
  });

  function getDoctorSpecialtyNames(doctor: AnyRecord | null | undefined) {
    const specialties = data?.specialties || [];
    const ids = [
      String(doctor?.specialtyId?._id || doctor?.specialtyId || ""),
      ...(Array.isArray(doctor?.specialtyIds) ? doctor.specialtyIds.map((item: AnyRecord) => String(item?._id || item)) : []),
    ].filter(Boolean);

    return ids
      .map((id) => resolveName(specialties.find((item: AnyRecord) => String(item._id) === id)))
      .filter((name, index, list) => name && list.indexOf(name) === index);
  }

  async function loadData() {
    setLoading(true);
    const response = await fetch("/api/dashboard", { cache: "no-store" });
    if (response.status === 401) {
      router.replace("/login");
      return;
    }
    const json = await response.json();
    setData(json);
    const schedule = json.schedule || {};
    const doctor = json.doctor || {};
    setProfileForm({
      name: doctor.name || "",
      phone: doctor.phone || "",
      bio: doctor.bio || "",
      photoUrl: doctor.photoUrl || "",
      photoFile: null,
      removePhoto: false,
    });
    setScheduleForm((curr) => ({
      ...curr,
      availableDays: schedule.availableDays || [],
      startTime: schedule.startTime || "08:00",
      endTime: schedule.endTime || "18:00",
      slotDuration: schedule.slotDuration || 30,
      lunchStart: schedule.lunchStart || "",
      lunchEnd: schedule.lunchEnd || "",
    }));
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
      setMessage(json.error || "Nao foi possivel concluir a acao.");
      await fireSwal({
        icon: "error",
        title: "Erro",
        text: json.error || "Nao foi possivel concluir a acao.",
      });
      return null;
    }
    setMessage("Alteracao salva com sucesso.");
    await fireSwal({
      icon: "success",
      title: "Concluido",
      text: "Alteracao salva com sucesso.",
    });
    await loadData();
    return json;
  }

  const appointments = data?.appointments || [];
  const currentDoctorName = resolveName(data?.doctor);
  const today = useMemo(() => {
    const day = getLocalDateTimeParts().date;
    return appointments.filter((item: AnyRecord) => item.date === day);
  }, [appointments]);

  async function saveSchedule() {
    await request("/api/schedules", {
      method: "PUT",
      body: JSON.stringify({
        availableDays: scheduleForm.availableDays,
        startTime: scheduleForm.startTime,
        endTime: scheduleForm.endTime,
        slotDuration: scheduleForm.slotDuration,
        lunchStart: scheduleForm.lunchStart,
        lunchEnd: scheduleForm.lunchEnd,
      }),
    });
  }

  async function saveProfile() {
    if (!data?.doctor?._id) return;
    const formData = new FormData();
    formData.append("name", profileForm.name);
    formData.append("phone", profileForm.phone);
    formData.append("bio", profileForm.bio);
    if (profileForm.photoFile instanceof File) {
      formData.append("photo", profileForm.photoFile);
    }
    if (profileForm.removePhoto) {
      formData.append("removePhoto", "true");
    }
    await request(`/api/doctors/${data.doctor._id}`, {
      method: "PUT",
      body: formData,
    });
  }

  async function savePassword() {
    if (!data?.doctor?._id || !passwordModal) return;
    if (!passwordModal.currentPassword || !passwordModal.password) {
      setMessage("Informe a senha atual e a nova senha.");
      return;
    }
    if (passwordModal.password.length < 6) {
      setMessage("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (passwordModal.password !== passwordModal.confirmPassword) {
      setMessage("A confirmação da nova senha não confere.");
      return;
    }

    await request(`/api/doctors/${data.doctor._id}/password`, {
      method: "PUT",
      body: JSON.stringify({
        currentPassword: passwordModal.currentPassword,
        password: passwordModal.password,
      }),
    });
    setPasswordModal(null);
    setShowPassword(false);
  }

  async function blockDate() {
    if (!scheduleForm.blockDate) return;
    await request("/api/schedules", {
      method: "POST",
      body: JSON.stringify({ type: "DATE", date: scheduleForm.blockDate, reason: scheduleForm.blockReason }),
    });
    setScheduleForm((curr) => ({ ...curr, blockDate: "", blockReason: "" }));
  }

  async function blockVacation() {
    if (!scheduleForm.vacationDate) return;
    await request("/api/schedules", {
      method: "POST",
      body: JSON.stringify({ type: "VACATION", date: scheduleForm.vacationDate, reason: scheduleForm.blockReason }),
    });
    setScheduleForm((curr) => ({ ...curr, vacationDate: "", blockReason: "" }));
  }

  async function blockSlot() {
    if (!scheduleForm.blockSlotDate || !scheduleForm.blockSlotTime) return;
    await request("/api/schedules", {
      method: "POST",
      body: JSON.stringify({
        type: "SLOT",
        date: scheduleForm.blockSlotDate,
        time: scheduleForm.blockSlotTime,
        reason: scheduleForm.blockReason,
      }),
    });
    setScheduleForm((curr) => ({ ...curr, blockSlotDate: "", blockSlotTime: "", blockReason: "" }));
  }

  async function updateStatus(appointmentId: string, status: string) {
    if (status === "CANCELADA") {
      const result = await fireSwal({
        icon: "warning",
        title: "Cancelar consulta?",
        text: "Essa acao sera salva na agenda.",
        showCancelButton: true,
        confirmButtonText: "Sim, cancelar",
        cancelButtonText: "Nao",
      });
      if (!result.isConfirmed) return;
    }
    await request("/api/appointments", {
      method: "PATCH",
      body: JSON.stringify({ appointmentId, status }),
    });
  }

  async function saveNotes() {
    if (!notesModal) return;
    await request("/api/appointments", {
      method: "PATCH",
      body: JSON.stringify({ appointmentId: notesModal._id, status: notesModal.status, notes }),
    });
    setNotesModal(null);
  }

  return (
    <RoleShell
      userName={data?.user?.name || "Medico"}
      roleLabel="Medico"
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
        <Card className="p-8 text-sm text-slate-500">Carregando agenda real...</Card>
      ) : (
        <>
          {message && <div className="mb-4 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-700">{message}</div>}

          {active === "dashboard" && (
            <div>
              <PageHeader
                title={`Ola, ${data?.user?.name || "Medico"}`}
                sub="Agenda e consultas do medico autenticado"
                action={
                  <Button variant="secondary" onClick={loadData}>
                    <RefreshCw className="w-4 h-4" />
                    Atualizar
                  </Button>
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
                <StatCard label="Consultas hoje" value={today.length} icon={Calendar} color="bg-sky-50 text-sky-600" />
                <StatCard label="Consultas totais" value={appointments.length} icon={Stethoscope} color="bg-violet-50 text-violet-600" />
                <StatCard label="Agenda configurada" value={data?.schedule ? "Sim" : "Nao"} icon={Clock} color="bg-emerald-50 text-emerald-600" />
              </div>
              <Card>
                <div className="px-5 py-4 border-b border-slate-50">
                  <h2 className="font-semibold text-slate-800">Consultas de hoje</h2>
                </div>
                <div className="divide-y divide-slate-50">
                  {today.length === 0 ? (
                    <Empty label="Nenhuma consulta agendada para hoje." />
                  ) : (
                    today.map((item: AnyRecord) => (
                      <div key={item._id} className="px-5 py-3.5 flex flex-wrap items-center gap-4">
                        <div className="text-center w-12 flex-shrink-0">
                          <p className="font-mono text-sm font-bold text-slate-700">{item.time}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 truncate">{resolveName(item.patientId)}</p>
                          <p className="text-xs text-slate-500">{getDoctorSpecialtyNames(item).join(", ") || resolveName(item.specialtyId)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.status !== "CANCELADA" && item.status !== "FINALIZADA" && item.patientId?.phone ? (
                            <a
                              href={buildWhatsAppLink(item.patientId, item, currentDoctorName)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-100 hover:shadow-md active:translate-y-0"
                            >
                              <MessageCircle className="h-4 w-4" />
                              WhatsApp
                            </a>
                          ) : null}
                          {canStartAppointment(item) ? (
                            <Button size="sm" onClick={() => router.push(`/medico/prontuario/${item._id}`)}>
                              Iniciar Atendimento
                            </Button>
                          ) : null}
                          {canDoctorChangeStatus(item.status) ? (
                            <Select value={item.status} onChange={(e) => updateStatus(item._id, e.target.value)} className="w-44">
                              {["AGENDADA", "CONFIRMADA", "EM_ATENDIMENTO", "FINALIZADA", "CANCELADA"].map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </Select>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              {item.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          )}

          {active === "appointments" && (
            <div>
              <PageHeader title="Consultas" sub="Historico, status e observações clinicas" />
              <div className="space-y-3">
                {appointments.length === 0 ? (
                  <Card className="p-8">
                    <Empty label="Nenhuma consulta encontrada." />
                  </Card>
                ) : (
                  appointments.map((item: AnyRecord) => (
                    <Card key={item._id} className="p-5">
                      <div className="flex flex-wrap items-start gap-4">
                        <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center text-violet-700 font-bold flex-shrink-0">
                          {(resolveName(item.patientId) || "?").charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900">{resolveName(item.patientId)}</h3>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              {item.status}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500">
                            {item.date} as {item.time}
                          </p>
                          {item.notes && (
                            <p className="text-xs text-slate-500 mt-2 bg-slate-50 px-3 py-2 rounded-lg italic">{item.notes}</p>
                          )}
                        </div>
                          <div className="flex flex-wrap gap-2 flex-shrink-0">
                          {item.status !== "CANCELADA" && item.status !== "FINALIZADA" && item.patientId?.phone ? (
                            <a
                              href={buildWhatsAppLink(item.patientId, item, currentDoctorName)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-100 hover:shadow-md active:translate-y-0"
                            >
                              <MessageCircle className="h-4 w-4" />
                              WhatsApp
                            </a>
                          ) : null}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setNotesModal(item);
                              setNotes(item.notes || "");
                            }}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Observações
                          </Button>
                          {canDoctorChangeStatus(item.status) ? (
                            <>
                              {["CONFIRMADA", "EM_ATENDIMENTO", "FINALIZADA", "CANCELADA"].map((status) => (
                                <Button
                                  key={status}
                                  size="sm"
                                  variant={status === "CANCELADA" ? "danger" : "primary"}
                                  onClick={() => updateStatus(item._id, status)}
                                >
                                  {status}
                                </Button>
                              ))}
                            </>
                          ) : null}
                          {canStartAppointment(item) ? (
                            <Button size="sm" onClick={() => router.push(`/medico/prontuario/${item._id}`)}>
                              Iniciar Atendimento
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {active === "schedule" && (
            <div>
              <PageHeader title="Agenda" sub="Dias de atendimento, bloqueios e horarios" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 space-y-6">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-3">Dias de atendimento</p>
                    <div className="flex flex-wrap gap-2">
                      {DAY_NAMES.map((label, index) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() =>
                            setScheduleForm((curr) => ({
                              ...curr,
                              availableDays: curr.availableDays.includes(index)
                                ? curr.availableDays.filter((item) => item !== index)
                                : [...curr.availableDays, index].sort(),
                            }))
                          }
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 ${
                            scheduleForm.availableDays.includes(index)
                              ? "bg-sky-600 text-white"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      Selecione os dias em que o medico atende. O sistema salva isso como numeros de 0 a 6.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Inicio</span>
                      <Input
                        type="time"
                        value={scheduleForm.startTime}
                        onChange={(e) => setScheduleForm((curr) => ({ ...curr, startTime: e.target.value }))}
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Fim</span>
                      <Input
                        type="time"
                        value={scheduleForm.endTime}
                        onChange={(e) => setScheduleForm((curr) => ({ ...curr, endTime: e.target.value }))}
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Duracao da consulta</span>
                    <Input
                      type="number"
                      value={scheduleForm.slotDuration}
                      onChange={(e) => setScheduleForm((curr) => ({ ...curr, slotDuration: Number(e.target.value) }))}
                    />
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Inicio do almoco</span>
                      <Input
                        type="time"
                        value={scheduleForm.lunchStart}
                        onChange={(e) => setScheduleForm((curr) => ({ ...curr, lunchStart: e.target.value }))}
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Fim do almoco</span>
                      <Input
                        type="time"
                        value={scheduleForm.lunchEnd}
                        onChange={(e) => setScheduleForm((curr) => ({ ...curr, lunchEnd: e.target.value }))}
                      />
                    </label>
                  </div>
                  <Button onClick={saveSchedule} className="w-full">
                    Salvar agenda
                  </Button>
                </Card>

                <div className="space-y-4">
                  <Card className="p-5 space-y-3">
                    <h2 className="font-semibold text-slate-800">Bloquear data</h2>
                    <Input type="date" value={scheduleForm.blockDate} onChange={(e) => setScheduleForm((curr) => ({ ...curr, blockDate: e.target.value }))} />
                    <Textarea placeholder="Motivo opcional" value={scheduleForm.blockReason} onChange={(e) => setScheduleForm((curr) => ({ ...curr, blockReason: e.target.value }))} />
                    <Button onClick={blockDate}>Bloquear data</Button>
                  </Card>

                  <Card className="p-5 space-y-3">
                    <h2 className="font-semibold text-slate-800">Ferias / folga</h2>
                    <Input type="date" value={scheduleForm.vacationDate} onChange={(e) => setScheduleForm((curr) => ({ ...curr, vacationDate: e.target.value }))} />
                    <Textarea placeholder="Motivo opcional" value={scheduleForm.blockReason} onChange={(e) => setScheduleForm((curr) => ({ ...curr, blockReason: e.target.value }))} />
                    <Button onClick={blockVacation}>Registrar ferias</Button>
                  </Card>

                  <Card className="p-5 space-y-3">
                    <h2 className="font-semibold text-slate-800">Bloquear horario</h2>
                    <Input type="date" value={scheduleForm.blockSlotDate} onChange={(e) => setScheduleForm((curr) => ({ ...curr, blockSlotDate: e.target.value }))} />
                    <Input type="time" value={scheduleForm.blockSlotTime} onChange={(e) => setScheduleForm((curr) => ({ ...curr, blockSlotTime: e.target.value }))} />
                    <Textarea placeholder="Motivo opcional" value={scheduleForm.blockReason} onChange={(e) => setScheduleForm((curr) => ({ ...curr, blockReason: e.target.value }))} />
                    <Button onClick={blockSlot}>Bloquear horario</Button>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {active === "profile" && (
            <div>
              <PageHeader title="Perfil do medico" sub="Atualize foto, biografia e contato do seu cadastro" />
              <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
                <Card className="p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 overflow-hidden rounded-2xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                      {profileForm.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profileForm.photoUrl} alt={data?.doctor?.name || "Medico"} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                          {(data?.doctor?.name || "MD")
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part: string) => part[0]?.toUpperCase() || "")
                            .join("") || "MD"}
                        </div>
                      )}
                    </div>
                    <div>
                      <h2 className="font-semibold text-slate-900">{data?.doctor?.name}</h2>
                      <p className="text-sm text-slate-500">{getDoctorSpecialtyNames(data?.doctor).join(", ") || resolveName(data?.doctor?.specialtyId)}</p>
                    </div>
                  </div>

                  <PhotoPicker
                    label="Foto do perfil"
                    name={profileForm.name || data?.doctor?.name || ""}
                    currentUrl={profileForm.photoUrl}
                    onFileChange={(file) => setProfileForm((curr) => ({ ...curr, photoFile: file, removePhoto: false }))}
                    onRemove={() => setProfileForm((curr) => ({ ...curr, photoFile: null, removePhoto: true }))}
                    helperText="Use JPG, PNG ou WEBP. A imagem vai para o Cloudinary e a URL final fica no MongoDB."
                  />

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Nome</span>
                    <Input value={profileForm.name} onChange={(e) => setProfileForm((curr) => ({ ...curr, name: e.target.value }))} />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Telefone</span>
                    <Input value={profileForm.phone} onChange={(e) => setProfileForm((curr) => ({ ...curr, phone: e.target.value }))} />
                  </label>

                  <Button onClick={saveProfile} className="w-full">
                    Salvar perfil
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => {
                      setPasswordModal({ currentPassword: "", password: "", confirmPassword: "" });
                      setShowPassword(false);
                    }}
                    className="w-full"
                  >
                    <LockKeyhole className="w-4 h-4" />
                    Trocar senha
                  </Button>
                </Card>

                <Card className="p-6">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Biografia profissional</span>
                    <Textarea
                      rows={10}
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm((curr) => ({ ...curr, bio: e.target.value }))}
                      placeholder="Fale sobre sua formacao, areas de atendimento e experiencia"
                    />
                  </label>
                </Card>
              </div>
            </div>
          )}

          {notesModal && (
            <Modal title="Observacoes da consulta" onClose={() => setNotesModal(null)}>
              <p className="text-sm text-slate-500 mb-3">
                Paciente: <strong className="text-slate-800">{resolveName(notesModal.patientId)}</strong>
              </p>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anotacoes clinicas" rows={5} />
              <div className="flex gap-3 justify-end mt-4">
                <Button variant="secondary" onClick={() => setNotesModal(null)}>
                  Cancelar
                </Button>
                <Button onClick={saveNotes}>Salvar</Button>
              </div>
            </Modal>
          )}

          {passwordModal && (
            <Modal
              title="Trocar senha"
              onClose={() => {
                setPasswordModal(null);
                setShowPassword(false);
              }}
            >
              <div className="space-y-4">
                <PasswordField
                  label="Senha atual"
                  value={passwordModal.currentPassword || ""}
                  onChange={(value) => setPasswordModal({ ...passwordModal, currentPassword: value })}
                  showPassword={showPassword}
                  onToggle={() => setShowPassword((curr) => !curr)}
                />
                <PasswordField
                  label="Nova senha"
                  value={passwordModal.password || ""}
                  onChange={(value) => setPasswordModal({ ...passwordModal, password: value })}
                  showPassword={showPassword}
                  onToggle={() => setShowPassword((curr) => !curr)}
                />
                <PasswordField
                  label="Confirmar nova senha"
                  value={passwordModal.confirmPassword || ""}
                  onChange={(value) => setPasswordModal({ ...passwordModal, confirmPassword: value })}
                  showPassword={showPassword}
                  onToggle={() => setShowPassword((curr) => !curr)}
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setPasswordModal(null);
                    setShowPassword(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={savePassword}>Salvar senha</Button>
              </div>
            </Modal>
          )}
        </>
      )}
    </RoleShell>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  showPassword,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  showPassword: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="relative mt-1">
        <Input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-11"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 transition-colors hover:text-slate-700"
          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </label>
  );
}
