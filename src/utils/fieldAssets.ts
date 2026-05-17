import type { FieldCategory } from '../types';

const UNSPLASH = (id: string, w = 900) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

// Field-adaptive hero imagery. Each photo is hand-picked to feel relevant
// rather than generic-stock. Hotlinked from Unsplash CDN.
const FIELD_HERO: Record<FieldCategory, string> = {
  STEM:                  'photo-1517180102446-f3ece451e9d8',
  Business:              'photo-1573164713988-8665fc963095',
  'Medicine & Health':   'photo-1576091160550-2173dba999ef',
  'Arts & Design':       'photo-1452860606245-08befc0ff44b',
  'Music & Performance': 'photo-1493225457124-a3eb161ffa5f',
  Humanities:            'photo-1457369804613-52c61a468e7d',
  'Social Sciences':     'photo-1521737604893-d14cc237f11d',
  Law:                   'photo-1505664194779-8beaceb93744',
  Education:             'photo-1503676260728-1c00da094a0b',
  Agriculture:           'photo-1574323347407-f5e1ad6d020b',
  Other:                 'photo-1523240795612-9a054b0db644',
};

export function getFieldHero(field: FieldCategory, w = 900): string {
  return UNSPLASH(FIELD_HERO[field] || FIELD_HERO.Other, w);
}

export const FIELD_GREETING: Record<FieldCategory, string> = {
  STEM:                  'Build the future',
  Business:              'Lead with vision',
  'Medicine & Health':   'Heal the world',
  'Arts & Design':       'Create with intent',
  'Music & Performance': 'Move hearts',
  Humanities:            'Tell the human story',
  'Social Sciences':     'Understand & change systems',
  Law:                   'Stand for justice',
  Education:             'Shape minds',
  Agriculture:           'Feed nations',
  Other:                 'Your journey, beautifully organized',
};
