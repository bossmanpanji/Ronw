export type DivisionId =
  | 'main-1'
  | 'main-2'
  | 'main-3'
  | 'sub-1'
  | 'sub-2'
  | 'polarity-1'
  | 'polarity-2'
  | 'polarity-3';

export interface DivisionConfig {
  id: DivisionId;
  label: string;
}

export const TEAMS_PER_DIVISION = 10;
export const SLOTS_PER_TEAM = 5;

export const DIVISIONS: readonly DivisionConfig[] = [
  { id: 'main-1', label: 'Main Field 1' },
  { id: 'main-2', label: 'Main Field 2' },
  { id: 'main-3', label: 'Main Field 3' },
  { id: 'sub-1', label: 'Sub Field 1' },
  { id: 'sub-2', label: 'Sub Field 2' },
  { id: 'polarity-1', label: 'Polarity Team 1' },
  { id: 'polarity-2', label: 'Polarity Team 2' },
  { id: 'polarity-3', label: 'Polarity Team 3' },
];

export function makeSlotKey(division: DivisionId, teamNumber: number, slotNumber: number): string {
  return `${division}:${teamNumber}:${slotNumber}`;
}
