import { createContext, useContext, useState, type ReactNode } from 'react';
import { generateSchedule } from '../api';
import { DEFAULT_PROFILE } from '../defaults';
import { useLocalStorage } from '../lib/storage';
import type { Dose, DoseStatus, MedEntry, Profile, ScheduleResponse } from '../types';

type Change = NonNullable<ScheduleResponse['changes']>[number];

type AppStateValue = {
  profile: Profile;
  setProfile: (p: Profile) => void;
  entries: MedEntry[];
  setEntries: (e: MedEntry[]) => void;
  doses: Dose[];
  conflicts: string[];
  changes: Change[];
  statuses: Record<string, DoseStatus>;
  setStatus: (key: string, s: DoseStatus) => void;
  loading: boolean;
  error: string | null;
  regenerate: (p?: Profile, e?: MedEntry[]) => Promise<void>;
  clearChanges: () => void;
};

const Ctx = createContext<AppStateValue | null>(null);

// What moved between the old schedule and the new one?
function diff(prev: Dose[], next: Dose[]): Change[] {
  const out: Change[] = [];
  for (const n of next) {
    const same = (list: Dose[]) => list.filter(d => d.entryId === n.entryId);
    const p = same(prev)[same(next).indexOf(n)];
    if (p && p.time !== n.time) {
      out.push({ entryId: n.entryId, name: n.name, from: p.time, to: n.time });
    }
  }
  return out;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useLocalStorage<Profile>('mf-profile', DEFAULT_PROFILE);
  const [entries, setEntries] = useLocalStorage<MedEntry[]>('mf-entries', []);
  const [doses, setDoses] = useLocalStorage<Dose[]>('mf-doses', []);
  const [statuses, setStatuses] = useLocalStorage<Record<string, DoseStatus>>('mf-status', {});
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [changes, setChanges] = useState<Change[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function regenerate(p: Profile = profile, e: MedEntry[] = entries) {
    setLoading(true);
    setError(null);
    try {
      const res = await generateSchedule(p, e);
      if (res.success) {
        setChanges(res.changes ?? diff(doses, res.doses));
        setDoses(res.doses);
        setConflicts([]);
      } else {
        setConflicts(res.conflicts ?? ['No valid schedule was found.']);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Ctx.Provider
      value={{
        profile, setProfile,
        entries, setEntries,
        doses, conflicts, changes,
        statuses, setStatus: (key, s) => setStatuses(x => ({ ...x, [key]: s })),
        loading, error,
        regenerate,
        clearChanges: () => setChanges([]),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAppState() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppState must be used inside AppStateProvider');
  return v;
}