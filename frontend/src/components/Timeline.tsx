import { Utensils } from 'lucide-react';
import { PX_PER_HOUR, fmt, toMin, toTop } from '../lib/time';
import type { Dose, DoseStatus, Profile } from '../types';
import DoseCard from './DoseCard';

const HEIGHT = 24 * PX_PER_HOUR;
const CARD_MINUTES = 45;

function layout(doses: Dose[]) {
  const sorted = [...doses].sort((a, b) => toMin(a.time) - toMin(b.time));
  const laneEnd: number[] = [];
  const placed = sorted.map(dose => {
    const start = toMin(dose.time);
    let lane = laneEnd.findIndex(end => end <= start);
    if (lane === -1) lane = laneEnd.length;
    laneEnd[lane] = start + CARD_MINUTES;
    return { dose, lane };
  });
  return { placed, count: Math.max(1, laneEnd.length) };
}

type Props = {
  doses: Dose[];
  profile: Profile;
  nowMin: number | null;
  statusOf: (d: Dose) => DoseStatus;
  isChanged: (d: Dose) => boolean;
  onSelect: (d: Dose) => void;
};

export default function Timeline({ doses, profile, nowMin, statusOf, isChanged, onSelect }: Props) {
  const { placed, count } = layout(doses);
  const meals = [
    { label: 'Breakfast', time: profile.breakfast },
    { label: 'Lunch', time: profile.lunch },
    { label: 'Dinner', time: profile.dinner },
  ];
  const hatch = 'repeating-linear-gradient(45deg, #f5efeb, #f5efeb 6px, #e6ddd6 6px, #e6ddd6 12px)';

  return (
    <div className='relative' style={{ height: HEIGHT }}>
      {Array.from({ length: 24 }, (_, h) => (
        <div
          key={h}
          className='absolute left-0 right-0 border-t border-navy/15'
          style={{ top: h * PX_PER_HOUR }}
        >
          <span className='absolute -top-2.5 left-1 bg-white px-1 text-xs text-navy/70'>
            {fmt(`${String(h).padStart(2, '0')}:00`)}
          </span>
        </div>
      ))}

      <div className='absolute bottom-0 right-0 top-0' style={{ left: 72 }}>
        <div
          className='absolute left-0 right-0 bg-navy/10'
          style={{ top: 0, height: toTop(profile.wake) }}
        />
        <div
          className='absolute left-0 right-0 bg-navy/10'
          style={{ top: toTop(profile.sleep), height: HEIGHT - toTop(profile.sleep) }}
        />

        {profile.blocks.map(b => (
          <div
            key={b.id}
            className='absolute left-0 right-0 border border-navy/30 px-2 text-right text-xs text-navy/70'
            style={{ top: toTop(b.start), height: toTop(b.end) - toTop(b.start), backgroundImage: hatch }}
          >
            {b.label}
          </div>
        ))}

        {meals.map(m => (
          <div
            key={m.label}
            className='absolute left-0 right-0 border-t-2 border-navy/40'
            style={{ top: toTop(m.time) }}
          >
            <span className='absolute right-1 top-1 flex items-center gap-1 text-xs font-medium text-navy/70'>
              <Utensils size={12} /> {m.label} {fmt(m.time)}
            </span>
          </div>
        ))}

        <div className='absolute inset-y-0 left-0 right-28'>
          {placed.map(({ dose, lane }) => (
            <DoseCard
              key={`${dose.entryId}-${dose.time}`}
              dose={dose}
              status={statusOf(dose)}
              highlighted={isChanged(dose)}
              onClick={() => onSelect(dose)}
              style={{
                top: toTop(dose.time),
                height: (CARD_MINUTES / 60) * PX_PER_HOUR,
                left: `${(lane * 100) / count}%`,
                width: `calc(${100 / count}% - 4px)`,
              }}
            />
          ))}
        </div>

        {nowMin !== null && (
          <div
            className='absolute left-0 right-0 border-t-2 border-red-500'
            style={{ top: (nowMin / 60) * PX_PER_HOUR }}
          />
        )}
      </div>
    </div>
  );
}