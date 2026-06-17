export type AppointmentStatus = "AGENDADA" | "CONFIRMADA" | "EM_ATENDIMENTO" | "FINALIZADA" | "CANCELADA";

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  AGENDADA: "Agendada",
  CONFIRMADA: "Confirmada",
  EM_ATENDIMENTO: "Em atendimento",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada",
};

export const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
export const APPOINTMENT_DURATIONS = [15, 20, 30, 45, 60] as const;

export function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export function makeSlots(start: string, end: string, duration: number) {
  const slots: string[] = [];
  let cursor = timeToMinutes(start);
  const limit = timeToMinutes(end);

  while (cursor + duration <= limit) {
    slots.push(minutesToTime(cursor));
    cursor += duration;
  }

  return slots;
}

export function isPastDate(date: string) {
  const target = new Date(`${date}T12:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return target < today;
}

export function isDateBlocked(blockedDates: Array<{ date: string }>, date: string) {
  return blockedDates.some((item) => item.date === date);
}

export function isSlotBlocked(blockedSlots: Array<{ date: string; time: string }>, date: string, time: string) {
  return blockedSlots.some((item) => item.date === date && item.time === time);
}

export function isWithinLunchBreak(lunchStart?: string, lunchEnd?: string, time?: string) {
  if (!lunchStart || !lunchEnd || !time) return false;
  const current = timeToMinutes(time);
  return current >= timeToMinutes(lunchStart) && current < timeToMinutes(lunchEnd);
}

export function isWithinWorkingHours(start: string, end: string, duration: number, time: string) {
  return makeSlots(start, end, duration).includes(time);
}

type ScheduleLike = {
  availableDays?: number[];
  startTime?: string;
  endTime?: string;
  slotDuration?: number;
  lunchStart?: string;
  lunchEnd?: string;
  blockedDates?: Array<{ date: string }>;
  vacationDates?: Array<{ date: string }>;
  blockedSlots?: Array<{ date: string; time: string }>;
};

export function generateAvailableSlots(schedule: ScheduleLike, date: string, bookedTimes: string[] = []) {
  if (!schedule?.availableDays || !schedule.startTime || !schedule.endTime) return [];

  const dow = new Date(`${date}T12:00:00`).getDay();
  if (!schedule.availableDays.includes(dow)) return [];
  if (isPastDate(date)) return [];
  if (isDateBlocked(schedule.blockedDates || [], date)) return [];
  if (isDateBlocked(schedule.vacationDates || [], date)) return [];

  const duration = schedule.slotDuration || 30;
  const all = makeSlots(schedule.startTime, schedule.endTime, duration);
  const blockedSlots = schedule.blockedSlots || [];

  return all.filter(
    (slot) =>
      !bookedTimes.includes(slot) &&
      !isSlotBlocked(blockedSlots, date, slot) &&
      !isWithinLunchBreak(schedule.lunchStart, schedule.lunchEnd, slot)
  );
}

export function generateAvailableDates(schedule: ScheduleLike, startDate: string, days: number) {
  const result: string[] = [];
  const start = new Date(`${startDate}T12:00:00`);

  for (let i = 0; i < days; i += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const date = current.toISOString().split("T")[0];
    if (generateAvailableSlots(schedule, date).length > 0) {
      result.push(date);
    }
  }

  return result;
}
