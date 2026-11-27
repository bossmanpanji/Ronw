import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { makeSlotKey, type DivisionId } from '../constants/teams';
import type {
  GuildLeagueFixedParty,
  GuildLeagueFixedPartySlot,
  GuildLeagueRosterTitle,
  GuildLeagueSignup,
  GuildLeagueTeamSlot,
} from '../types/signup';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';

const TABLE_NAME = 'guild_league_signups';
const TEAM_SLOTS_TABLE = 'guild_league_team_slots';
const FIXED_PARTIES_TABLE = 'guild_league_fixed_parties';
const FIXED_PARTY_SLOTS_TABLE = 'guild_league_fixed_party_slots';
const ROSTER_TITLES_TABLE = 'guild_league_roster_titles';
const SETTINGS_TABLE = 'guild_league_settings';
const GUILD_LOGO_SETTING_KEY = 'guild_logo';

let clientInstance: SupabaseClient | null = null;

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey || !isValidHttpUrl(supabaseUrl)) {
    return null;
  }
  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return clientInstance;
}

export function getMissingConfigMessage(): string | null {
  if (!supabaseUrl || !supabaseAnonKey || !isValidHttpUrl(supabaseUrl)) {
    return 'Koneksi database belum diatur. Pastikan environment variable VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY sudah diisi dengan benar.';
  }
  return null;
}

function toFriendlyErrorMessage(error: unknown, fallback: string): string {
  const missingMsg = getMissingConfigMessage();
  if (missingMsg) {
    return missingMsg;
  }

  if (error && typeof error === 'object') {
    const code = 'code' in error ? String((error as { code: unknown }).code) : '';
    const raw =
      'message' in error ? String((error as { message: unknown }).message).toLowerCase() : '';

    if (code === '23505' || raw.includes('duplicate key') || raw.includes('unique constraint')) {
      return 'Nick tersebut sudah dipakai anggota lain. Gunakan nick yang berbeda.';
    }
    if (code === '23514' || raw.includes('check constraint')) {
      return 'Constraint divisi di database belum mendukung divisi Siege (siege-1 s/d siege-4). Perbarui check constraint kolom division pada tabel guild_league_team_slots di Supabase.';
    }
    if (raw.includes('failed to fetch') || raw.includes('network') || raw.includes('fetch')) {
      return 'Tidak dapat terhubung ke server. Periksa koneksi internet kamu lalu coba lagi.';
    }
    if (
      code === '42501' ||
      raw.includes('permission') ||
      raw.includes('rls') ||
      raw.includes('row-level security')
    ) {
      return 'Akses database ditolak. Pastikan policy RLS untuk role anon sudah aktif di Supabase.';
    }
    if (
      code === '42P01' ||
      code === 'PGRST205' ||
      raw.includes('schema cache') ||
      (raw.includes('relation') && raw.includes('does not exist'))
    ) {
      if (raw.includes(TEAM_SLOTS_TABLE)) {
        return 'Tabel guild_league_team_slots belum dibuat. Jalankan skrip SQL tabel team di Supabase SQL Editor terlebih dahulu.';
      }
      if (raw.includes(FIXED_PARTIES_TABLE) || raw.includes(FIXED_PARTY_SLOTS_TABLE)) {
        return 'Tabel Party Tetap belum dibuat di Supabase. Jalankan skrip SQL Party Tetap di Supabase SQL Editor terlebih dahulu.';
      }
      if (raw.includes(ROSTER_TITLES_TABLE)) {
        return 'Tabel judul team belum dibuat di Supabase. Jalankan skrip SQL judul team di Supabase SQL Editor terlebih dahulu.';
      }
      if (raw.includes(SETTINGS_TABLE)) {
        return 'Tabel logo guild belum dibuat di Supabase. Jalankan skrip SQL logo guild di Supabase SQL Editor terlebih dahulu.';
      }
      return 'Tabel guild_league_signups belum ditemukan. Jalankan skrip SQL di Supabase SQL Editor terlebih dahulu.';
    }
  }

  return fallback;
}

