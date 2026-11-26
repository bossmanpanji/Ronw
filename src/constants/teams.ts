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

export const DIVISIONS: readonly DivisionConfig[] = [
  {
    id: 'main-1',
    label: 'Main Field 1',
    color: '#DC2626',
    textColor: '#FFFFFF',
    softBg: '#FEF2F2',
    softBorder: '#FECACA',
  },
  {
    id: 'main-2',
    label: 'Main Field 2',
    color: '#EA580C',
    textColor: '#0F172A',
    softBg: '#FFF7ED',
    softBorder: '#FED7AA',
  },
  {
    id: 'main-3',
    label: 'Main Field 3',
    color: '#D97706',
    textColor: '#0F172A',
    softBg: '#FFFBEB',
    softBorder: '#FDE68A',
  },
  {
    id: 'main-4',
    label: 'Main Field 4',
    color: '#65A30D',
    textColor: '#0F172A',
    softBg: '#F7FEE7',
    softBorder: '#D9F99D',
  },
  {
    id: 'sub-1',
    label: 'Sub Field 1',
    color: '#16A34A',
    textColor: '#0F172A',
    softBg: '#F0FDF4',
    softBorder: '#BBF7D0',
  },
  {
    id: 'sub-2',
    label: 'Sub Field 2',
    color: '#0D9488',
    textColor: '#0F172A',
    softBg: '#F0FDFA',
    softBorder: '#99F6E4',
  },
  {
    id: 'polarity-1',
    label: 'Polarity Team 1',
    color: '#0369A1',
    textColor: '#FFFFFF',
    softBg: '#F0F9FF',
    softBorder: '#BAE6FD',
  },
  {
    id: 'polarity-2',
    label: 'Polarity Team 2',
    color: '#2563EB',
    textColor: '#FFFFFF',
    softBg: '#EFF6FF',
    softBorder: '#BFDBFE',
  },
  {
    id: 'polarity-3',
    label: 'Polarity Team 3',
    color: '#7C3AED',
    textColor: '#FFFFFF',
    softBg: '#F5F3FF',
    softBorder: '#DDD6FE',
  },
  {
    id: 'polarity-4',
    label: 'Polarity Team 4',
    color: '#DB2777',
    textColor: '#FFFFFF',
    softBg: '#FDF2F8',
    softBorder: '#FBCFE8',
  },
];

export function makeSlotKey(division: DivisionId, teamNumber: number, slotNumber: number): string {
  return `${division}:${teamNumber}:${slotNumber}`;
}
