import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import type { Dose } from '../types';
import { doseKey, fmt, isActiveOn, toMin } from '../lib/time';
import { useAppState } from './AppState';

type ClockValue = {
  nowMin: number;
  dateISO: string;
  demo: boolean;
  todaysDoses: Dose[];
  setDemoMinutes: (m: number | null) => void;
};

const Ctx = createContext<ClockValue | null>(null);

export function ClockProvider({ children }: { children: ReactNode }) {
  const { doses, entries, statuses, setStatus } = useAppState();
  const [real, setReal] = useState(new Date());
  const [demoMin, setDemoMin] = useState<number | null>(null);
  const fired = useRef(new Set<string>());
  const snoozed = useRef(new Map<string, number>());

  // real clock ticks every 15 seconds
  useEffect(() => {
    const id = setInterval(() => setReal(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  const nowMin = demoMin ?? real.getHours() * 60 + real.getMinutes();
  const dateISO = format(real, 'yyyy-MM-dd');

  const todaysDoses = useMemo(
    () =>
      doses.filter(d => {
        const e = entries.find(x => x.id === d.entryId);
        return e ? isActiveOn(e, parseISO(dateISO)) : false;
      }),
    [doses, entries, dateISO],
  );

  function setDemoMinutes(m: number | null) {
    // moving backwards (or leaving demo) lets reminders fire again
    if (m === null || m < nowMin) {
      fired.current.clear();
      snoozed.current.clear();
    }
    setDemoMin(m);
  }

  // reminders: 15 minutes before, and when due
  useEffect(() => {
    for (const d of todaysDoses) {
      const key = doseKey(d, dateISO);
      if ((statuses[key] ?? 'pending') !== 'pending') continue;
      const due = toMin(d.time);
      const warning = d.warnings[0];

      if (nowMin >= due - 15 && nowMin < due && !fired.current.has(key + '|pre')) {
        fired.current.add(key + '|pre');
        toast(`${d.name} in ${due - nowMin} minutes`, { description: warning });
      }

      const snoozeAt = snoozed.current.get(key);
      const dueNow = nowMin >= due && nowMin < due + 60 && !fired.current.has(key + '|due');
      if (dueNow || (snoozeAt !== undefined && nowMin >= snoozeAt)) {
        fired.current.add(key + '|due');
        snoozed.current.delete(key);
        toast(`Time to take ${d.name} (${fmt(d.time)})`, {
          description: [d.reason, warning].filter(Boolean).join('. '),
          duration: 30000,
          action: { label: 'Taken', onClick: () => setStatus(key, 'taken') },
          cancel: {
            label: 'Snooze 10 min',
            onClick: () => {
              snoozed.current.set(key, nowMin + 10);
            },
          },
        });
      }
    }
  }, [nowMin, todaysDoses, statuses, dateISO, setStatus]);

  return (
    <Ctx.Provider value={{ nowMin, dateISO, demo: demoMin !== null, todaysDoses, setDemoMinutes }}>
      {children}
    </Ctx.Provider>
  );
}

export function useClock() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useClock must be used inside ClockProvider');
  return v;
}

// small floating box: switch to a fake clock and step through the day
export function DemoClock() {
  const { nowMin, demo, setDemoMinutes } = useClock();
  const clamp = (m: number) => Math.min(1439, Math.max(0, m));
  const hhmm = `${String(Math.floor(nowMin / 60)).padStart(2, '0')}:${String(nowMin % 60).padStart(2, '0')}`;

  return (
    <div className='fixed bottom-16 right-3 z-20 w-64 rounded-xl border bg-white p-3 text-sm shadow-lg'>
      <div className='flex items-center justify-between gap-2'>
        <span className='font-medium'>
          {demo ? 'Demo clock' : 'Live clock'}: {fmt(hhmm)}
        </span>
        <button className='underline' onClick={() => setDemoMinutes(demo ? null : nowMin)}>
          {demo ? 'Back to live' : 'Start demo'}
        </button>
      </div>
      {demo && (
        <>
          <input
            type='range'
            min={0}
            max={1439}
            step={5}
            value={nowMin}
            className='mt-2 w-full'
            onChange={e => setDemoMinutes(Number(e.target.value))}
          />
          <div className='mt-2 flex gap-2'>
            <button className='flex-1 rounded border py-1' onClick={() => setDemoMinutes(clamp(nowMin + 15))}>
              +15 min
            </button>
            <button className='flex-1 rounded border py-1' onClick={() => setDemoMinutes(clamp(nowMin + 60))}>
              +1 hour
            </button>
          </div>
        </>
      )}
    </div>
  );
}