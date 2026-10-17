import type { FoodRule } from '../types';

export type Meal = 'breakfast' | 'lunch' | 'dinner';

export type Constraint =
  | { type: 'before_meal'; meal: Meal; minMinutes: number; maxMinutes: number }
  | { type: 'with_meal' }
  | { type: 'separation'; medicationId: string; minMinutes: number; maxMinutes?: number }
  | { type: 'interval'; minMinutes: number }
  | { type: 'warning'; avoid?: string; other?: string };

type RawMed = { id: string; name: string; constraints: Constraint[] };

// Copy of backend/medications.json (template entry '000' left out).
const RAW_MEDS: RawMed[] = [
  {
    id: '001',
    name: 'Levothyroxine',
    constraints: [
      { type: 'before_meal', meal: 'breakfast', minMinutes: 30, maxMinutes: 60 },
      { type: 'separation', medicationId: 'Calcium Carbonate', minMinutes: 240 },
      { type: 'interval', minMinutes: 1080 },
      { type: 'warning', avoid: 'coffee', other: 'Take on an empty stomach.' },
    ],
  },
  {
    id: '002',
    name: 'Calcium Carbonate',
    constraints: [
      { type: 'with_meal' },
      { type: 'separation', medicationId: 'Calcium Carbonate', minMinutes: 240 },
      { type: 'interval', minMinutes: 240 },
    ],
  },
  {
    id: '003',
    name: 'Metformin',
    constraints: [
      { type: 'with_meal' },
      { type: 'interval', minMinutes: 480 },
      { type: 'warning', avoid: 'alcohol' },
    ],
  },
  {
    id: '004',
    name: 'Atorvastatin',
    constraints: [
      { type: 'interval', minMinutes: 1080 },
      { type: 'warning', avoid: 'grapefruit juice' },
    ],
  },
  {
    id: '005',
    name: 'Amoxicillin',
    constraints: [
      { type: 'interval', minMinutes: 420 },
      { type: 'warning', other: 'Taking with food may help reduce stomach pain.' },
    ],
  },
  {
    id: '006',
    name: 'Ibuprofen',
    constraints: [
      { type: 'with_meal' },
      { type: 'interval', minMinutes: 360 },
      { type: 'warning', avoid: 'alcohol, other NSAIDs' },
    ],
  },
  {
    id: '007',
    name: 'Lisinopril',
    constraints: [
      { type: 'interval', minMinutes: 1080 },
      { type: 'warning', avoid: 'potassium supplements, salt substitutes' },
    ],
  },
];

// The simple shape the screens use.
export type MedInfo = {
  id: string;
  name: string;
  foodRule: FoodRule;
  detail: string;
  warnings: string[];
  separations: { from: string; fromName: string; minutes: number }[];
};

const findRaw = (ref: string) =>
  RAW_MEDS.find(m => m.id === ref || m.name.toLowerCase() === ref.toLowerCase());

const hours = (min: number) => (min % 60 === 0 ? `${min / 60}` : (min / 60).toFixed(1));

function describe(med: RawMed): MedInfo {
  let foodRule: FoodRule = 'any';
  const details: string[] = [];
  const warnings: string[] = [];
  const separations: MedInfo['separations'] = [];

  for (const c of med.constraints) {
    if (c.type === 'before_meal') {
      foodRule = 'empty';
      details.push(`${c.minMinutes} to ${c.maxMinutes} minutes before ${c.meal}`);
    } else if (c.type === 'with_meal') {
      foodRule = 'with_food';
    } else if (c.type === 'interval') {
      details.push(`at least ${hours(c.minMinutes)} hours between doses`);
    } else if (c.type === 'separation') {
      const other = findRaw(c.medicationId); // the file uses a name here, so match id OR name
      if (other && other.id !== med.id) {
        separations.push({ from: other.id, fromName: other.name, minutes: c.minMinutes });
      }
    } else if (c.type === 'warning') {
      if (c.avoid) for (const a of c.avoid.split(',')) warnings.push(`Avoid ${a.trim()}`);
      if (c.other) warnings.push(c.other);
    }
  }
  return { id: med.id, name: med.name, foodRule, detail: details.join(', '), warnings, separations };
}

export const MEDS: MedInfo[] = RAW_MEDS.map(describe);

// Treat every separation as two-way: if A must stay away from B, then B must stay away from A.
for (const m of MEDS) {
  for (const s of m.separations) {
    const other = MEDS.find(x => x.id === s.from);
    if (other && !other.separations.some(o => o.from === m.id)) {
      other.separations.push({ from: m.id, fromName: m.name, minutes: s.minutes });
    }
  }
}