export async function fetchGuildLeagueSignups(): Promise<GuildLeagueSignup[]> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(getMissingConfigMessage() ?? 'Konfigurasi Supabase belum lengkap.');
  }

  const { data, error } = await client
    .from(TABLE_NAME)
    .select('id, nickname, nickname_key, job, field, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(
      toFriendlyErrorMessage(error, 'Gagal memuat daftar anggota. Silakan coba muat ulang.'),
    );
  }

  return (data ?? []) as GuildLeagueSignup[];
}

export interface UpsertSignupResult {
  action: 'created' | 'updated';
}

export async function upsertGuildLeagueSignup(params: {
  nickname: string;
  job: string;
}): Promise<UpsertSignupResult> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(getMissingConfigMessage() ?? 'Konfigurasi Supabase belum lengkap.');
  }

  const cleanNickname = params.nickname.trim();
  const nicknameKey = cleanNickname.toLowerCase();

  const { data: existing, error: lookupError } = await client
    .from(TABLE_NAME)
    .select('id')
    .eq('nickname_key', nicknameKey)
    .maybeSingle();

  if (lookupError) {
    throw new Error(
      toFriendlyErrorMessage(lookupError, 'Gagal memeriksa data anggota. Silakan coba lagi.'),
    );
  }

  const { error: upsertError } = await client.from(TABLE_NAME).upsert(
    {
      nickname: cleanNickname,
      nickname_key: nicknameKey,
      job: params.job,
      field: 'main',
    },
    { onConflict: 'nickname_key' },
  );

  if (upsertError) {
    throw new Error(
      toFriendlyErrorMessage(upsertError, 'Gagal menyimpan pendaftaran. Silakan coba lagi.'),
    );
  }

  return {
    action: existing ? 'updated' : 'created',
  };
}

export async function updateGuildLeagueSignup(params: {
  id: string;
  nickname: string;
  job: string;
}): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(getMissingConfigMessage() ?? 'Konfigurasi Supabase belum lengkap.');
  }

  const cleanNickname = params.nickname.trim();
  const nicknameKey = cleanNickname.toLowerCase();

  const { data, error } = await client
    .from(TABLE_NAME)
    .update({
      nickname: cleanNickname,
      nickname_key: nicknameKey,
      job: params.job,
    })
    .eq('id', params.id)
    .select('id');

  if (error) {
    throw new Error(
      toFriendlyErrorMessage(error, 'Gagal memperbarui data anggota. Silakan coba lagi.'),
    );
  }

  if (!data || data.length === 0) {
    throw new Error(
      'Data tidak ditemukan atau izin ubah (UPDATE) ditolak. Silakan muat ulang daftar.',
    );
  }
}

export async function deleteGuildLeagueSignup(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(getMissingConfigMessage() ?? 'Konfigurasi Supabase belum lengkap.');
  }

  const { data, error } = await client.from(TABLE_NAME).delete().eq('id', id).select('id');

  if (error) {
    throw new Error(
      toFriendlyErrorMessage(error, 'Gagal menghapus data anggota. Silakan coba lagi.'),
    );
  }

  if (!data || data.length === 0) {
    throw new Error(
      'Gagal menghapus data. Pastikan policy DELETE untuk role anon sudah aktif di Supabase atau muat ulang daftar.',
    );
  }
}

export async function fetchGuildLeagueTeamSlots(): Promise<GuildLeagueTeamSlot[]> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(getMissingConfigMessage() ?? 'Konfigurasi Supabase belum lengkap.');
  }

  const { data, error } = await client
    .from(TEAM_SLOTS_TABLE)
    .select('slot_key, division, team_number, slot_number, signup_id, updated_at')
    .order('team_number', { ascending: true })
    .order('slot_number', { ascending: true });

  if (error) {
    throw new Error(
      toFriendlyErrorMessage(error, 'Gagal memuat Lineup. Silakan coba muat ulang.'),
    );
  }

  return (data ?? []) as GuildLeagueTeamSlot[];
}

