import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { useAppState } from '../context/AppState';
import { toMin } from '../lib/time';
import type { MiscBlock, Profile, Role } from '../types';

const input = 'w-full rounded-lg border border-navy/30 px-3 py-3 text-base';
const CUISINES = ['Indian', 'Mediterranean', 'Mexican', 'Chinese', 'Southern', 'Vegetarian', 'Halal', 'Kosher'];
const ROLES: { id: Role; label: string }[] = [
  { id: 'patient', label: 'Patient' },
  { id: 'caregiver', label: 'Caregiver' },
  { id: 'staff', label: 'Staff member' },
];

function validate(p: Profile): string[] {
  if ([p.wake, p.sleep, p.breakfast, p.lunch, p.dinner].some(t => !t)) return ['Fill in every time.'];
  const errs: string[] = [];
  const wake = toMin(p.wake);
  const sleep = toMin(p.sleep);
  if (wake >= sleep) errs.push('Wake-up time must be before bedtime.');
  for (const [label, t] of [['Breakfast', p.breakfast], ['Lunch', p.lunch], ['Dinner', p.dinner]] as const) {
    const m = toMin(t);
    if (m < wake || m > sleep) errs.push(`${label} must be between wake-up time and bedtime.`);
  }
  if (toMin(p.breakfast) >= toMin(p.lunch) || toMin(p.lunch) >= toMin(p.dinner)) {
    errs.push('Meals must be in order: breakfast, lunch, dinner.');
  }
  for (const b of p.blocks) {
    if (!b.start || !b.end || toMin(b.start) >= toMin(b.end)) {
      errs.push(`Block '${b.label || 'untitled'}' must end after it starts.`);
    }
  }
  return errs;
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className='flex flex-col gap-1'>
      {label}
      <input className={input} type='time' value={value} onChange={e => onChange(e.target.value)} />
    </label>
  );
}

export default function ProfilePage() {
  const { profile, setProfile, entries, regenerate, loading } = useAppState();
  const [d, setD] = useState<Profile>(profile);
  const [errors, setErrors] = useState<string[]>([]);
  const nav = useNavigate();

  const set = (patch: Partial<Profile>) => setD(x => ({ ...x, ...patch }));
  const setBlock = (id: string, patch: Partial<MiscBlock>) =>
    set({ blocks: d.blocks.map(b => (b.id === id ? { ...b, ...patch } : b)) });
  const toggleCuisine = (c: string) =>
    set({ cuisines: d.cuisines.includes(c) ? d.cuisines.filter(x => x !== c) : [...d.cuisines, c] });

  async function save() {
    const errs = validate(d);
    setErrors(errs);
    if (errs.length) return;
    setProfile(d);
    if (entries.length) await regenerate(d, entries);
    nav('/schedule');
  }

  return (
    <div className='mx-auto flex max-w-xl flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>User profile</h1>

      <div className='flex gap-2'>
        {ROLES.map(r => (
          <button
            key={r.id}
            type='button'
            onClick={() => set({ role: r.id })}
            className={`flex-1 rounded-lg border py-3 ${
              d.role === r.id ? 'border-navy bg-sky/40 font-medium' : 'border-navy/30'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <label className='flex flex-col gap-1'>
        Name
        <input className={input} value={d.name} onChange={e => set({ name: e.target.value })} />
      </label>
      <label className='flex flex-col gap-1'>
        Email
        <input className={input} type='email' value={d.email} onChange={e => set({ email: e.target.value })} />
      </label>
      <label className='flex flex-col gap-1'>
        Age
        <input
          className={input}
          type='number'
          min={0}
          value={d.age ?? ''}
          onChange={e => set({ age: e.target.value ? Number(e.target.value) : undefined })}
        />
      </label>

      <TimeField label='Usual bedtime' value={d.sleep} onChange={v => set({ sleep: v })} />
      <TimeField label='Usual wake-up time' value={d.wake} onChange={v => set({ wake: v })} />
      <TimeField label='Breakfast' value={d.breakfast} onChange={v => set({ breakfast: v })} />
      <TimeField label='Lunch' value={d.lunch} onChange={v => set({ lunch: v })} />
      <TimeField label='Dinner' value={d.dinner} onChange={v => set({ dinner: v })} />

      <section className='flex flex-col gap-2'>
        <h2 className='font-medium'>Miscellaneous blocks (work, exercise, anything busy)</h2>
        {d.blocks.map(b => (
          <div key={b.id} className='flex items-center gap-2'>
            <input
              className={input}
              placeholder='Label'
              value={b.label}
              onChange={e => setBlock(b.id, { label: e.target.value })}
            />
            <input
              className={input}
              type='time'
              value={b.start}
              onChange={e => setBlock(b.id, { start: e.target.value })}
            />
            <input
              className={input}
              type='time'
              value={b.end}
              onChange={e => setBlock(b.id, { end: e.target.value })}
            />
            <button
              type='button'
              aria-label='Remove block'
              className='p-2'
              onClick={() => set({ blocks: d.blocks.filter(x => x.id !== b.id) })}
            >
              <X />
            </button>
          </div>
        ))}
        <button
          type='button'
          className='flex items-center gap-1 self-start text-teal'
          onClick={() =>
            set({ blocks: [...d.blocks, { id: crypto.randomUUID(), label: 'Work', start: '09:00', end: '17:00' }] })
          }
        >
          <Plus size={16} /> Add a block
        </button>
      </section>

      <section className='flex flex-col gap-2'>
        <h2 className='font-medium'>Cuisine preferences</h2>
        <div className='flex flex-wrap gap-2'>
          {CUISINES.map(c => (
            <button
              key={c}
              type='button'
              aria-pressed={d.cuisines.includes(c)}
              onClick={() => toggleCuisine(c)}
              className={`rounded-full border px-4 py-2 ${
                d.cuisines.includes(c) ? 'border-navy bg-sky text-navy' : 'border-navy/30'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {errors.length > 0 && (
        <ul role='alert' className='list-disc rounded-lg bg-red-50 p-3 pl-8 text-red-700'>
          {errors.map(e => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <button
        onClick={save}
        disabled={loading}
        className='rounded-lg bg-sky py-3 text-lg text-navy hover:brightness-95 disabled:opacity-50'
      >
        {loading ? 'Saving...' : 'Save changes'}
      </button>
    </div>
  );
}