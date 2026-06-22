import { reminderSchedulerConfig, runAppointmentReminderSweep } from "./appointment-reminders";

type SchedulerState = {
  started: boolean;
  running: boolean;
  timer: NodeJS.Timeout | null;
};

declare global {
  var appointmentReminderScheduler: SchedulerState | undefined;
}

const state: SchedulerState = globalThis.appointmentReminderScheduler ?? {
  started: false,
  running: false,
  timer: null,
};

globalThis.appointmentReminderScheduler = state;

async function runSafely() {
  if (state.running) {
    return;
  }

  state.running = true;
  try {
    await runAppointmentReminderSweep();
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Falha no agendamento de lembretes";
    console.error("[reminders] sweep failed", detail);
  } finally {
    state.running = false;
  }
}

export function ensureAppointmentReminderScheduler() {
  if (!reminderSchedulerConfig.enabled || state.started) {
    return;
  }

  state.started = true;
  void runSafely();

  state.timer = setInterval(() => {
    void runSafely();
  }, reminderSchedulerConfig.intervalMs);

  state.timer.unref?.();
}

export async function runAppointmentReminderNow() {
  return runAppointmentReminderSweep();
}
