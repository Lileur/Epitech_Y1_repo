export interface FallbackJob {
  id: string;
  title: string;
  company: string;
  logo: string;
  tags: Array<{ label: string; type: 'remote' | 'salary' | 'type' }>;
  salary?: string;
  location: string;
  postedDays: number;
  featured?: boolean;
}

export const FALLBACK_WELOVEDEVS_JOBS: FallbackJob[] = [
  {
    id: 'wld-1',
    title: 'Frontend React Developer',
    company: 'Doctolib',
    logo: 'DO',
    tags: [{ label: 'Remote', type: 'remote' }, { label: 'CDI', type: 'type' }, { label: '48k-62k€', type: 'salary' }],
    salary: '48k-62k€',
    location: 'Paris',
    postedDays: 1,
    featured: true,
  },
  {
    id: 'wld-2',
    title: 'Backend Node.js Engineer',
    company: 'BlaBlaCar',
    logo: 'BL',
    tags: [{ label: 'Hybrid', type: 'remote' }, { label: 'CDI', type: 'type' }],
    location: 'Paris',
    postedDays: 2,
  },
  {
    id: 'wld-3',
    title: 'DevOps / Cloud Engineer',
    company: 'Qonto',
    logo: 'QO',
    tags: [{ label: 'Remote', type: 'remote' }, { label: 'CDI', type: 'type' }, { label: '55k-70k€', type: 'salary' }],
    salary: '55k-70k€',
    location: 'Remote',
    postedDays: 0,
    featured: true,
  },
  {
    id: 'wld-4',
    title: 'Data Analyst',
    company: 'ManoMano',
    logo: 'MM',
    tags: [{ label: 'Paris', type: 'remote' }, { label: 'CDI', type: 'type' }],
    location: 'Paris',
    postedDays: 3,
  },
  {
    id: 'wld-5',
    title: 'Stage Fullstack TypeScript',
    company: 'PayFit',
    logo: 'PF',
    tags: [{ label: 'Stage', type: 'type' }, { label: 'Hybrid', type: 'remote' }],
    location: 'Barcelona',
    postedDays: 4,
  },
];
