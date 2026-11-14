export interface JobOption {
  name: string;
  color: string;
  textColor: string;
}

export const JOBS: readonly JobOption[] = [
  { name: 'Swordsman', color: '#DC2626', textColor: '#FFFFFF' },
  { name: 'Mage', color: '#2563EB', textColor: '#FFFFFF' },
  { name: 'Archer', color: '#16A34A', textColor: '#0F172A' },
  { name: 'Acolyte', color: '#F59E0B', textColor: '#0F172A' },
  { name: 'Thief', color: '#7C3AED', textColor: '#FFFFFF' },
  { name: 'Merchant', color: '#EA580C', textColor: '#0F172A' },
  { name: 'Gunslinger', color: '#DB2777', textColor: '#FFFFFF' },
  { name: 'Druid', color: '#0D9488', textColor: '#0F172A' },
];

export function getJobByName(name: string): JobOption {
  const found = JOBS.find((item) => item.name.toLowerCase() === name.toLowerCase());
  return (
    found ?? {
      name,
      color: '#E2E8F0',
      textColor: '#0F172A',
    }
  );
}
