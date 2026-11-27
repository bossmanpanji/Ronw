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

export interface GuildLeagueFixedParty {
  id: string;
  name: string;
  created_at: string;
}

export interface GuildLeagueFixedPartySlot {
  slot_key: string;
  party_id: string;
  slot_number: number;
  signup_id: string;
  updated_at: string;
}

export interface GuildLeagueRosterTitle {
  title_key: string;
  title: string;
  updated_at: string;
}

export interface GuildEventLeave {
  event_key: string;
  signup_id: string;
  message: string;
  updated_at: string;
}
