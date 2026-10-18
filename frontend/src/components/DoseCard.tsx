import type { CSSProperties } from 'react';
import { Check } from 'lucide-react';
import { fmt } from '../lib/time';
import type { Dose, DoseStatus, FoodRule } from '../types';

export const FOOD_STYLE: Record<FoodRule, { box: string; label: string }> = {
  empty: { box: 'border-navy bg-sky', label: 'Empty stomach' },
  with_food: { box: 'border-teal bg-sky', label: 'With food' },
  any: { box: 'border-navy/40 bg-sky', label: 'Any time' },
};

type Props = {
  dose: Dose;
  status: DoseStatus;
  highlighted: boolean;
  onClick: () => void;
  style: CSSProperties;
};

export default function DoseCard({ dose, status, highlighted, onClick, style }: Props) {
  const s = FOOD_STYLE[dose.foodRule];
  return (
    <button
      onClick={onClick}
      style={style}
      className={`absolute overflow-hidden rounded-md border-l-4 px-2 py-1 text-left text-sm shadow-md ${s.box} ${
        highlighted ? 'ring-2 ring-navy' : ''
      } ${status === 'skipped' ? 'line-through opacity-50' : ''} ${status === 'taken' ? 'opacity-70' : ''}`}
    >
      <div className='flex items-center gap-1 font-medium'>
        {status === 'taken' && <Check size={14} />}
        {dose.name}
      </div>
      <div className='text-xs text-navy'>
        {fmt(dose.time)} · {s.label}
      </div>
    </button>
  );
}