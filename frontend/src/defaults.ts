import type { Profile } from './types';

export const DEFAULT_PROFILE: Profile = {
  role: 'patient', name: '', email: '',
  wake: '08:00', breakfast: '09:00', lunch: '13:00', dinner: '19:00', sleep: '22:00',
  blocks: [], cuisines: [],
};