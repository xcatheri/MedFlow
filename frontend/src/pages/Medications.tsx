import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import MedCard from '../components/MedCard';
import { useAppState } from '../context/AppState';
import { todayISO } from '../lib/time';
import type { MedEntry } from '../types';

const newEntry = (): MedEntry => ({
  id: crypto.randomUUID(),
  medId: null,
  name: '',
  kind: 'rx',
  startDate: todayISO(),
  timesPerDay: 1,
  days: 30,
  weekdays: [0, 1, 2, 3, 4, 5, 6],
});

export default function Medications() {
  const { entries, setEntries, profile, regenerate, loading, error } = useAppState();
  const [draft, setDraft] = useState<MedEntry[]>(entries.length ? entries : [newEntry()]);
  const nav = useNavigate();

  const update = (i: number, e: MedEntry) => setDraft(d => d.map((x, j) => (j === i ? e : x)));

  const valid =
    draft.every(e => e.name.trim() && e.days >= 1 && e.weekdays.length > 0) &&
    draft.some(e => e.medId);

  async function generate() {
    setEntries(draft);
    await regenerate(profile, draft);
    nav('/schedule');
  }

  return (
    <div className='mx-auto flex max-w-xl flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Add medication</h1>

      {draft.map((e, i) => (
        <MedCard
          key={e.id}
          entry={e}
          index={i}
          canRemove={draft.length > 1}
          onChange={x => update(i, x)}
          onRemove={() => setDraft(d => d.filter((_, j) => j !== i))}
        />
      ))}

      <button
        type='button'
        onClick={() => setDraft(d => [...d, newEntry()])}
        className='flex items-center justify-center gap-2 rounded-lg border border-dashed border-navy py-3 text-teal'
      >
        <Plus size={18} /> Add another medication
      </button>

      {error && (
        <p role='alert' className='text-red-600'>
          {error}
        </p>
      )}

      <button
        disabled={!valid || loading}
        onClick={generate}
        className='rounded-lg bg-sky py-3 text-lg text-navy hover:brightness-95 disabled:opacity-50'
      >
        {loading ? 'Generating...' : 'Generate schedule'}
      </button>
    </div>
  );
}