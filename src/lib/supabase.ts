import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { FieldType, GuildLeagueSignup } from '../types/signup';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';

const TABLE_NAME = 'guild_league_signups';

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
    if (raw.includes('relation') && raw.includes('does not exist')) {
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
      toFriendlyErrorMessage(error, 'Gagal memuat daftar pendaftar. Silakan coba muat ulang.'),
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
  field: FieldType;
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
      toFriendlyErrorMessage(lookupError, 'Gagal memeriksa data pendaftar. Silakan coba lagi.'),
    );
  }

  const { error: upsertError } = await client.from(TABLE_NAME).upsert(
    {
      nickname: cleanNickname,
      nickname_key: nicknameKey,
      job: params.job,
      field: params.field,
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
  field: FieldType;
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
      field: params.field,
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
