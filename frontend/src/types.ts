export type Role = 'patient' | 'caregiver' | 'staff';

export type MiscBlock = {
  id: string;
  label: string;
  start: string; // 'HH:mm'
  end: string;   // 'HH:mm'
};

export type Profile = {
  role: Role;
  name: string;
  email: string;
  age?: number;
  wake: string;
  sleep: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  blocks: MiscBlock[];
  cuisines: string[];
};

export type MedEntry = {
  id: string;              // made by the app
  medId: string | null;    // id from the drug list, null if not found
  name: string;
  kind: 'otc' | 'rx';
  startDate: string;       // 'YYYY-MM-DD'
  timesPerDay: number;
  days: number;
  weekdays: number[];      // 0 = Sunday ... 6 = Saturday
};

export type FoodRule = 'empty' | 'with_food' | 'any';

export type Dose = {
  entryId: string;
  medId: string;
  name: string;
  time: string;            // 'HH:mm'
  foodRule: FoodRule;
  reason: string;
  warnings: string[];
  minGapNote?: string;
};

export type ScheduleResponse = {
  success: boolean;
  doses: Dose[];
  conflicts?: string[];
  changes?: { entryId: string; name: string; from: string; to: string }[];
};

export type DoseStatus = 'pending' | 'taken' | 'skipped';