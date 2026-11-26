import { useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Download,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { getJobByName } from '../constants/jobs';
import { SLOTS_PER_TEAM } from '../constants/teams';
import {
  clearGuildLeagueFixedPartySlot,
  createGuildLeagueFixedParty,
  deleteGuildLeagueFixedParty,
  renameGuildLeagueFixedParty,
} from '../lib/supabase';
import type {
  GuildLeagueFixedParty,
  GuildLeagueFixedPartySlot,
  GuildLeagueSignup,
} from '../types/signup';
import { downloadFixedPartiesCsv } from '../utils/csv';
import { FixedPartyMemberPickerModal } from './FixedPartyMemberPickerModal';
import type { ToastData } from './Toast';

interface PartyTetapTabProps {
  signups: GuildLeagueSignup[];
  parties: GuildLeagueFixedParty[];
  partySlots: GuildLeagueFixedPartySlot[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void> | void;
  onNotify: (toast: Omit<ToastData, 'id'>) => void;
}

function validatePartyName(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return 'Nama team wajib diisi.';
  }
  if (trimmed.length < 2) {
    return 'Nama team minimal 2 karakter.';
  }
  if (trimmed.length > 32) {
    return 'Nama team maksimal 32 karakter.';
  }
  return null;
}

export function PartyTetapTab({
  signups,
  parties,
  partySlots,
  isLoading,
  error,
  onRefresh,
  onNotify,
}: PartyTetapTabProps) {
  const [newPartyName, setNewPartyName] = useState('');
  const [newNameTouched, setNewNameTouched] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [pickerTarget, setPickerTarget] = useState<{
    party: GuildLeagueFixedParty;
    slotNumber: number;
  } | null>(null);

  const [renamingParty, setRenamingParty] = useState<GuildLeagueFixedParty | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameTouched, setRenameTouched] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const [deletingParty, setDeletingParty] = useState<GuildLeagueFixedParty | null>(null);
  const [isDeletingParty, setIsDeletingParty] = useState(false);
  const [deletePartyError, setDeletePartyError] = useState<string | null>(null);

  const [clearingSlotKey, setClearingSlotKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const signupMap = useMemo(() => {
    const map = new Map<string, GuildLeagueSignup>();
    for (const s of signups) {
      map.set(s.id, s);
    }
    return map;
  }, [signups]);

  const slotMap = useMemo(() => {
    const map = new Map<string, GuildLeagueFixedPartySlot>();
    for (const slot of partySlots) {
      map.set(slot.slot_key, slot);
    }
    return map;
  }, [partySlots]);

  const slotNumbers = useMemo(
    () => Array.from({ length: SLOTS_PER_TEAM }, (_, idx) => idx + 1),
    [],
  );

  const totalAssignedCount = useMemo(() => {
    let count = 0;
    for (const slot of partySlots) {
      if (signupMap.has(slot.signup_id)) {
        count += 1;
      }
    }
    return count;
  }, [partySlots, signupMap]);

  const newNameError = validatePartyName(newPartyName);
  const renameValidationError = validatePartyName(renameValue);

  async function handleCreateParty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNewNameTouched(true);

    if (newNameError || isCreating) {
      return;
    }

    setIsCreating(true);
    setActionError(null);
    const cleanName = newPartyName.trim();

    try {
      await createGuildLeagueFixedParty(cleanName);
      setNewPartyName('');
      setNewNameTouched(false);
      onNotify({
        type: 'success',
        title: 'Team berhasil ditambahkan',
        message: cleanName,
      });
      await onRefresh();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Gagal menambahkan team baru. Silakan coba lagi.';
      setActionError(msg);
      onNotify({
        type: 'error',
        title: 'Gagal menambah team',
        message: msg,
      });
    } finally {
      setIsCreating(false);
    }
  }

  async function handleConfirmRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRenameTouched(true);
    if (!renamingParty || renameValidationError || isRenaming) return;

    setIsRenaming(true);
    setRenameError(null);
    const cleanName = renameValue.trim();

    try {
      await renameGuildLeagueFixedParty(renamingParty.id, cleanName);
      setRenamingParty(null);
      onNotify({
        type: 'success',
        title: 'Nama team diperbarui',
        message: cleanName,
      });
      await onRefresh();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Gagal mengubah nama team. Silakan coba lagi.';
      setRenameError(msg);
    } finally {
      setIsRenaming(false);
    }
  }

  async function handleConfirmDeleteParty() {
    if (!deletingParty || isDeletingParty) return;
    setIsDeletingParty(true);
    setDeletePartyError(null);
    const deletedName = deletingParty.name;

    try {
      await deleteGuildLeagueFixedParty(deletingParty.id);
      setDeletingParty(null);
      onNotify({
        type: 'success',
        title: 'Team dihapus',
        message: deletedName,
      });
      await onRefresh();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Gagal menghapus team. Silakan coba lagi.';
      setDeletePartyError(msg);
    } finally {
      setIsDeletingParty(false);
    }
  }

  async function handleClearSlot(slotKey: string) {
    if (clearingSlotKey) return;
    setClearingSlotKey(slotKey);
    setActionError(null);
    try {
      await clearGuildLeagueFixedPartySlot(slotKey);
      await onRefresh();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Gagal mengosongkan slot. Silakan coba lagi.';
      setActionError(msg);
    } finally {
      setClearingSlotKey(null);
    }
  }

  return (
    <section aria-labelledby="party-tetap-heading" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="party-tetap-heading" className="text-lg sm:text-xl font-bold text-slate-900 tabular-nums">
            Party Tetap ({parties.length})
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Tambahkan team beserta namanya sendiri, masing-masing 5 anggota dari Daftar Anggota.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => downloadFixedPartiesCsv(parties, partySlots, signups)}
            disabled={isLoading || totalAssignedCount === 0}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] transition-all duration-150 inline-flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download aria-hidden="true" className="w-4 h-4" />
            <span>Unduh CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActionError(null);
              void onRefresh();
            }}
            disabled={isLoading}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] transition-all duration-150 inline-flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw
              aria-hidden="true"
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            <span>Muat ulang</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5">
        <form onSubmit={handleCreateParty} noValidate className="space-y-2">
          <label
            htmlFor="new-party-name-input"
            className="block text-sm font-semibold text-slate-800"
          >
            Tambah Team Baru
          </label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              id="new-party-name-input"
              type="text"
              maxLength={40}
              value={newPartyName}
              disabled={isCreating}
              placeholder="Contoh: Party MVP A / Squad Inti"
              aria-invalid={Boolean(newNameTouched && newNameError)}
              onChange={(e) => {
                setNewPartyName(e.target.value);
                if (actionError) setActionError(null);
              }}
              onBlur={() => setNewNameTouched(true)}
              className={`flex-1 min-h-[44px] px-3.5 py-2.5 rounded-xl border bg-white text-base text-slate-900 placeholder:text-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] focus-visible:ring-offset-2 disabled:opacity-60 ${
                newNameTouched && newNameError
                  ? 'border-red-400 focus-visible:border-red-500'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            />
            <button
              type="submit"
              disabled={Boolean(newNameError) || isCreating}
              className="min-h-[44px] px-5 py-2.5 rounded-xl text-sm sm:text-base font-semibold text-white bg-[#3730A3] hover:bg-[#312E81] active:scale-[0.98] transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] focus-visible:ring-offset-2 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <>
                  <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />
                  <span>Menambahkan...</span>
                </>
              ) : (
                <>
                  <Plus aria-hidden="true" className="w-4 h-4" />
                  <span>Tambah Team</span>
                </>
              )}
            </button>
          </div>
          {newNameTouched && newNameError && (
            <p className="text-xs font-medium text-red-600" role="alert">
              {newNameError}
            </p>
          )}
        </form>
      </div>

      {(error || actionError) && (
        <div
          role="alert"
          className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3.5 text-sm font-medium text-red-900 flex items-start gap-2.5"
        >
          <AlertCircle aria-hidden="true" className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          <span>{actionError ?? error}</span>
        </div>
      )}

      {isLoading && parties.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-12 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
          <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin text-slate-400" />
          <span>Memuat daftar party tetap...</span>
        </div>
      ) : parties.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-12 text-center text-sm text-slate-500">
          Belum ada party tetap. Tambahkan nama team di atas untuk mulai menyusun 5 anggota.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {parties.map((party) => {
            const filledCount = slotNumbers.filter((slotNumber) => {
              const slot = slotMap.get(`${party.id}:${slotNumber}`);
              return slot && signupMap.has(slot.signup_id);
            }).length;

            return (
              <div
                key={party.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
              >
                <div className="px-4 sm:px-5 py-3 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-slate-900 break-words">
                      {party.name}
                    </h3>
                    <p className="text-xs font-medium text-slate-500 tabular-nums">
                      {filledCount}/{SLOTS_PER_TEAM} orang
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingParty(party);
                        setRenameValue(party.name);
                        setRenameTouched(false);
                        setRenameError(null);
                      }}
                      aria-label={`Ubah nama ${party.name}`}
                      title="Ubah nama team"
                      className="min-h-[44px] min-w-[44px] rounded-xl text-slate-500 hover:text-[#3730A3] hover:bg-slate-100 transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3]"
                    >
                      <Pencil aria-hidden="true" className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeletingParty(party);
                        setDeletePartyError(null);
                      }}
                      aria-label={`Hapus ${party.name}`}
                      title="Hapus team"
                      className="min-h-[44px] min-w-[44px] rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                    >
                      <Trash2 aria-hidden="true" className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <ul className="divide-y divide-slate-100">
                  {slotNumbers.map((slotNumber) => {
                    const slotKey = `${party.id}:${slotNumber}`;
                    const slot = slotMap.get(slotKey);
                    const assignedMember = slot ? signupMap.get(slot.signup_id) : undefined;
                    const isClearing = clearingSlotKey === slotKey;

                    if (!assignedMember) {
                      return (
                        <li key={slotNumber} className="px-3 sm:px-4 py-2">
                          <button
                            type="button"
                            disabled={Boolean(clearingSlotKey)}
                            onClick={() => {
                              setActionError(null);
                              setPickerTarget({ party, slotNumber });
                            }}
                            className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 hover:text-[#3730A3] hover:border-[#3730A3]/50 hover:bg-indigo-50/40 transition-colors flex items-center justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] disabled:opacity-50"
                          >
                            <span className="flex items-center gap-2.5 min-w-0">
                              <span className="text-xs font-medium text-slate-400 tabular-nums w-4 shrink-0">
                                {slotNumber}.
                              </span>
                              <span className="truncate">Pilih anggota dari daftar</span>
                            </span>
                            <Plus aria-hidden="true" className="w-4 h-4 shrink-0" />
                          </button>
                        </li>
                      );
                    }

                    const jobMeta = getJobByName(assignedMember.job);

                    return (
                      <li
                        key={slotNumber}
                        className="px-3 sm:px-4 py-2 min-h-[56px] flex items-center justify-between gap-2"
                      >
                        <button
                          type="button"
                          disabled={isClearing}
                          onClick={() => {
                            setActionError(null);
                            setPickerTarget({ party, slotNumber });
                          }}
                          className="flex-1 min-w-0 min-h-[44px] px-2 py-1.5 rounded-xl hover:bg-slate-50 text-left flex items-start sm:items-center gap-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3]"
                        >
                          <span className="text-xs font-medium text-slate-400 tabular-nums w-4 shrink-0 pt-1 sm:pt-0">
                            {slotNumber}.
                          </span>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0 flex-1">
                            <span className="text-sm sm:text-base font-medium text-slate-900 break-words min-w-0">
                              {assignedMember.nickname}
                            </span>
                            <span
                              style={{
                                backgroundColor: jobMeta.color,
                                color: jobMeta.textColor,
                              }}
                              className="self-start sm:self-auto shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap"
                            >
                              {jobMeta.name}
                            </span>
                          </div>
                        </button>

                        <button
                          type="button"
                          disabled={isClearing}
                          onClick={() => {
                            void handleClearSlot(slotKey);
                          }}
                          aria-label={`Keluarkan ${assignedMember.nickname} dari ${party.name} Slot ${slotNumber}`}
                          title="Keluarkan dari slot"
                          className="min-h-[44px] min-w-[44px] rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:opacity-50"
                        >
                          {isClearing ? (
                            <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />
                          ) : (
                            <X aria-hidden="true" className="w-4 h-4" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {pickerTarget && (
        <FixedPartyMemberPickerModal
          party={pickerTarget.party}
          slotNumber={pickerTarget.slotNumber}
          currentSlot={slotMap.get(`${pickerTarget.party.id}:${pickerTarget.slotNumber}`)}
          signups={signups}
          parties={parties}
          allSlots={partySlots}
          onClose={() => setPickerTarget(null)}
          onSaved={async () => {
            setPickerTarget(null);
            await onRefresh();
          }}
        />
      )}

      {renamingParty && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/45 backdrop-blur-[2px] p-0 sm:p-4"
          onClick={() => {
            if (!isRenaming) setRenamingParty(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rename-party-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-xl p-5 sm:p-6"
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 id="rename-party-title" className="text-lg font-bold text-slate-900">
                Ubah Nama Team
              </h3>
              <button
                type="button"
                onClick={() => setRenamingParty(null)}
                disabled={isRenaming}
                aria-label="Tutup"
                className="min-h-[44px] min-w-[44px] -mr-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] disabled:opacity-50"
              >
                <X aria-hidden="true" className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRename} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="rename-party-input"
                  className="block text-sm font-semibold text-slate-800 mb-1.5"
                >
                  Nama Team
                </label>
                <input
                  id="rename-party-input"
                  type="text"
                  maxLength={40}
                  value={renameValue}
                  disabled={isRenaming}
                  onChange={(e) => {
                    setRenameValue(e.target.value);
                    if (renameError) setRenameError(null);
                  }}
                  onBlur={() => setRenameTouched(true)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-base text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3]"
                />
                {renameTouched && renameValidationError && (
                  <p className="mt-1.5 text-xs font-medium text-red-600" role="alert">
                    {renameValidationError}
                  </p>
                )}
              </div>

              {renameError && (
                <div
                  role="alert"
                  className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-900 flex items-start gap-2.5"
                >
                  <AlertCircle aria-hidden="true" className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
                  <span>{renameError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setRenamingParty(null)}
                  disabled={isRenaming}
                  className="min-h-[48px] px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] disabled:opacity-60"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={Boolean(renameValidationError) || isRenaming}
                  className="min-h-[48px] px-4 py-3 rounded-xl text-sm font-semibold text-white bg-[#3730A3] hover:bg-[#312E81] flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] disabled:bg-slate-200 disabled:text-slate-500"
                >
                  {isRenaming ? (
                    <>
                      <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingParty && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/45 backdrop-blur-[2px] p-0 sm:p-4"
          onClick={() => {
            if (!isDeletingParty) setDeletingParty(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-party-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-xl p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 id="delete-party-title" className="text-lg font-bold text-slate-900">
                Hapus Team?
              </h3>
              <button
                type="button"
                onClick={() => setDeletingParty(null)}
                disabled={isDeletingParty}
                aria-label="Tutup"
                className="min-h-[44px] min-w-[44px] -mr-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] disabled:opacity-50"
              >
                <X aria-hidden="true" className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm sm:text-base text-slate-600">
              Team <span className="font-semibold text-slate-900 break-words">{deletingParty.name}</span>{' '}
              beserta susunan 5 slot anggotanya akan dihapus dari Party Tetap.
            </p>

            {deletePartyError && (
              <div
                role="alert"
                className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-900 flex items-start gap-2.5"
              >
                <AlertCircle aria-hidden="true" className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
                <span>{deletePartyError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setDeletingParty(null)}
                disabled={isDeletingParty}
                className="min-h-[48px] px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteParty}
                disabled={isDeletingParty}
                className="min-h-[48px] px-4 py-3 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:opacity-60"
              >
                {isDeletingParty ? (
                  <>
                    <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <span>Ya, Hapus</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
