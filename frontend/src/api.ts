import type { Dose, MedEntry, Profile, ScheduleResponse } from './types';
import { MEDS } from './mock/meds';
import { fromMin, toMin } from './lib/time';

// true  = fake answers made in the browser (no backend needed)
// false = real FastAPI backend at VITE_API_URL
export const USE_MOCK = false;
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

// ---------- login (the backend has no login yet, so this stays fake) ----------
export async function login(email: string, password: string) {
  await wait(300);
  if (!email || !password) throw new Error('Enter your email and password');
  return { token: 'mock-token', email };
}
export const register = login;

// ---------- shapes the backend uses ----------
type BackendEvent = { medicationId: string; doseNumber: number; time: string; reason: string };
type BackendRoutine = { wakeUp: string; breakfast: string; lunch: string; dinner: string; bedTime: string };
type BackendResponse = { success: boolean; events: BackendEvent[]; conflicts: string[] };

export type EditResult = { success: boolean; doses: Dose[]; conflicts: string[] };

const routineOf = (p: Profile): BackendRoutine => ({
  wakeUp: p.wake,
  breakfast: p.breakfast,
  lunch: p.lunch,
  dinner: p.dinner,
  bedTime: p.sleep,
});

// the backend explains separations with ids ("medication 002"); show names instead
const niceReason = (s: string) =>
  s.replace(/medication (\d+)/g, (_, id) => MEDS.find(m => m.id === id)?.name ?? `medication ${id}`);

async function post(path: string, body: unknown): Promise<BackendResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Cannot reach the server. Is the backend running on port 8000?');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(typeof err?.detail === 'string' ? err.detail : `Server error (${res.status})`);
  }
  return res.json();
}

// backend events -> the Dose objects the screens use
function toDoses(events: BackendEvent[], entryIdOf: (medId: string) => string | undefined): Dose[] {
  return events.flatMap(ev => {
    const med = MEDS.find(m => m.id === ev.medicationId);
    const entryId = entryIdOf(ev.medicationId);
    if (!med || !entryId) return [];
    const gap = med.separations[0];
    return [{
      entryId,
      medId: med.id,
      name: med.name,
      time: ev.time,
      foodRule: med.foodRule,
      reason: niceReason(ev.reason),
      warnings: med.warnings,
      minGapNote: gap ? `Keep ${gap.minutes / 60} hours from ${gap.fromName}` : undefined,
    }];
  });
}

// Doses -> backend events. The backend numbers each medication's doses in time order.
function toEvents(doses: Dose[]) {
  const seen = new Map<string, number>();
  return [...doses]
    .sort((a, b) => toMin(a.time) - toMin(b.time))
    .map(d => {
      const n = (seen.get(d.medId) ?? 0) + 1;
      seen.set(d.medId, n);
      return { dose: d, event: { medicationId: d.medId, doseNumber: n, time: d.time, reason: d.reason } };
    });
}

// ======================= 1. make a schedule =======================
export async function generateSchedule(profile: Profile, entries: MedEntry[]): Promise<ScheduleResponse> {
  return USE_MOCK ? mockSchedule(profile, entries) : realSchedule(profile, entries);
}

async function realSchedule(profile: Profile, entries: MedEntry[]): Promise<ScheduleResponse> {
  // the backend rejects the same drug twice, so keep the first entry per drug
  const byMed = new Map<string, MedEntry>();
  for (const e of entries) if (e.medId && !byMed.has(e.medId)) byMed.set(e.medId, e);

  const data = await post('/schedule', {
    medications: [...byMed.values()].map(e => ({ name: e.name, dosesPerDay: e.timesPerDay })),
    routine: routineOf(profile),
  });
  if (!data.success) return { success: false, doses: [], conflicts: data.conflicts };
  return { success: true, doses: toDoses(data.events, id => byMed.get(id)?.id) };
}

// ======================= 2. change one dose's time =======================
// The backend checks the new time against every rule and answers
// { success: false, conflicts: [reasons...] } when the change is not allowed.
export async function editDose(profile: Profile, doses: Dose[], dose: Dose, newTime: string): Promise<EditResult> {
  return USE_MOCK ? mockEdit(doses, dose, newTime) : realEdit(profile, doses, dose, newTime);
}

async function realEdit(profile: Profile, doses: Dose[], dose: Dose, newTime: string): Promise<EditResult> {
  const numbered = toEvents(doses);
  const target = numbered.find(x => x.dose.entryId === dose.entryId && x.dose.time === dose.time);
  if (!target) throw new Error('That dose is no longer on the schedule.');

  // describe the current schedule from the doses themselves, so the two always agree
  const perMed = new Map<string, number>();
  for (const d of doses) perMed.set(d.medId, (perMed.get(d.medId) ?? 0) + 1);

  const data = await post('/edit-schedule', {
    medications: [...perMed].map(([medId, n]) => ({
      name: MEDS.find(m => m.id === medId)?.name ?? medId,
      dosesPerDay: n,
    })),
    routine: routineOf(profile),
    events: numbered.map(x => x.event),
    edit: {
      type: 'medication',
      newTime,
      medicationId: target.event.medicationId,
      doseNumber: target.event.doseNumber,
    },
  });
  if (!data.success) return { success: false, doses, conflicts: data.conflicts };

  const entryIds = new Map(doses.map(d => [d.medId, d.entryId]));
  return { success: true, doses: toDoses(data.events, id => entryIds.get(id)), conflicts: [] };
}

// ======================= fake versions (USE_MOCK = true) =======================
async function mockEdit(doses: Dose[], dose: Dose, newTime: string): Promise<EditResult> {
  await wait(300);
  const next = doses
    .map(d => (d.entryId === dose.entryId && d.time === dose.time ? { ...d, time: newTime } : d))
    .sort((a, b) => toMin(a.time) - toMin(b.time));
  return { success: true, doses: next, conflicts: [] };
}

async function mockSchedule(profile: Profile, entries: MedEntry[]): Promise<ScheduleResponse> {
  await wait(600);
  const meals = [toMin(profile.breakfast), toMin(profile.lunch), toMin(profile.dinner)];
  const doses: Dose[] = [];

  for (const e of entries) {
    const med = MEDS.find(m => m.id === e.medId);
    if (!med) continue;
    const mealPick = e.timesPerDay >= 3 ? [0, 1, 2] : e.timesPerDay === 2 ? [0, 2] : [1];

    for (let i = 0; i < e.timesPerDay; i++) {
      let t: number;
      let reason: string;
      if (med.foodRule === 'empty') {
        t = meals[0] - 45;
        reason = '45 minutes before breakfast';
      } else if (med.foodRule === 'with_food') {
        const idx = mealPick[i % mealPick.length];
        t = meals[idx];
        reason = `Take with ${['breakfast', 'lunch', 'dinner'][idx]}`;
      } else {
        const span = toMin(profile.sleep) - toMin(profile.wake);
        t = toMin(profile.wake) + 30 + Math.round((i * span) / e.timesPerDay);
        reason = 'Spread evenly through your day';
      }
      const gap = med.separations[0];
      doses.push({
        entryId: e.id, medId: med.id, name: med.name, time: fromMin(t),
        foodRule: med.foodRule, reason, warnings: med.warnings,
        minGapNote: gap ? `Keep ${gap.minutes / 60} hours from ${gap.fromName}` : undefined,
      });
    }
  }
  doses.sort((a, b) => toMin(a.time) - toMin(b.time));
  return { success: true, doses };
}