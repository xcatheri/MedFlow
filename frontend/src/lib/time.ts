import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { Dose, MedEntry } from '../types';

export const PX_PER_HOUR = 64;

// '08:30' -> 510
export const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// pixel position on the timeline
export const toTop = (t: string) => (toMin(t) / 60) * PX_PER_HOUR;

// '19:00' -> '7:00 PM'
export const fmt = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ap}`;
};

export const todayISO = () => format(new Date(), 'yyyy-MM-dd');

// does this medication apply on this date?
export function isActiveOn(e: MedEntry, date: Date) {
  const offset = differenceInCalendarDays(date, parseISO(e.startDate));
  return offset >= 0 && offset < e.days && e.weekdays.includes(date.getDay());
}

// unique id for one dose on one date (used for taken/skipped status)
export const doseKey = (d: Dose, dateISO: string) => `${dateISO}|${d.entryId}|${d.time}`;

export const fromMin = (min: number) => {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};