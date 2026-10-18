import { AlertTriangle, ArrowRight } from 'lucide-react';
import { fmt } from '../lib/time';

type Change = { entryId: string; name: string; from: string; to: string };

type Props = {
  changes: Change[];
  conflicts: string[];
  error: string | null;
  loading: boolean;
  onDismiss: () => void;
};

export default function ChangesBanner({ changes, conflicts, error, loading, onDismiss }: Props) {
  return (
    <>
      {loading && <p className='rounded-lg bg-sky/30 p-3'>Updating your schedule...</p>}
      {error && (
        <p role='alert' className='rounded-lg bg-red-50 p-3 text-red-700'>
          {error}
        </p>
      )}

      {conflicts.length > 0 && (
        <div role='alert' className='rounded-lg border border-red-300 bg-red-50 p-3 text-red-800'>
          <p className='flex items-center gap-2 font-semibold'>
            <AlertTriangle size={18} /> We could not build a valid schedule
          </p>
          <ul className='mt-1 list-disc pl-5'>
            {conflicts.map(c => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p className='mt-1 text-sm'>Your previous schedule is still shown below.</p>
        </div>
      )}

      {changes.length > 0 && (
        <div className='rounded-lg border border-violet-300 bg-violet-50 p-3'>
          <div className='flex items-center justify-between'>
            <p className='font-semibold text-violet-900'>Your schedule changed</p>
            <button onClick={onDismiss} className='text-sm underline'>
              Dismiss
            </button>
          </div>
          <ul className='mt-1'>
            {changes.map(c => (
              <li key={c.entryId + c.to} className='flex items-center gap-2'>
                {c.name}: {fmt(c.from)} <ArrowRight size={14} /> {fmt(c.to)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}