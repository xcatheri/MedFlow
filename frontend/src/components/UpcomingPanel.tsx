import { Clock } from 'lucide-react';
import { useAppState } from '../context/AppState';
import { useClock } from '../context/ClockContext';
import { doseKey, fmt, toMin } from '../lib/time';

const countdown = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`);

export default function UpcomingPanel() {
  const { statuses, setStatus } = useAppState();
  const { todaysDoses, nowMin, dateISO } = useClock();

  const upcoming = todaysDoses
    .filter(d => toMin(d.time) >= nowMin && (statuses[doseKey(d, dateISO)] ?? 'pending') === 'pending')
    .sort((a, b) => toMin(a.time) - toMin(b.time))
    .slice(0, 3);

  return (
    <section className='rounded-xl border bg-white p-4'>
      <h2 className='flex items-center gap-2 font-semibold'>
        <Clock size={18} /> Upcoming doses
      </h2>
      {upcoming.length === 0 ? (
        <p className='mt-2 text-navy/70'>Nothing else due today.</p>
      ) : (
        <ul className='mt-2 flex flex-col gap-3'>
          {upcoming.map(d => {
            const key = doseKey(d, dateISO);
            return (
              <li key={key} className='flex items-center justify-between gap-2'>
                <div>
                  <p className='font-medium'>{d.name}</p>
                  <p className='text-sm text-navy/70'>
                    {fmt(d.time)} · in {countdown(toMin(d.time) - nowMin)}
                  </p>
                </div>
                <div className='flex gap-2'>
                  <button
                    className='rounded bg-sky px-3 py-2 text-navy'
                    onClick={() => setStatus(key, 'taken')}
                  >
                    Taken
                  </button>
                  <button className='rounded border px-3 py-2' onClick={() => setStatus(key, 'skipped')}>
                    Skip
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}