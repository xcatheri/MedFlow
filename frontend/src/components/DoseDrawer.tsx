import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { fmt } from '../lib/time';
import type { Dose, DoseStatus } from '../types';
import { FOOD_STYLE } from './DoseCard';

type Props = {
  dose: Dose | null;
  onClose: () => void;
  onStatus?: (s: DoseStatus) => void;
  // returns the reasons a new time was refused; an empty list means it was accepted
  onMove?: (newTime: string) => Promise<string[]>;
};

export default function DoseDrawer({ dose, onClose, onStatus, onMove }: Props) {
  const [time, setTime] = useState(dose?.time ?? '');
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!dose) return null;
  const s = FOOD_STYLE[dose.foodRule];

  async function saveTime() {
    if (!onMove) return;
    setSaving(true);
    setErrors([]);
    const reasons = await onMove(time);
    setSaving(false);
    if (reasons.length) setErrors(reasons); // when it worked, the page closes this box
  }

  return (
    <div className='fixed inset-0 z-30'>
      <div className='absolute inset-0 bg-black/30' onClick={onClose} />
      <aside className='absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:left-auto sm:top-0 sm:max-h-none sm:w-96 sm:rounded-none'>
        <div className='flex items-start justify-between'>
          <h2 className='text-xl font-semibold'>{dose.name}</h2>
          <button aria-label='Close' onClick={onClose} className='rounded p-2 hover:bg-sky/30'>
            <X />
          </button>
        </div>

        <dl className='mt-4 flex flex-col gap-4'>
          <div>
            <dt className='text-sm text-navy/70'>Time</dt>
            <dd className='text-lg'>{fmt(dose.time)}</dd>
          </div>
          <div>
            <dt className='text-sm text-navy/70'>Meal requirement</dt>
            <dd>
              <span className={`inline-block rounded border-l-4 px-2 py-1 ${s.box}`}>{s.label}</span>
            </dd>
          </div>
          <div>
            <dt className='text-sm text-navy/70'>Why this time</dt>
            <dd>{dose.reason}</dd>
          </div>
          {dose.warnings.length > 0 && (
            <div>
              <dt className='text-sm text-navy/70'>Additional warnings</dt>
              <dd>
                <ul className='list-disc pl-5'>
                  {dose.warnings.map(w => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
          {dose.minGapNote && (
            <div>
              <dt className='text-sm text-navy/70'>Minimum gap from other medication</dt>
              <dd>{dose.minGapNote}</dd>
            </div>
          )}
        </dl>

        {onMove && (
          <div className='mt-6 rounded-lg border border-navy/20 p-3'>
            <label className='flex flex-col gap-1 text-sm text-navy/70'>
              Change time (applies to every day)
              <input
                type='time'
                step={300}
                value={time}
                onChange={e => setTime(e.target.value)}
                className='rounded-lg border border-navy/30 px-3 py-2 text-base text-navy'
              />
            </label>
            <button
              disabled={saving || !time || time === dose.time}
              onClick={saveTime}
              className='mt-2 w-full rounded-lg bg-sky py-2 text-navy disabled:opacity-50'
            >
              {saving ? 'Checking...' : 'Save new time'}
            </button>
            {errors.length > 0 && (
              <div role='alert' className='mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-800'>
                <p className='font-semibold'>That change is not allowed</p>
                <ul className='mt-1 list-disc pl-5'>
                  {errors.map(r => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {onStatus && (
          <div className='mt-6 flex gap-2'>
            <button
              className='flex-1 rounded-lg bg-sky py-3 text-navy'
              onClick={() => {
                onStatus('taken');
                onClose();
              }}
            >
              Mark taken
            </button>
            <button
              className='flex-1 rounded-lg border py-3'
              onClick={() => {
                onStatus('skipped');
                onClose();
              }}
            >
              Skip
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}