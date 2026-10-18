import type { Dose, MedEntry, Profile, ScheduleResponse } from './types';
import { MEDS } from './mock/meds';
import { toMin } from './lib/time';

export const USE_MOCK = true;

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
const hhmm = (min: number) => {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export async function login(email: string, password: string) {
  await wait(300);
  if (!email || !password) throw new Error('Enter your email and password');
  return { token: 'mock-token', email };
}
export const register = login;

export async function generateSchedule(profile: Profile, entries: MedEntry[]): Promise<ScheduleResponse> {
  if (!USE_MOCK) throw new Error('Real API not connected yet');
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
        entryId: e.id, medId: med.id, name: med.name, time: hhmm(t),
        foodRule: med.foodRule, reason, warnings: med.warnings,
        minGapNote: gap ? `Keep ${gap.minutes / 60} hours from ${gap.fromName}` : undefined,
      });
    }
  }
  doses.sort((a, b) => toMin(a.time) - toMin(b.time));
  return { success: true, doses };
}