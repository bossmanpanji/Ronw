export interface JobOption {
  name: string;
  group: string;
  color: string;
  textColor: string;
}

export const JOBS: readonly JobOption[] = [
  // Swordsman Tree
  { name: 'Swordsman', group: 'Swordsman', color: '#DC2626', textColor: '#FFFFFF' },
  { name: 'Knight', group: 'Swordsman', color: '#DC2626', textColor: '#FFFFFF' },
  { name: 'Crusader', group: 'Swordsman', color: '#B91C1C', textColor: '#FFFFFF' },
  { name: 'Lord Knight', group: 'Swordsman', color: '#DC2626', textColor: '#FFFFFF' },
  { name: 'Paladin', group: 'Swordsman', color: '#B91C1C', textColor: '#FFFFFF' },
  { name: 'Rune Knight', group: 'Swordsman', color: '#991B1B', textColor: '#FFFFFF' },
  { name: 'Royal Guard', group: 'Swordsman', color: '#B91C1C', textColor: '#FFFFFF' },

  // Mage Tree
  { name: 'Mage', group: 'Mage', color: '#2563EB', textColor: '#FFFFFF' },
  { name: 'Wizard', group: 'Mage', color: '#2563EB', textColor: '#FFFFFF' },
  { name: 'Sage', group: 'Mage', color: '#1D4ED8', textColor: '#FFFFFF' },
  { name: 'High Wizard', group: 'Mage', color: '#2563EB', textColor: '#FFFFFF' },
  { name: 'Scholar', group: 'Mage', color: '#1D4ED8', textColor: '#FFFFFF' },
  { name: 'Warlock', group: 'Mage', color: '#1E40AF', textColor: '#FFFFFF' },
  { name: 'Sorcerer', group: 'Mage', color: '#1D4ED8', textColor: '#FFFFFF' },

  // Archer Tree
  { name: 'Archer', group: 'Archer', color: '#16A34A', textColor: '#0F172A' },
  { name: 'Hunter', group: 'Archer', color: '#16A34A', textColor: '#0F172A' },
  { name: 'Bard', group: 'Archer', color: '#15803D', textColor: '#FFFFFF' },
  { name: 'Dancer', group: 'Archer', color: '#15803D', textColor: '#FFFFFF' },
  { name: 'Sniper', group: 'Archer', color: '#16A34A', textColor: '#0F172A' },
  { name: 'Clown', group: 'Archer', color: '#15803D', textColor: '#FFFFFF' },
  { name: 'Gypsy', group: 'Archer', color: '#15803D', textColor: '#FFFFFF' },
  { name: 'Ranger', group: 'Archer', color: '#166534', textColor: '#FFFFFF' },
  { name: 'Minstrel', group: 'Archer', color: '#15803D', textColor: '#FFFFFF' },
  { name: 'Wanderer', group: 'Archer', color: '#15803D', textColor: '#FFFFFF' },

  // Acolyte Tree
  { name: 'Acolyte', group: 'Acolyte', color: '#F59E0B', textColor: '#0F172A' },
  { name: 'Priest', group: 'Acolyte', color: '#F59E0B', textColor: '#0F172A' },
  { name: 'Monk', group: 'Acolyte', color: '#D97706', textColor: '#0F172A' },
  { name: 'High Priest', group: 'Acolyte', color: '#F59E0B', textColor: '#0F172A' },
  { name: 'Champion', group: 'Acolyte', color: '#D97706', textColor: '#0F172A' },
  { name: 'Arch Bishop', group: 'Acolyte', color: '#F59E0B', textColor: '#0F172A' },
  { name: 'Sura', group: 'Acolyte', color: '#B45309', textColor: '#FFFFFF' },

  // Thief Tree
  { name: 'Thief', group: 'Thief', color: '#7C3AED', textColor: '#FFFFFF' },
  { name: 'Assassin', group: 'Thief', color: '#7C3AED', textColor: '#FFFFFF' },
  { name: 'Rogue', group: 'Thief', color: '#6D28D9', textColor: '#FFFFFF' },
  { name: 'Assassin Cross', group: 'Thief', color: '#7C3AED', textColor: '#FFFFFF' },
  { name: 'Stalker', group: 'Thief', color: '#6D28D9', textColor: '#FFFFFF' },
  { name: 'Guillotine Cross', group: 'Thief', color: '#5B21B6', textColor: '#FFFFFF' },
  { name: 'Shadow Chaser', group: 'Thief', color: '#6D28D9', textColor: '#FFFFFF' },

  // Merchant Tree
  { name: 'Merchant', group: 'Merchant', color: '#EA580C', textColor: '#0F172A' },
  { name: 'Blacksmith', group: 'Merchant', color: '#EA580C', textColor: '#0F172A' },
  { name: 'Alchemist', group: 'Merchant', color: '#C2410C', textColor: '#FFFFFF' },
  { name: 'Whitesmith', group: 'Merchant', color: '#EA580C', textColor: '#0F172A' },
  { name: 'Creator', group: 'Merchant', color: '#C2410C', textColor: '#FFFFFF' },
  { name: 'Mechanic', group: 'Merchant', color: '#9A3412', textColor: '#FFFFFF' },
  { name: 'Genetic', group: 'Merchant', color: '#C2410C', textColor: '#FFFFFF' },

  // Gunslinger Tree
  { name: 'Gunslinger', group: 'Gunslinger', color: '#DB2777', textColor: '#FFFFFF' },
  { name: 'Rebel', group: 'Gunslinger', color: '#BE185D', textColor: '#FFFFFF' },
  { name: 'Night Walker', group: 'Gunslinger', color: '#9D174D', textColor: '#FFFFFF' },
  { name: 'Night Watch', group: 'Gunslinger', color: '#9D174D', textColor: '#FFFFFF' },

  // Druid Tree
  { name: 'Druid', group: 'Druid', color: '#0D9488', textColor: '#0F172A' },
  { name: 'Kanos', group: 'Druid', color: '#0F766E', textColor: '#FFFFFF' },
  { name: 'Alithea', group: 'Druid', color: '#115E59', textColor: '#FFFFFF' },
];

export function getJobByName(name: string): JobOption {
  const found = JOBS.find((item) => item.name.toLowerCase() === name.toLowerCase());
  return (
    found ?? {
      name,
      group: 'Lainnya',
      color: '#E2E8F0',
      textColor: '#0F172A',
    }
  );
}
