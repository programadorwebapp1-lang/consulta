"use client";

import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, FileText, Pill, Search, Stethoscope, ClipboardList, BadgeAlert } from "lucide-react";
import { RoleShell } from "@/components/role-shell";
import { Button, Card, Empty, Input, PageHeader, Select, Textarea } from "@/components/system-ui";
import { calculateAge, formatDateBR } from "@/lib/medical-records";
import { fireSwal } from "@/lib/swal";

type AnyRecord = Record<string, any>;

const navItems = [
  { id: "exit", label: "Voltar", icon: ArrowLeft },
];

const commonExams = ["Hemograma", "Glicemia", "Colesterol", "Ultrassom", "Raio-X", "Ressonancia"];

const tabItems = [
  { id: "prontuario", label: "Prontuario", icon: FileText },
  { id: "receita", label: "Receita", icon: Pill },
  { id: "exames", label: "Exames", icon: Search },
  { id: "atestado", label: "Atestado", icon: BadgeAlert },
  { id: "encaminhamento", label: "Encaminhamento", icon: Stethoscope },
  { id: "historico", label: "Historico", icon: ClipboardList },
];

type RecordForm = {
  chiefComplaint: string;
  historyOfPresentIllness: string;
  medicalHistory: {
    previousDiseases: string;
    surgeries: string;
    hospitalizations: string;
    previousTreatments: string;
  };
  allergies: string;
  currentMedications: string[];
  familyHistory: string;
  lifestyle: {
    smoker: boolean;
    exSmoker: boolean;
    alcohol: boolean;
    physicalActivity: boolean;
    notes: string;
  };
  physicalExam: string;
  assessment: string;
  diagnosis: string;
  conduct: string;
  notes: string;
  status: "ABERTO" | "EM_ATENDIMENTO" | "FINALIZADO";
  returnDate: string;
  returnType: string;
};

type PrescriptionRow = {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  observations: string;
};

function emptyRecordForm(): RecordForm {
  return {
    chiefComplaint: "",
    historyOfPresentIllness: "",
    medicalHistory: {
      previousDiseases: "",
      surgeries: "",
      hospitalizations: "",
      previousTreatments: "",
    },
    allergies: "",
    currentMedications: [""],
    familyHistory: "",
    lifestyle: {
      smoker: false,
      exSmoker: false,
      alcohol: false,
      physicalActivity: false,
      notes: "",
    },
    physicalExam: "",
    assessment: "",
    diagnosis: "",
    conduct: "",
    notes: "",
    status: "EM_ATENDIMENTO",
    returnDate: "",
    returnType: "",
  };
}

function emptyPrescriptionRow(): PrescriptionRow {
  return {
    medication: "",
    dosage: "",
    frequency: "",
    duration: "",
    observations: "",
  };
}

function resolveName(value: any) {
  if (!value) return "-";
  if (typeof value === "string") return value;
  return value.name || value.email || "-";
}

