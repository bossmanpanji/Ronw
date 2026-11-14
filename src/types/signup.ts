export type FieldType = 'main' | 'sub';

export interface GuildLeagueSignup {
  id: string;
  nickname: string;
  nickname_key: string;
  job: string;
  field: FieldType;
  created_at: string;
}
