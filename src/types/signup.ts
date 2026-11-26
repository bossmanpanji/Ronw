import type { DivisionId } from '../constants/teams';

export type FieldType = 'main' | 'sub';

export interface GuildLeagueSignup {
  id: string;
  nickname: string;
  nickname_key: string;
  job: string;
  field: FieldType;
  created_at: string;
}

export interface GuildLeagueTeamSlot {
  slot_key: string;
  division: DivisionId;
  team_number: number;
  slot_number: number;
  signup_id: string;
  updated_at: string;
}