export async function upsertGuildLeagueTeamSlot(params: {
  division: DivisionId;
  teamNumber: number;
  slotNumber: number;
  signupId: string;
}): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(getMissingConfigMessage() ?? 'Konfigurasi Supabase belum lengkap.');
  }

  const slotKey = makeSlotKey(params.division, params.teamNumber, params.slotNumber);

  const { error } = await client.from(TEAM_SLOTS_TABLE).upsert(
    {
      slot_key: slotKey,
      division: params.division,
      team_number: params.teamNumber,
      slot_number: params.slotNumber,
      signup_id: params.signupId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'slot_key' },
  );

  if (error) {
    throw new Error(
      toFriendlyErrorMessage(error, 'Gagal menyimpan anggota ke slot team. Silakan coba lagi.'),
    );
  }
}

export async function clearGuildLeagueTeamSlot(slotKey: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(getMissingConfigMessage() ?? 'Konfigurasi Supabase belum lengkap.');
  }

  const { error } = await client.from(TEAM_SLOTS_TABLE).delete().eq('slot_key', slotKey);

  if (error) {
    throw new Error(
      toFriendlyErrorMessage(error, 'Gagal mengosongkan slot team. Silakan coba lagi.'),
    );
  }
}

export async function fetchGuildLeagueFixedParties(): Promise<GuildLeagueFixedParty[]> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(getMissingConfigMessage() ?? 'Konfigurasi Supabase belum lengkap.');
  }

  const { data, error } = await client
    .from(FIXED_PARTIES_TABLE)
    .select('id, name, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(
      toFriendlyErrorMessage(error, 'Gagal memuat daftar party tetap. Silakan coba muat ulang.'),
    );
  }

  return (data ?? []) as GuildLeagueFixedParty[];
}

export async function createGuildLeagueFixedParty(name: string): Promise<GuildLeagueFixedParty> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(getMissingConfigMessage() ?? 'Konfigurasi Supabase belum lengkap.');
  }

  const cleanName = name.trim();
  const { data, error } = await client
    .from(FIXED_PARTIES_TABLE)
    .insert({ name: cleanName })
    .select('id, name, created_at')
    .single();

  if (error) {
    throw new Error(
      toFriendlyErrorMessage(error, 'Gagal menambahkan team baru. Silakan coba lagi.'),
    );
  }

  return data as GuildLeagueFixedParty;
}

export async function renameGuildLeagueFixedParty(id: string, name: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(getMissingConfigMessage() ?? 'Konfigurasi Supabase belum lengkap.');
  }

  const cleanName = name.trim();
  const { data, error } = await client
    .from(FIXED_PARTIES_TABLE)
    .update({ name: cleanName })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(
      toFriendlyErrorMessage(error, 'Gagal mengubah nama team. Silakan coba lagi.'),
    );
  }

  if (!data || data.length === 0) {
    throw new Error('Team tidak ditemukan atau izin ubah ditolak. Silakan muat ulang.');
  }
}

export async function deleteGuildLeagueFixedParty(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(getMissingConfigMessage() ?? 'Konfigurasi Supabase belum lengkap.');
  }

  const { data, error } = await client
    .from(FIXED_PARTIES_TABLE)
    .delete()
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(
      toFriendlyErrorMessage(error, 'Gagal menghapus team. Silakan coba lagi.'),
    );
  }

  if (!data || data.length === 0) {
    throw new Error('Team tidak ditemukan atau izin hapus ditolak. Silakan muat ulang.');
  }
}

export async function fetchGuildLeagueFixedPartySlots(): Promise<GuildLeagueFixedPartySlot[]> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(getMissingConfigMessage() ?? 'Konfigurasi Supabase belum lengkap.');
  }

  const { data, error } = await client
    .from(FIXED_PARTY_SLOTS_TABLE)
    .select('slot_key, party_id, slot_number, signup_id, updated_at')
    .order('slot_number', { ascending: true });

  if (error) {
    throw new Error(
      toFriendlyErrorMessage(
        error,
        'Gagal memuat susunan anggota party tetap. Silakan coba muat ulang.',
      ),
    );
  }

  return (data ?? []) as GuildLeagueFixedPartySlot[];
}

