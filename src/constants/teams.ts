export type DivisionId =
  | 'main-1'
  | 'main-2'
  | 'main-3'
  | 'main-4'
  | 'sub-1'
  | 'sub-2'
  | 'polarity-1'
  | 'polarity-2'
  | 'polarity-3'
  | 'polarity-4';

export interface DivisionConfig {
  id: DivisionId;
  label: string;
  color: string;
  textColor: string;
  softBg: string;
  softBorder: string;
}

export const TEAMS_PER_DIVISION = 10;
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

const POLARITY_TEAM_STYLE = {
  color: '#2563EB',
  textColor: '#FFFFFF',
  softBg: '#EFF6FF',
  softBorder: '#BFDBFE',
} as const;

export const DIVISIONS: readonly DivisionConfig[] = [
  { id: 'main-1', label: 'Main Field 1', ...MAIN_FIELD_STYLE },
  { id: 'main-2', label: 'Main Field 2', ...MAIN_FIELD_STYLE },
  { id: 'main-3', label: 'Main Field 3', ...MAIN_FIELD_STYLE },
  { id: 'main-4', label: 'Main Field 4', ...MAIN_FIELD_STYLE },
  { id: 'sub-1', label: 'Sub Field 1', ...SUB_FIELD_STYLE },
  { id: 'sub-2', label: 'Sub Field 2', ...SUB_FIELD_STYLE },
  { id: 'polarity-1', label: 'Polarity Team 1', ...POLARITY_TEAM_STYLE },
  { id: 'polarity-2', label: 'Polarity Team 2', ...POLARITY_TEAM_STYLE },
  { id: 'polarity-3', label: 'Polarity Team 3', ...POLARITY_TEAM_STYLE },
  { id: 'polarity-4', label: 'Polarity Team 4', ...POLARITY_TEAM_STYLE },
];

export function makeSlotKey(division: DivisionId, teamNumber: number, slotNumber: number): string {
  return `${division}:${teamNumber}:${slotNumber}`;
}
