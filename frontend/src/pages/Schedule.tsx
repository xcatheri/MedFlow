import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays, format, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import ChangesBanner from '../components/ChangesBanner';
import DoseDrawer from '../components/DoseDrawer';
import Timeline from '../components/Timeline';
import UpcomingPanel from '../components/UpcomingPanel';
import { useAppState } from '../context/AppState';
import { useClock } from '../context/ClockContext';
import { doseKey, isActiveOn, toTop } from '../lib/time';
import type { Dose } from '../types';

export default function Schedule() {
  const { profile, entries, doses, statuses, setStatus, changes, conflicts, error, loading, clearChanges, moveDose } =
  useAppState();
  const { nowMin, dateISO } = useClock();
  const [date, setDate] = useState(new Date());
  const [selected, setSelected] = useState<Dose | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const shownISO = format(date, 'yyyy-MM-dd');

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = toTop(profile.wake) - 24;
  }, [profile.wake]);

  const visible = doses.filter(d => {
    const e = entries.find(x => x.id === d.entryId);
    return e ? isActiveOn(e, date) : false;
  });
  const statusOf = (d: Dose) => statuses[doseKey(d, shownISO)] ?? 'pending';
  const isChanged = (d: Dose) => changes.some(c => c.entryId === d.entryId && c.to === d.time);

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <h1 className='text-2xl font-semibold'>Schedule</h1>
          <span className='rounded-full bg-sky px-3 py-1 text-sm text-navy'>Daily</span>
        </div>
        <Link
          to='/medications'
          className='flex items-center gap-1 rounded-lg bg-sky px-3 py-2 text-navy'
        >
          <Plus size={18} /> Add medications
        </Link>
      </div>

      <ChangesBanner
        changes={changes}
        conflicts={conflicts}
        error={error}
        loading={loading}
        onDismiss={clearChanges}
      />

      <div className='flex items-center gap-2'>
        <button
          aria-label='Previous day'
          className='rounded border p-2'
          onClick={() => setDate(d => addDays(d, -1))}
        >
          <ChevronLeft />
        </button>
        <input
          type='date'
          className='rounded border px-3 py-2'
          value={shownISO}
          onChange={e => e.target.value && setDate(parseISO(e.target.value))}
        />
        <button
          aria-label='Next day'
          className='rounded border p-2'
          onClick={() => setDate(d => addDays(d, 1))}
        >
          <ChevronRight />
        </button>
        <button className='rounded border px-3 py-2' onClick={() => setDate(new Date())}>
          Today
        </button>
      </div>

      {visible.length === 0 && (
        <p className='rounded-lg bg-white p-3 text-navy/70'>
          {entries.length === 0
            ? 'No medications yet. Press Add medications to start.'
            : 'No doses on this date.'}
        </p>
      )}

      <div className='grid gap-3 lg:grid-cols-[1fr_320px]'>
        <div className='lg:order-2'>
          <UpcomingPanel />
        </div>
        <div ref={scroller} className='h-[65vh] overflow-y-auto rounded-xl border bg-white lg:order-1'>
          <Timeline
            doses={visible}
            profile={profile}
            nowMin={shownISO === dateISO ? nowMin : null}
            statusOf={statusOf}
            isChanged={isChanged}
            onSelect={setSelected}
          />
        </div>
      </div>

      <DoseDrawer
      key={selected ? `${selected.entryId}-${selected.time}` : 'closed'}
      dose={selected}
      onClose={() => setSelected(null)}
      onMove={
        selected
          ? async newTime => {
              const reasons = await moveDose(selected, newTime);
              if (!reasons.length) setSelected(null);
              return reasons;
            }
          : undefined
      }
      onStatus={s => {
        if (selected) setStatus(doseKey(selected, shownISO), s);
      }}
      />
    </div>
  );
}