export default function ProntuarioPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const appointmentId = params?.id || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("prontuario");
  const [payload, setPayload] = useState<AnyRecord | null>(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<RecordForm>(emptyRecordForm());
  const [prescriptionRows, setPrescriptionRows] = useState<PrescriptionRow[]>([emptyPrescriptionRow()]);
  const [examItems, setExamItems] = useState<string[]>([]);
  const [examCustom, setExamCustom] = useState("");
  const [certificateForm, setCertificateForm] = useState({
    daysOff: 1,
    startDate: "",
    cid: "",
    observations: "",
  });
  const [referralForm, setReferralForm] = useState({
    destination: "",
    reason: "",
    observations: "",
  });
  const [selectedReturnSuggestion, setSelectedReturnSuggestion] = useState("");

  async function loadData() {
    setLoading(true);
    const response = await fetch("/api/medical-records/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId }),
    });

    if (response.status === 401) {
      router.replace("/login");
      return;
    }
    if (!response.ok) {
      const json = await response.json().catch(() => ({}));
      await fireSwal({ icon: "error", title: "Nao foi possivel iniciar", text: json.error || "Falha ao abrir prontuario." });
      router.push("/medico");
      return;
    }

    const json = await response.json();
    setPayload(json);

    const record = json.record || {};
    setForm({
      chiefComplaint: record.chiefComplaint || "",
      historyOfPresentIllness: record.historyOfPresentIllness || "",
      medicalHistory: {
        previousDiseases: record.medicalHistory?.previousDiseases || "",
        surgeries: record.medicalHistory?.surgeries || "",
        hospitalizations: record.medicalHistory?.hospitalizations || "",
        previousTreatments: record.medicalHistory?.previousTreatments || "",
      },
      allergies: record.allergies || "",
      currentMedications: Array.isArray(record.currentMedications) && record.currentMedications.length ? record.currentMedications : [""],
      familyHistory: record.familyHistory || "",
      lifestyle: {
        smoker: Boolean(record.lifestyle?.smoker),
        exSmoker: Boolean(record.lifestyle?.exSmoker),
        alcohol: Boolean(record.lifestyle?.alcohol),
        physicalActivity: Boolean(record.lifestyle?.physicalActivity),
        notes: record.lifestyle?.notes || "",
      },
      physicalExam: record.physicalExam || "",
      assessment: record.assessment || "",
      diagnosis: record.diagnosis || "",
      conduct: record.conduct || "",
      notes: record.notes || "",
      status: record.status || "EM_ATENDIMENTO",
      returnDate: record.returnDate || "",
      returnType: record.returnType || "",
    });

    setSelectedReturnSuggestion(record.returnDate || json.availableReturnDates?.[0]?.date || "");
    setPrescriptionRows(
      json.documents?.prescriptions?.[0]?.medications?.length
        ? json.documents.prescriptions[0].medications
        : [emptyPrescriptionRow()]
    );
    setExamItems(json.documents?.examRequests?.[0]?.exams?.map((item: AnyRecord) => String(item.name || "")) || []);
    setCertificateForm({
      daysOff: json.documents?.certificates?.[0]?.daysOff || 1,
      startDate: json.documents?.certificates?.[0]?.startDate || "",
      cid: json.documents?.certificates?.[0]?.cid || "",
      observations: json.documents?.certificates?.[0]?.observations || "",
    });
    setReferralForm({
      destination: json.documents?.referrals?.[0]?.destination || "",
      reason: json.documents?.referrals?.[0]?.reason || "",
      observations: json.documents?.referrals?.[0]?.observations || "",
    });
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [appointmentId]);

  async function request(path: string, options: RequestInit = {}) {
    setMessage("");
    const response = await fetch(path, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(json.error || "Não foi possivel concluir a ação.");
      await fireSwal({ icon: "error", title: "Erro", text: json.error || "Não foi possivel concluir a ação." });
      return null;
    }
    setMessage("Alteração  salva com sucesso.");
    return json;
  }

  const patient = payload?.patient || payload?.appointment?.patientId || null;
  const doctor = payload?.doctor || payload?.appointment?.doctorId || null;
  const specialty = payload?.specialty || payload?.appointment?.specialtyId || null;
  const record = payload?.record || null;
  const history = payload?.history || [];
  const documents = payload?.documents || {};
  const patientAge = calculateAge(patient?.birthDate || "");

  const returnSuggestions = useMemo(() => {
    return (payload?.availableReturnDates || []).slice(0, 6);
  }, [payload]);

  async function saveRecord(nextStatus?: RecordForm["status"]) {
    if (!record?._id) return;
    setSaving(true);
    const response = await request(`/api/medical-records/${record._id}`, {
      method: "PUT",
      body: JSON.stringify({
        ...form,
        status: nextStatus || form.status,
        returnDate: selectedReturnSuggestion || form.returnDate,
      }),
    });
    setSaving(false);
    if (response) {
      await loadData();
    }
  }

  async function emitDocument(type: string, body: Record<string, unknown>) {
    if (!record?._id) return;
    setSaving(true);
    const response = await request(`/api/medical-records/${record._id}/documents`, {
      method: "POST",
      body: JSON.stringify({ type, ...body }),
    });
    setSaving(false);
    if (response) {
      await loadData();
      await fireSwal({ icon: "success", title: "Documento gerado", text: "O PDF ficou disponivel para download." });
    }
  }

  function addMedicationField() {
    setForm((curr) => ({ ...curr, currentMedications: [...curr.currentMedications, ""] }));
  }

  function updateMedicationField(index: number, value: string) {
    setForm((curr) => ({
      ...curr,
      currentMedications: curr.currentMedications.map((item, idx) => (idx === index ? value : item)),
    }));
  }

  function removeMedicationField(index: number) {
    setForm((curr) => ({
      ...curr,
      currentMedications: curr.currentMedications.length > 1 ? curr.currentMedications.filter((_, idx) => idx !== index) : [""],
    }));
  }

  function addExamItem(value: string) {
    const normalized = value.trim();
    if (!normalized) return;
    setExamItems((curr) => (curr.includes(normalized) ? curr : [...curr, normalized]));
    setExamCustom("");
  }

  return (
    <RoleShell
      userName={payload?.user?.name || "Medico"}
      roleLabel="Atendimento"
      clinicName={payload?.clinicSettings?.clinicName || "MediClinic"}
      clinicLogoUrl={payload?.clinicSettings?.logoUrl || ""}
      navItems={navItems}
      active="exit"
      onNavigate={() => router.push("/medico")}
      onLogout={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
      }}
    >
      {loading ? (
        <Card className="p-8 text-sm text-slate-500">Abrindo prontuario...</Card>
      ) : (
        <>
          {message && <div className="mb-4 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-700">{message}</div>}

          <PageHeader
            title="Prontuário Eletrônico"
            sub="Atendimento clínico integrado à agenda, com histórico e documentos emitidos"
            action={
              <Button variant="secondary" onClick={() => router.push("/medico")}>
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            }
          />

          <div className="grid gap-4 lg:grid-cols-[1.35fr_0.9fr] mb-6">
            <Card className="p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">Paciente</p>
                  <h2 className="text-xl font-bold text-slate-900">{resolveName(patient)}</h2>
                  <p className="text-sm text-slate-500">
                    Nascimento {formatDateBR(patient?.birthDate)} • {patientAge}
                  </p>
                </div>
                <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-700">
                  {record?.status || form.status}
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-sm">
                <Info label="Telefone" value={patient?.phone || "-"} />
                <Info label="E-mail" value={patient?.email || "-"} />
                <Info label="Sexo" value={patient?.gender || "-"} />
                <Info label="Idade" value={patientAge || "-"} />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-sm">
                <Info label="Tipo sanguíneo" value={patient?.bloodType || "-"} />
                <Info label="Alergias" value={patient?.allergies || "-"} />
                <Info label="Medicamentos em uso" value={patient?.currentMedications || "-"} />
                <Info label="Doenças crônicas" value={patient?.chronicDiseases || "-"} />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-sm">
                <Info label="Contato de emergência" value={patient?.emergencyContact || "-"} />
                <Info label="Telefone de emergência" value={patient?.emergencyPhone || "-"} />
                <Info label="Especialidade" value={resolveName(specialty)} />
                <Info label="Médico" value={resolveName(doctor)} />
              </div>
              <div className="text-sm text-slate-500">
                <strong className="text-slate-800">Consulta:</strong> {payload?.appointment?.date || "-"} às {payload?.appointment?.time || "-"}
              </div>
            </Card>

            <Card className="p-5 space-y-3">
              <h3 className="font-semibold text-slate-900">Retorno sugerido</h3>
              <div className="flex flex-wrap gap-2">
                {returnSuggestions.length === 0 ? (
                  <Empty label="Sem sugestões disponíveis na agenda." />
                ) : (
                  returnSuggestions.map((item: AnyRecord) => (
                    <button
                      key={item.date}
                      type="button"
                      onClick={() => {
                        setSelectedReturnSuggestion(item.date);
                        setForm((curr) => ({ ...curr, returnDate: item.date, returnType: "SUGERIDO" }));
                      }}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                        selectedReturnSuggestion === item.date
                          ? "border-sky-500 bg-sky-50 text-sky-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))
                )}
              </div>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Retorno personalizado</span>
                <Input
                  type="date"
                  value={selectedReturnSuggestion}
                  onChange={(e) => {
                    setSelectedReturnSuggestion(e.target.value);
                    setForm((curr) => ({ ...curr, returnDate: e.target.value, returnType: "PERSONALIZADO" }));
                  }}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Status final</span>
                <Select value={form.status} onChange={(e) => setForm((curr) => ({ ...curr, status: e.target.value as RecordForm["status"] }))}>
                  <option value="ABERTO">Aberto</option>
                  <option value="EM_ATENDIMENTO">Em atendimento</option>
                  <option value="FINALIZADO">Finalizado</option>
                </Select>
              </label>
              <Button
                onClick={() =>
                  saveRecord(
                    form.status === "FINALIZADO"
                      ? "FINALIZADO"
                      : "EM_ATENDIMENTO"
                  )
                }
                className="w-full"
                disabled={saving}
              >
                Salvar prontuário
              </Button>
              <Button
                variant="primary"
                onClick={() => saveRecord("FINALIZADO")}
                className="w-full"
                disabled={saving}
              >
                Finalizar consulta
              </Button>
            </Card>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {tabItems.map((item) => {
              const Icon = item.icon;
              const selected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                    selected ? "bg-sky-600 text-white shadow-sm" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {activeTab === "prontuario" && (
            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="p-5 space-y-5">
                <SectionTitle title="Queixa principal" />
                <Textarea rows={3} value={form.chiefComplaint} onChange={(e) => setForm((curr) => ({ ...curr, chiefComplaint: e.target.value }))} />

                <SectionTitle title="História da doença atual" />
                <Textarea rows={6} value={form.historyOfPresentIllness} onChange={(e) => setForm((curr) => ({ ...curr, historyOfPresentIllness: e.target.value }))} />

                <SectionTitle title="Histórico médico" />
                <div className="grid gap-3">
                  <Textarea
                    rows={3}
                    placeholder="Doenças anteriores"
                    value={form.medicalHistory.previousDiseases}
                    onChange={(e) =>
                      setForm((curr) => ({ ...curr, medicalHistory: { ...curr.medicalHistory, previousDiseases: e.target.value } }))
                    }
                  />
                  <Textarea
                    rows={3}
                    placeholder="Cirurgias"
                    value={form.medicalHistory.surgeries}
                    onChange={(e) =>
                      setForm((curr) => ({ ...curr, medicalHistory: { ...curr.medicalHistory, surgeries: e.target.value } }))
                    }
                  />
                  <Textarea
                    rows={3}
                    placeholder="Internações"
                    value={form.medicalHistory.hospitalizations}
                    onChange={(e) =>
                      setForm((curr) => ({ ...curr, medicalHistory: { ...curr.medicalHistory, hospitalizations: e.target.value } }))
                    }
                  />
                  <Textarea
                    rows={3}
                    placeholder="Tratamentos anteriores"
                    value={form.medicalHistory.previousTreatments}
                    onChange={(e) =>
                      setForm((curr) => ({ ...curr, medicalHistory: { ...curr.medicalHistory, previousTreatments: e.target.value } }))
                    }
                  />
                </div>

                <SectionTitle title="Alergias" />
                <Textarea rows={3} value={form.allergies} onChange={(e) => setForm((curr) => ({ ...curr, allergies: e.target.value }))} />

                <SectionTitle title="Medicamentos em uso" />
                <div className="space-y-2">
                  {form.currentMedications.map((value, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={value}
                        placeholder="Ex: Dipirona 500mg"
                        onChange={(e) => updateMedicationField(index, e.target.value)}
                      />
                      <Button variant="secondary" type="button" onClick={() => removeMedicationField(index)}>
                        Remover
                      </Button>
                    </div>
                  ))}
                  <Button variant="secondary" type="button" onClick={addMedicationField}>
                    Adicionar medicamento
                  </Button>
                </div>

                <SectionTitle title="Histórico familiar" />
                <Textarea rows={3} value={form.familyHistory} onChange={(e) => setForm((curr) => ({ ...curr, familyHistory: e.target.value }))} />
              </Card>

              <Card className="p-5 space-y-5">
                <SectionTitle title="Hábitos de vida" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Toggle label="Fumante" checked={form.lifestyle.smoker} onChange={(checked) => setForm((curr) => ({ ...curr, lifestyle: { ...curr.lifestyle, smoker: checked } }))} />
                  <Toggle label="Ex-fumante" checked={form.lifestyle.exSmoker} onChange={(checked) => setForm((curr) => ({ ...curr, lifestyle: { ...curr.lifestyle, exSmoker: checked } }))} />
                  <Toggle label="Consumo de álcool" checked={form.lifestyle.alcohol} onChange={(checked) => setForm((curr) => ({ ...curr, lifestyle: { ...curr.lifestyle, alcohol: checked } }))} />
                  <Toggle label="Atividade física" checked={form.lifestyle.physicalActivity} onChange={(checked) => setForm((curr) => ({ ...curr, lifestyle: { ...curr.lifestyle, physicalActivity: checked } }))} />
                </div>
                <Textarea
                  rows={3}
                  placeholder="Observações sobre hábitos"
                  value={form.lifestyle.notes}
                  onChange={(e) => setForm((curr) => ({ ...curr, lifestyle: { ...curr.lifestyle, notes: e.target.value } }))}
                />

                <SectionTitle title="Exame físico" />
                <Textarea rows={4} value={form.physicalExam} onChange={(e) => setForm((curr) => ({ ...curr, physicalExam: e.target.value }))} />

                <SectionTitle title="Avaliação médica" />
                <Textarea rows={4} value={form.assessment} onChange={(e) => setForm((curr) => ({ ...curr, assessment: e.target.value }))} />

                <SectionTitle title="Diagnóstico" />
                <Textarea rows={4} value={form.diagnosis} onChange={(e) => setForm((curr) => ({ ...curr, diagnosis: e.target.value }))} />

                <SectionTitle title="Conduta" />
                <Textarea rows={4} value={form.conduct} onChange={(e) => setForm((curr) => ({ ...curr, conduct: e.target.value }))} />

                <SectionTitle title="Observações" />
                <Textarea rows={3} value={form.notes} onChange={(e) => setForm((curr) => ({ ...curr, notes: e.target.value }))} />
              </Card>
            </div>
          )}

          {activeTab === "receita" && (
            <Card className="p-5 space-y-4">
              <SectionTitle
                title="Receita médica"
                subtitle="Adicione um ou mais medicamentos e gere o PDF em seguida."
                action={<Button variant="secondary" onClick={() => setPrescriptionRows((curr) => [...curr, emptyPrescriptionRow()])}>Adicionar linha</Button>}
              />
              <div className="space-y-3">
                {prescriptionRows.map((row, index) => (
                  <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-5">
                    <Input placeholder="Medicamento" value={row.medication} onChange={(e) => updatePrescriptionRow(index, "medication", e.target.value, setPrescriptionRows)} />
                    <Input placeholder="Dosagem" value={row.dosage} onChange={(e) => updatePrescriptionRow(index, "dosage", e.target.value, setPrescriptionRows)} />
                    <Input placeholder="Frequência" value={row.frequency} onChange={(e) => updatePrescriptionRow(index, "frequency", e.target.value, setPrescriptionRows)} />
                    <Input placeholder="Duração" value={row.duration} onChange={(e) => updatePrescriptionRow(index, "duration", e.target.value, setPrescriptionRows)} />
                    <Input placeholder="Observações" value={row.observations} onChange={(e) => updatePrescriptionRow(index, "observations", e.target.value, setPrescriptionRows)} />
                    <div className="md:col-span-5 flex justify-end">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setPrescriptionRows((curr) => {
                            const next = curr.filter((_, idx) => idx !== index);
                            return next.length ? next : [emptyPrescriptionRow()];
                          })
                        }
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => emitDocument("prescription", { medications: prescriptionRows.filter((row) => row.medication.trim()) })} disabled={saving}>
                  Gerar receita PDF
                </Button>
              </div>
              <DocumentList documents={documents.prescriptions || []} />
            </Card>
          )}

          {activeTab === "exames" && (
            <Card className="p-5 space-y-4">
              <SectionTitle title="Solicitação de exames" subtitle="Use itens rápidos ou adicione exames personalizados." />
              <div className="flex flex-wrap gap-2">
                {commonExams.map((exam) => (
                  <button
                    key={exam}
                    type="button"
                    onClick={() => addExamItem(exam)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm active:translate-y-0"
                  >
                    {exam}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={examCustom} onChange={(e) => setExamCustom(e.target.value)} placeholder="Exame personalizado" />
                <Button variant="secondary" onClick={() => addExamItem(examCustom)}>
                  Adicionar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {examItems.map((exam) => (
                  <span key={exam} className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-2 text-sm text-sky-700">
                    {exam}
                    <button
                      type="button"
                      onClick={() => setExamItems((curr) => curr.filter((item) => item !== exam))}
                      className="text-sky-500 transition-colors hover:text-sky-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <Button onClick={() => emitDocument("examRequest", { exams: examItems.map((exam) => ({ name: exam, custom: !commonExams.includes(exam) })) })} disabled={saving}>
                Gerar solicitação PDF
              </Button>
              <DocumentList documents={documents.examRequests || []} />
            </Card>
          )}

          {activeTab === "atestado" && (
            <Card className="p-5 space-y-4">
              <SectionTitle title="Atestado médico" />
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Quantidade de dias</span>
                  <Input
                    type="number"
                    value={certificateForm.daysOff}
                    onChange={(e) => setCertificateForm((curr) => ({ ...curr, daysOff: Number(e.target.value) }))}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Data inicial</span>
                  <Input
                    type="date"
                    value={certificateForm.startDate}
                    onChange={(e) => setCertificateForm((curr) => ({ ...curr, startDate: e.target.value }))}
                  />
                </label>
              </div>
              <Input
                placeholder="CID opcional"
                value={certificateForm.cid}
                onChange={(e) => setCertificateForm((curr) => ({ ...curr, cid: e.target.value }))}
              />
              <Textarea
                rows={4}
                placeholder="Observações"
                value={certificateForm.observations}
                onChange={(e) => setCertificateForm((curr) => ({ ...curr, observations: e.target.value }))}
              />
              <Button
                onClick={() => emitDocument("certificate", certificateForm)}
                disabled={saving}
              >
                Gerar atestado PDF
              </Button>
              <DocumentList documents={documents.certificates || []} />
            </Card>
          )}

          {activeTab === "encaminhamento" && (
            <Card className="p-5 space-y-4">
              <SectionTitle title="Encaminhamento" />
              <Input
                placeholder="Especialidade de destino"
                value={referralForm.destination}
                onChange={(e) => setReferralForm((curr) => ({ ...curr, destination: e.target.value }))}
              />
              <Textarea
                rows={4}
                placeholder="Motivo"
                value={referralForm.reason}
                onChange={(e) => setReferralForm((curr) => ({ ...curr, reason: e.target.value }))}
              />
              <Textarea
                rows={4}
                placeholder="Observações"
                value={referralForm.observations}
                onChange={(e) => setReferralForm((curr) => ({ ...curr, observations: e.target.value }))}
              />
              <Button onClick={() => emitDocument("referral", referralForm)} disabled={saving}>
                Gerar encaminhamento PDF
              </Button>
              <DocumentList documents={documents.referrals || []} />
            </Card>
          )}

          {activeTab === "historico" && (
            <div className="space-y-4">
              {history.length === 0 ? (
                <Card className="p-8">
                  <Empty label="Nenhuma consulta anterior registrada para este paciente." />
                </Card>
              ) : (
                history.map((item: AnyRecord) => (
                  <Card key={item._id} className="p-5 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-slate-500">{formatDateBR(item.createdAt || item.appointmentId?.date)}</p>
                        <h3 className="font-semibold text-slate-900">{resolveName(item.doctorId)}</h3>
                        <p className="text-sm text-slate-500">{resolveName(item.appointmentId?.specialtyId)}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{item.status}</span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <MiniInfo label="Diagnóstico" value={item.diagnosis || "-"} />
                      <MiniInfo label="Conduta" value={item.conduct || "-"} />
                    </div>
                    <div className="text-sm text-slate-600">
                      <strong className="text-slate-800">Documentos emitidos:</strong>{" "}
                      {[
                        ...(item.documents?.prescriptions || []),
                        ...(item.documents?.certificates || []),
                        ...(item.documents?.examRequests || []),
                        ...(item.documents?.referrals || []),
                      ].length || 0}
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </>
      )}
    </RoleShell>
  );
}

function updatePrescriptionRow(
  index: number,
  key: keyof PrescriptionRow,
  value: string,
  setter: Dispatch<SetStateAction<PrescriptionRow[]>>
) {
  setter((curr) => curr.map((row, idx) => (idx === index ? { ...row, [key]: value } : row)));
}

function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-800 break-words">{value}</p>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 ${
        checked ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      <span>{label}</span>
      <span className={`h-5 w-10 rounded-full p-0.5 ${checked ? "bg-sky-600" : "bg-slate-300"}`}>
        <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}

function DocumentList({ documents }: { documents: AnyRecord[] }) {
  if (!documents.length) return null;
  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <a
          key={doc._id}
          href={doc.pdfUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm active:translate-y-0"
        >
          <span>PDF emitido em {formatDateBR(doc.createdAt)}</span>
          <span className="text-sky-600">Abrir</span>
        </a>
      ))}
    </div>
  );
}
