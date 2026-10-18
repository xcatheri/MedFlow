const LABELS = ['S', 'M', 'T', 'W', 'Th', 'F', 'Sa'];

type Props = { value: number[]; onChange: (v: number[]) => void };

export default function WeekdayPicker({ value, onChange }: Props) {
  const toggle = (d: number) =>
    onChange(value.includes(d) ? value.filter(x => x !== d) : [...value, d].sort((a, b) => a - b));

  return (
    <div className='flex flex-wrap gap-2' role='group' aria-label='Recurrence'>
      {LABELS.map((label, d) => {
        const on = value.includes(d);
        return (
          <button
            type='button'
            key={d}
            aria-pressed={on}
            onClick={() => toggle(d)}
            className={`h-11 w-11 rounded-full border text-sm font-medium ${
              on ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 bg-white text-slate-700'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}