import { MEDS } from '../mock/meds';
import type { FoodRule, MedEntry } from '../types';
import WeekdayPicker from './WeekdayPicker';

const input = 'w-full rounded-lg border border-slate-300 px-3 py-3 text-base';
const FOOD_TEXT: Record<FoodRule, string> = {
  empty: 'Empty stomach',
  with_food: 'With food',
  any: 'Any time',
};

type Props = {
  entry: MedEntry;
  index: number;
  canRemove: boolean;
  onChange: (e: MedEntry) => void;
  onRemove: () => void;
};

export default function MedCard({ entry, index, canRemove, onChange, onRemove }: Props) {
  const set = (patch: Partial<MedEntry>) => onChange({ ...entry, ...patch });
  const known = MEDS.find(m => m.id === entry.medId);

  function setName(name: string) {
    const match = MEDS.find(m => m.name.toLowerCase() === name.trim().toLowerCase());
    set({ name, medId: match ? match.id : null });
  }

  return (
    <section className='flex flex-col gap-4 rounded-xl border bg-white p-4 shadow-sm'>
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-semibold'>
          Med {index + 1}
          {index === 0 && ' *'}
        </h2>
        {canRemove && (
          <button type='button' onClick={onRemove} className='text-red-600 underline'>
            Remove
          </button>
        )}
      </div>

      <label className='flex flex-col gap-1'>
        When to start
        <input
          className={input}
          type='date'
          value={entry.startDate}
          onChange={e => set({ startDate: e.target.value })}
        />
      </label>

      <div className='flex gap-2'>
        {(['otc', 'rx'] as const).map(k => (
          <button
            type='button'
            key={k}
            onClick={() => set({ kind: k })}
            className={`flex-1 rounded-lg border py-3 ${
              entry.kind === k ? 'border-teal-600 bg-teal-50 font-medium' : 'border-slate-300'
            }`}
          >
            {k === 'otc' ? 'Over the counter' : 'Prescription'}
          </button>
        ))}
      </div>

      <label className='flex flex-col gap-1'>
        Name of medication
        <input
          className={input}
          list='med-list'
          value={entry.name}
          onChange={e => setName(e.target.value)}
          placeholder='Start typing, e.g. Metformin'
        />
        <datalist id='med-list'>
          {MEDS.map(m => (
            <option key={m.id} value={m.name} />
          ))}
        </datalist>
      </label>
      {known && (
        <p className='text-sm text-teal-700'>
          {FOOD_TEXT[known.foodRule]}
          {known.detail && `, ${known.detail}`}
        </p>
      )}
      {entry.name.trim() && !known && (
        <p className='text-sm text-amber-700'>Not in our database yet. It will be left out of the schedule.</p>
      )}

      <div className='flex items-center justify-between'>
        <span>Doses per day</span>
        <div className='flex items-center gap-3'>
          <button
            type='button'
            aria-label='Fewer doses'
            className='h-11 w-11 rounded-full border text-xl'
            onClick={() => set({ timesPerDay: Math.max(1, entry.timesPerDay - 1) })}
          >
            -
          </button>
          <span className='w-6 text-center text-lg'>{entry.timesPerDay}</span>
          <button
            type='button'
            aria-label='More doses'
            className='h-11 w-11 rounded-full border text-xl'
            onClick={() => set({ timesPerDay: Math.min(4, entry.timesPerDay + 1) })}
          >
            +
          </button>
        </div>
      </div>

      <label className='flex flex-col gap-1'>
        How many days
        <input
          className={input}
          type='number'
          min={1}
          value={entry.days}
          onChange={e => set({ days: Number(e.target.value) })}
        />
      </label>

      <div className='flex flex-col gap-2'>
        <span>Recurrence</span>
        <WeekdayPicker value={entry.weekdays} onChange={weekdays => set({ weekdays })} />
      </div>
    </section>
  );
}