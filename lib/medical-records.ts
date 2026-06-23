import { addDays, format, isValid, parseISO } from "date-fns";

export type MedicalLifestyle = {
  smoker: boolean;
  exSmoker: boolean;
  alcohol: boolean;
  physicalActivity: boolean;
  notes: string;
};

export type AuditSession = {
  id: string;
  name?: string | null;
  role?: string | null;
};

export type MedicalRecordSection = {
  previousDiseases: string;
  surgeries: string;
  hospitalizations: string;
  previousTreatments: string;
};

export function normalizeText(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .trim();
}

export function formatDateBR(value?: string | Date | null) {
  if (!value) return "-";
  const date = typeof value === "string" ? parseISO(value) : value;
  if (!isValid(date)) return "-";
  return format(date, "dd/MM/yyyy");
}

export function formatDateTimeBR(value?: string | Date | null) {
  if (!value) return "-";
  const date = typeof value === "string" ? parseISO(value) : value;
  if (!isValid(date)) return "-";
  return format(date, "dd/MM/yyyy HH:mm");
}

export function calculateAge(birthDate?: string | null) {
  if (!birthDate) return "-";
  const date = parseISO(birthDate);
  if (!isValid(date)) return "-";
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }
  return `${age} anos`;
}

export function splitList(value?: string | string[] | null) {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : String(value).split(/[\n,;]/g);
  return raw.map((item) => String(item).trim()).filter(Boolean);
}

export function makeReturnDateOptions(baseDate: string, intervals = [7, 15, 30]) {
  const parsed = parseISO(baseDate);
  if (!isValid(parsed)) return [];
  return intervals.map((days) => ({
    label: `Retorno em ${days} dias`,
    value: format(addDays(parsed, days), "yyyy-MM-dd"),
  }));
}

export function buildAuditEntry(action: string, actor: AuditSession, details?: string) {
  return {
    action,
    actorId: actor.id,
    actorName: actor.name || "",
    actorRole: actor.role || "",
    details: details || "",
    createdAt: new Date(),
  };
}

