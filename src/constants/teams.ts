export type LineupCategoryId = 'guild-league' | 'siege' | 'polarity';

export interface LineupCategoryConfig {
  id: LineupCategoryId;
  label: string;
}

export const LINEUP_CATEGORIES: readonly LineupCategoryConfig[] = [
  { id: 'guild-league', label: 'Guild League' },
  { id: 'siege', label: 'Siege' },
  { id: 'polarity', label: 'Polarity' },
];

export type DivisionId =
  | 'main-1'
  | 'main-2'
  | 'main-3'
  | 'main-4'
  | 'sub-1'
  | 'sub-2'
  | 'siege-1'
  | 'siege-2'
  | 'siege-3'
  | 'siege-4'
  | 'polarity-1'
  | 'polarity-2'
  | 'polarity-3'
  | 'polarity-4';

export interface DivisionConfig {
  id: DivisionId;
  category: LineupCategoryId;
  label: string;
  color: string;
  textColor: string;
  softBg: string;
  softBorder: string;
}

export const TEAMS_PER_DIVISION = 8;
export const SLOTS_PER_TEAM = 5;

const MAIN_FIELD_STYLE = {
  color: '#DC2626',
  textColor: '#FFFFFF',
  softBg: '#FEF2F2',
  softBorder: '#FECACA',
} as const;

const SUB_FIELD_STYLE = {
  color: '#15803D',
  textColor: '#FFFFFF',
  softBg: '#F0FDF4',
  softBorder: '#BBF7D0',
} as const;

const SIEGE_TEAM_STYLE = {
  color: '#7C3AED',
  textColor: '#FFFFFF',
  softBg: '#F5F3FF',
  softBorder: '#DDD6FE',
} as const;

const POLARITY_TEAM_STYLE = {
  color: '#2563EB',
  textColor: '#FFFFFF',
  softBg: '#EFF6FF',
  softBorder: '#BFDBFE',
} as const;

export const DIVISIONS: readonly DivisionConfig[] = [
  { id: 'main-1', category: 'guild-league', label: 'Main Field 1', ...MAIN_FIELD_STYLE },
  { id: 'main-2', category: 'guild-league', label: 'Main Field 2', ...MAIN_FIELD_STYLE },
  { id: 'main-3', category: 'guild-league', label: 'Main Field 3', ...MAIN_FIELD_STYLE },
  { id: 'main-4', category: 'guild-league', label: 'Main Field 4', ...MAIN_FIELD_STYLE },
  { id: 'sub-1', category: 'guild-league', label: 'Sub Field 1', ...SUB_FIELD_STYLE },
  { id: 'sub-2', category: 'guild-league', label: 'Sub Field 2', ...SUB_FIELD_STYLE },
  { id: 'siege-1', category: 'siege', label: 'Siege Team 1', ...SIEGE_TEAM_STYLE },
  { id: 'siege-2', category: 'siege', label: 'Siege Team 2', ...SIEGE_TEAM_STYLE },
  { id: 'siege-3', category: 'siege', label: 'Siege Team 3', ...SIEGE_TEAM_STYLE },
  { id: 'siege-4', category: 'siege', label: 'Siege Team 4', ...SIEGE_TEAM_STYLE },
  { id: 'polarity-1', category: 'polarity', label: 'Polarity Team 1', ...POLARITY_TEAM_STYLE },
  { id: 'polarity-2', category: 'polarity', label: 'Polarity Team 2', ...POLARITY_TEAM_STYLE },
  { id: 'polarity-3', category: 'polarity', label: 'Polarity Team 3', ...POLARITY_TEAM_STYLE },
  { id: 'polarity-4', category: 'polarity', label: 'Polarity Team 4', ...POLARITY_TEAM_STYLE },
];

export function getDivisionsByCategory(category: LineupCategoryId): DivisionConfig[] {
  return DIVISIONS.filter((d) => d.category === category);
}

export function getCategoryLabel(category: LineupCategoryId): string {
  return LINEUP_CATEGORIES.find((c) => c.id === category)?.label ?? category;
}

export function makeSlotKey(division: DivisionId, teamNumber: number, slotNumber: number): string {
  return `${division}:${teamNumber}:${slotNumber}`;
}

export function makeDivisionTitleKey(division: DivisionId): string {
  return `division:${division}`;
}

export function makeTeamTitleKey(division: DivisionId, teamNumber: number): string {
  return `team:${division}:${teamNumber}`;
}
