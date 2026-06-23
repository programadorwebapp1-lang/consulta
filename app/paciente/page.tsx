"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, CheckCircle, Clock, Plus, RefreshCw, Star, Stethoscope } from "lucide-react";
import { RoleShell } from "@/components/role-shell";
import { Button, Card, Empty, Input, Modal, PageHeader, Select, StatCard } from "@/components/system-ui";
import { fireSwal } from "@/lib/swal";

type AnyRecord = Record<string, any>;

const navItems = [
  { id: "dashboard", label: "Início", icon: Calendar },
  { id: "book", label: "Agendar", icon: Plus },
  { id: "appointments", label: "Minhas consultas", icon: Clock },
  { id: "doctors", label: "Nossos Médicos", icon: Stethoscope },
];

function resolveName(value: any) {
  if (!value) return "—";
  if (typeof value === "string") return value;
  return value.name || value.email || "—";
}

function formatDateLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function canPatientReschedule(status?: string) {
  return status !== "FINALIZADA";
}

function canPatientCancel(status?: string) {
  return status === "AGENDADA" || status === "CONFIRMADA" || status === "EM_ATENDIMENTO";
}

export default function PatientPage() {
  const router = useRouter();
  const [active, setActive] = useState("dashboard");
  const [data, setData] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [specialtyId, setSpecialtyId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availability, setAvailability] = useState<{
    doctors: AnyRecord[];
    schedule: AnyRecord | null;
    availableDates: string[];
    slots: string[];
  }>({
    doctors: [],
    schedule: null,
    availableDates: [],
    slots: [],
  });

  const [rescheduleModal, setRescheduleModal] = useState<AnyRecord | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleAvailabilityLoading, setRescheduleAvailabilityLoading] = useState(false);
  const [rescheduleAvailability, setRescheduleAvailability] = useState<{
    schedule: AnyRecord | null;
    slots: string[];
  }>({
    schedule: null,
    slots: [],
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextSpecialtyId = params.get("specialtyId") || "";
    const nextDoctorId = params.get("doctorId") || "";
    const nextTab = params.get("tab") || "";

    if (nextTab) {
      setActive(nextTab);
    }

    if (nextSpecialtyId) {
      setSpecialtyId(nextSpecialtyId);
    }
    if (nextDoctorId) {
      setDoctorId(nextDoctorId);
    }
    if (nextTab === "book" || nextSpecialtyId || nextDoctorId) {
      setActive("book");
    }
  }, []);

  async function loadAvailability(currentSpecialtyId = specialtyId, currentDoctorId = doctorId, currentDate = date) {
    if (!currentSpecialtyId) {
      setAvailability({
        doctors: [],
        schedule: null,
        availableDates: [],
        slots: [],
      });
      return;
    }

    setAvailabilityLoading(true);
    try {
      const params = new URLSearchParams({
        specialtyId: currentSpecialtyId,
        startDate: new Date().toISOString().split("T")[0],
        days: "30",
      });

      if (currentDoctorId) params.set("doctorId", currentDoctorId);
      if (currentDate) params.set("date", currentDate);

      const response = await fetch(`/api/availability?${params.toString()}`, {
        cache: "no-store",
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const json = await response.json();
      setAvailability({
        doctors: json.doctors || [],
        schedule: json.schedule || null,
        availableDates: json.availableDates || [],
        slots: json.slots || [],
      });
    } finally {
      setAvailabilityLoading(false);
    }
  }

  async function loadRescheduleAvailability(currentDate = rescheduleDate) {
    if (!rescheduleModal) {
      setRescheduleAvailability({ schedule: null, slots: [] });
      return;
    }

    const specialtyValue = String(rescheduleModal.specialtyId?._id || rescheduleModal.specialtyId || "");
    const doctorValue = String(rescheduleModal.doctorId?._id || rescheduleModal.doctorId || "");

    if (!specialtyValue || !doctorValue || !currentDate) {
      setRescheduleAvailability({ schedule: null, slots: [] });
      return;
    }

    setRescheduleAvailabilityLoading(true);
    try {
      const params = new URLSearchParams({
        specialtyId: specialtyValue,
        doctorId: doctorValue,
        startDate: new Date().toISOString().split("T")[0],
        days: "30",
        date: currentDate,
      });

      const response = await fetch(`/api/availability?${params.toString()}`, {
        cache: "no-store",
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const json = await response.json();
      setRescheduleAvailability({
        schedule: json.schedule || null,
        slots: json.slots || [],
      });
    } finally {
      setRescheduleAvailabilityLoading(false);
    }
  }

  useEffect(() => {
    if (active !== "book") return;
    loadAvailability();
  }, [active]);

  useEffect(() => {
    if (active !== "book" || !specialtyId) return;
    loadAvailability(specialtyId, doctorId, date);
  }, [active, specialtyId, doctorId, date]);

  useEffect(() => {
    if (!rescheduleModal) return;
    loadRescheduleAvailability(rescheduleDate);
  }, [rescheduleModal, rescheduleDate]);

  async function request(path: string, options: RequestInit = {}) {
    setMessage("");
    const response = await fetch(path, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(json.error || "Nao foi possivel concluir a acao.");
      await fireSwal({
        icon: "error",
        title: "Erro",
        text: json.error || "Não foi possível concluir a ação.",
      });
      return null;
    }
    setMessage("Alteracao salva com sucesso.");
    await fireSwal({
      icon: "success",
      title: "Concluído",
      text: "Alteração salva com sucesso.",
    });
    await loadData();
    return json;
  }

  const specialties = data?.specialties || [];
  const appointments = data?.appointments || [];
  const selectedDoctors = specialtyId ? availability.doctors : [];
  const selectedDoctor = selectedDoctors.find((item: AnyRecord) => item._id === doctorId);
  const selectedSpecialty = specialties.find((item: AnyRecord) => String(item._id) === String(specialtyId));
  const selectedSchedule = availability.schedule;

  const upcoming = useMemo(
    () =>
      appointments.filter(
        (item: AnyRecord) => item.status !== "CANCELADA" && item.date >= new Date().toISOString().split("T")[0]
      ),
    [appointments]
  );

  const past = useMemo(
    () =>
      appointments.filter(
        (item: AnyRecord) =>
          item.status === "CANCELADA" ||
          item.date < new Date().toISOString().split("T")[0] ||
          item.status === "FINALIZADA"
      ),
    [appointments]
  );

  async function bookAppointment() {
    const result = await request("/api/appointments", {
      method: "POST",
      body: JSON.stringify({
        doctorId,
        specialtyId,
        date,
        time,
      }),
    });

    if (result) {
      setSpecialtyId("");
      setDoctorId("");
      setDate("");
      setTime("");
      setAvailability({
        doctors: [],
        schedule: null,
        availableDates: [],
        slots: [],
      });
    }
  }

  async function cancelAppointment(appointmentId: string) {
    const result = await fireSwal({
      icon: "warning",
      title: "Cancelar consulta?",
      text: "Essa ação não pode ser desfeita.",
      showCancelButton: true,
      confirmButtonText: "Sim, cancelar",
      cancelButtonText: "Manter consulta",
    });

    if (!result.isConfirmed) return;

    await request("/api/appointments", {
      method: "PATCH",
      body: JSON.stringify({ appointmentId, status: "CANCELADA" }),
    });
  }

  function openRescheduleModal(appointment: AnyRecord) {
    setRescheduleModal(appointment);
    setRescheduleDate(appointment.date);
    setRescheduleTime("");
    setRescheduleAvailability({
      schedule: null,
      slots: [],
    });
  }

  function closeRescheduleModal() {
    setRescheduleModal(null);
    setRescheduleDate("");
    setRescheduleTime("");
    setRescheduleAvailability({
      schedule: null,
      slots: [],
    });
    setRescheduleAvailabilityLoading(false);
  }

  async function rescheduleAppointment() {
    if (!rescheduleModal) return;
    await request("/api/appointments", {
      method: "PUT",
      body: JSON.stringify({
        appointmentId: rescheduleModal._id,
        date: rescheduleDate,
        time: rescheduleTime,
      }),
    });
    closeRescheduleModal();
  }

  return (
    <RoleShell
      userName={data?.user?.name || "Paciente"}
      roleLabel="Paciente"
      clinicName={data?.clinicSettings?.clinicName || "MediClinic"}
      clinicLogoUrl={data?.clinicSettings?.logoUrl || ""}
      navItems={navItems}
      active={active}
      onNavigate={(id) => {
        if (id === "doctors") {
          router.push("/paciente/medicos");
          return;
        }
        setActive(id);
      }}
      onLogout={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
      }}
    >
      {loading ? (
        <Card className="p-8 text-sm text-slate-500">Carregando portal do paciente...</Card>
      ) : (
        <>
          {message && <div className="mb-4 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-700">{message}</div>}

          {active === "dashboard" && (
            <div>
              <PageHeader
                title={`Olá, ${String(data?.user?.name || "Paciente").split(" ")[0]}`}
                sub="Suas consultas e proximas ações"
                action={
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => router.push("/paciente/medicos")}>Nossos médicos</Button>
                    <Button variant="secondary" onClick={loadData}>
                      <RefreshCw className="w-4 h-4" />
                      Atualizar
                    </Button>
                  </div>
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
                <StatCard label="Proximas consultas" value={upcoming.length} icon={Calendar} color="bg-sky-50 text-sky-600" />
                <StatCard label="Historico" value={past.length} icon={CheckCircle} color="bg-teal-50 text-teal-600" />
                <StatCard label="Especialidades" value={specialties.length} icon={Star} color="bg-violet-50 text-violet-600" />
              </div>
              <Card>
                <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-800">Proximas consultas</h2>
                  <Button variant="secondary" size="sm" onClick={() => setActive("book")}>
                    <Plus className="w-3.5 h-3.5" />
                    Agendar
                  </Button>
                </div>
                <div className="divide-y divide-slate-50">
                  {upcoming.length === 0 ? (
                    <Empty label="Nenhuma consulta agendada." />
                  ) : (
                    upcoming.map((item: AnyRecord) => (
                      <div key={item._id} className="px-5 py-4 flex items-center gap-4">
                        <div className="w-12 h-12 bg-sky-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-sky-700 leading-none">
                            {new Date(`${item.date}T12:00:00`).getDate()}
                          </span>
                          <span className="text-xs text-sky-500">
                            {new Date(`${item.date}T12:00:00`).toLocaleDateString("pt-BR", { month: "short" })}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800">{resolveName(item.doctorId)}</p>
                          <p className="text-sm text-slate-500">
                            {resolveName(item.specialtyId)} · {item.time}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          )}

          {active === "book" && (
            <div>
              <PageHeader title="Agendar consulta" sub="Escolha especialidade, medico, data e horario reais" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Especialidade</span>
                    <Select
                      value={specialtyId}
                      onChange={(e) => {
                        setSpecialtyId(e.target.value);
                        setDoctorId("");
                        setDate("");
                        setTime("");
                      }}
                    >
                      <option value="">Selecione</option>
                      {specialties.map((item: AnyRecord) => (
                        <option key={item._id} value={item._id}>
                          {item.name}
                        </option>
                      ))}
                    </Select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Medico</span>
                    <Select
                      value={doctorId}
                      onChange={(e) => {
                        setDoctorId(e.target.value);
                        setDate("");
                        setTime("");
                      }}
                      disabled={!specialtyId || availabilityLoading}
                    >
                      <option value="">
                        {!specialtyId ? "Escolha a especialidade primeiro" : availabilityLoading ? "Carregando medicos..." : "Selecione"}
                      </option>
                      {selectedDoctors.map((item: AnyRecord) => (
                        <option key={item._id} value={item._id}>
                          {item.name}
                        </option>
                      ))}
                    </Select>
                  </label>

                  {!specialtyId && (
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      Selecione uma especialidade para carregar apenas os medicos vinculados.
                    </div>
                  )}

                  {specialtyId && !doctorId && (
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      Agora escolha o medico desejado para ver os dias e horarios disponiveis.
                    </div>
                  )}

                  {doctorId && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <p className="text-sm font-semibold text-slate-700">Dias disponiveis</p>
                          {availabilityLoading && <span className="text-xs text-slate-500">Atualizando agenda...</span>}
                        </div>
                        {availability.availableDates.length === 0 ? (
                          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                            Nenhuma data disponivel no periodo consultado.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {availability.availableDates.map((item) => (
                              <button
                                key={item}
                                type="button"
                                onClick={() => {
                                  setDate(item);
                                  setTime("");
                                }}
                                className={`rounded-xl border px-3 py-3 text-left text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 ${
                                  date === item
                                    ? "bg-sky-600 text-white border-sky-600"
                                    : "bg-slate-50 text-slate-700 border-slate-200 hover:border-sky-200 hover:bg-sky-50"
                                }`}
                              >
                                <div className="font-medium">{formatDateLabel(item)}</div>
                                <div className={`text-xs mt-1 ${date === item ? "text-sky-50" : "text-slate-500"}`}>
                                  Agenda liberada
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {date && selectedSchedule && (
                        <div>
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <p className="text-sm font-semibold text-slate-700">Horarios disponiveis</p>
                            <span className="text-xs text-slate-500">{formatDateLabel(date)}</span>
                          </div>
                          {availability.slots.length === 0 ? (
                            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                              Nenhum horario livre nesta data.
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {availability.slots.map((slot) => (
                                <button
                                  key={slot}
                                  type="button"
                                  onClick={() => setTime(slot)}
                                  className={`rounded-xl border px-3 py-2 text-sm font-mono transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 ${
                                    time === slot
                                      ? "bg-sky-600 text-white border-sky-600"
                                      : "bg-slate-50 text-slate-700 border-slate-200 hover:border-sky-200 hover:bg-sky-50"
                                  }`}
                                >
                                  {slot}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <Button onClick={bookAppointment} disabled={!specialtyId || !doctorId || !date || !time} className="w-full">
                    Confirmar agendamento
                  </Button>
                </Card>

                <Card className="p-6">
                  <p className="text-sm font-semibold text-slate-700 mb-4">Previa do atendimento</p>
                  {!selectedDoctor ? (
                    <Empty label="Selecione um medico para ver a agenda disponivel." />
                  ) : (
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between border-b border-slate-50 py-2">
                        <span className="text-slate-500">Medico</span>
                        <span className="text-slate-800">{selectedDoctor.name}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-50 py-2">
                        <span className="text-slate-500">Especialidade</span>
                        <span className="text-slate-800">{resolveName(selectedSpecialty || selectedDoctor.specialtyId)}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-50 py-2">
                        <span className="text-slate-500">Dias</span>
                        <span className="text-slate-800">
                          {(selectedSchedule?.availableDays || []).map((day: number) => String(day)).join(", ") || "—"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-50 py-2">
                        <span className="text-slate-500">Horario</span>
                        <span className="text-slate-800">
                          {selectedSchedule?.startTime || "08:00"} - {selectedSchedule?.endTime || "18:00"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-50 py-2">
                        <span className="text-slate-500">Almoco</span>
                        <span className="text-slate-800">
                          {selectedSchedule?.lunchStart && selectedSchedule?.lunchEnd
                            ? `${selectedSchedule.lunchStart} - ${selectedSchedule.lunchEnd}`
                            : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-50 py-2">
                        <span className="text-slate-500">Duracao</span>
                        <span className="text-slate-800">{selectedSchedule?.slotDuration || 30} min</span>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {active === "appointments" && (
            <div>
              <PageHeader title="Minhas consultas" sub="Historico, reagendamento e cancelamento" />
              <div className="space-y-3">
                {appointments.length === 0 ? (
                  <Card className="p-8">
                    <Empty label="Nenhuma consulta encontrada." />
                  </Card>
                ) : (
                  appointments.map((item: AnyRecord) => (
                    <Card key={item._id} className="p-5">
                      <div className="flex flex-wrap items-start gap-4">
                        <div className="w-12 h-12 bg-sky-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-sky-700 leading-none">
                            {new Date(`${item.date}T12:00:00`).getDate()}
                          </span>
                          <span className="text-xs text-sky-500">
                            {new Date(`${item.date}T12:00:00`).toLocaleDateString("pt-BR", { month: "short" })}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900">{resolveName(item.doctorId)}</h3>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              {item.status}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500">
                            {resolveName(item.specialtyId)} · {item.date} às {item.time}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 flex-shrink-0">
                          {canPatientReschedule(item.status) && (
                            <Button variant="secondary" size="sm" onClick={() => openRescheduleModal(item)}>
                              Reagendar
                            </Button>
                          )}
                          {canPatientCancel(item.status) && (
                            <Button variant="danger" size="sm" onClick={() => cancelAppointment(item._id)}>
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {rescheduleModal && (
            <Modal title="Reagendar consulta" onClose={closeRescheduleModal}>
              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Nova data</span>
                  <Input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => {
                      setRescheduleDate(e.target.value);
                      setRescheduleTime("");
                    }}
                  />
                </label>

                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="text-sm font-medium text-slate-700">Horarios disponiveis</span>
                    {rescheduleAvailabilityLoading && <span className="text-xs text-slate-500">Carregando horarios...</span>}
                  </div>

                  {!rescheduleDate ? (
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      Escolha uma nova data para ver os horarios disponiveis.
                    </div>
                  ) : rescheduleAvailability.slots.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      Nenhum horario livre nesta data.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {rescheduleAvailability.slots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setRescheduleTime(slot)}
                          className={`rounded-xl border px-3 py-2 text-sm font-mono transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 ${
                            rescheduleTime === slot
                              ? "bg-sky-600 text-white border-sky-600"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:border-sky-200 hover:bg-sky-50"
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-500">A validacao de disponibilidade sera feita no servidor antes de salvar.</p>
              </div>
              <div className="flex gap-3 justify-end mt-4">
                <Button variant="secondary" onClick={closeRescheduleModal}>
                  Cancelar
                </Button>
                <Button onClick={rescheduleAppointment} disabled={!rescheduleDate || !rescheduleTime}>
                  Salvar
                </Button>
              </div>
            </Modal>
          )}
        </>
      )}
    </RoleShell>
  );
}