export async function upsertGuildLeagueFixedPartySlot(params: {
  partyId: string;
  slotNumber: number;
  signupId: string;
}): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(getMissingConfigMessage() ?? 'Konfigurasi Supabase belum lengkap.');
  }

  const slotKey = `${params.partyId}:${params.slotNumber}`;

  const { error } = await client.from(FIXED_PARTY_SLOTS_TABLE).upsert(
    {
      slot_key: slotKey,
      party_id: params.partyId,
      slot_number: params.slotNumber,
      signup_id: params.signupId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'slot_key' },
  );

  if (error) {
    throw new Error(
      toFriendlyErrorMessage(error, 'Gagal menyimpan anggota ke party tetap. Silakan coba lagi.'),
    );
  }
}

export async function clearGuildLeagueFixedPartySlot(slotKey: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(getMissingConfigMessage() ?? 'Konfigurasi Supabase belum lengkap.');
  }

  const { error } = await client.from(FIXED_PARTY_SLOTS_TABLE).delete().eq('slot_key', slotKey);

  if (error) {
    throw new Error(
      toFriendlyErrorMessage(error, 'Gagal mengosongkan slot party tetap. Silakan coba lagi.'),
    );
  }
}

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code: unknown }).code) : '';
  const raw =
    'message' in error ? String((error as { message: unknown }).message).toLowerCase() : '';
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    raw.includes('schema cache') ||
    (raw.includes('relation') && raw.includes('does not exist'))
  );
}

export async function fetchGuildLeagueRosterTitles(): Promise<GuildLeagueRosterTitle[]> {
  const client = getSupabaseClient();
  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from(ROSTER_TITLES_TABLE)
    .select('title_key, title, updated_at');

  if (error) {
    if (isMissingTableError(error)) {
      return [];
    }
    throw new Error(
      toFriendlyErrorMessage(error, 'Gagal memuat judul team. Silakan coba muat ulang.'),
    );
  }

  return (data ?? []) as GuildLeagueRosterTitle[];
}

export async function upsertGuildLeagueRosterTitle(
  titleKey: string,
  title: string,
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(getMissingConfigMessage() ?? 'Konfigurasi Supabase belum lengkap.');
  }

  const cleanTitle = title.trim();
  const { error } = await client.from(ROSTER_TITLES_TABLE).upsert(
    {
      title_key: titleKey,
      title: cleanTitle,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'title_key' },
  );

  if (error) {
    throw new Error(
      toFriendlyErrorMessage(error, 'Gagal menyimpan judul team. Silakan coba lagi.'),
    );
  }
}

export async function deleteGuildLeagueRosterTitle(titleKey: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(getMissingConfigMessage() ?? 'Konfigurasi Supabase belum lengkap.');
  }

  const { error } = await client
    .from(ROSTER_TITLES_TABLE)
    .delete()
    .eq('title_key', titleKey);

  if (error) {
    throw new Error(
      toFriendlyErrorMessage(error, 'Gagal mereset judul team. Silakan coba lagi.'),
    );
  }
}

export async function fetchGuildLogo(): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from(SETTINGS_TABLE)
    .select('setting_value')
    .eq('setting_key', GUILD_LOGO_SETTING_KEY)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      return null;
    }
    throw new Error(
      toFriendlyErrorMessage(error, 'Gagal memuat logo guild. Silakan coba muat ulang.'),
    );
  }

  const value = (data as { setting_value?: unknown } | null)?.setting_value;
  if (typeof value === 'string' && value.startsWith('data:image/')) {
    return value;
  }
  return null;
}

export async function saveGuildLogo(dataUrl: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(getMissingConfigMessage() ?? 'Konfigurasi Supabase belum lengkap.');
  }

  const { error } = await client.from(SETTINGS_TABLE).upsert(
    {
      setting_key: GUILD_LOGO_SETTING_KEY,
      setting_value: dataUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'setting_key' },
  );

  if (error) {
    throw new Error(
      toFriendlyErrorMessage(error, 'Gagal menyimpan logo guild ke database. Silakan coba lagi.'),
    );
  }
}
