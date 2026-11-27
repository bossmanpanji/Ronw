import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  Loader2,
  Search,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { getJobByName } from '../constants/jobs';
import { deleteGuildEventLeave, upsertGuildEventLeave } from '../lib/supabase';
import type { GuildEventLeave, GuildLeagueSignup } from '../types/signup';
import type { ToastData } from './Toast';

const MAX_MESSAGE_LENGTH = 200;

interface LeaveRequestModalProps {
  eventKey: string;
  eventName: string;
  eventDateLabel: string;
  signups: GuildLeagueSignup[];
  leaveBySignupId: Map<string, GuildEventLeave>;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  onNotify: (toast: Omit<ToastData, 'id'>) => void;
}

export function LeaveRequestModal({
  eventKey,
  eventName,
  eventDateLabel,
  signups,
  leaveBySignupId,
  onClose,
  onSaved,
  onNotify,
}: LeaveRequestModalProps) {
  const [selectedSignupId, setSelectedSignupId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [touched, setTouched] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  const sortedSignups = useMemo(
    () =>
      [...signups].sort((a, b) =>
        a.nickname.localeCompare(b.nickname, 'id', { sensitivity: 'base' }),
      ),
    [signups],
  );

  const filteredSignups = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return sortedSignups;
    return sortedSignups.filter(
      (m) => m.nickname.toLowerCase().includes(q) || m.job.toLowerCase().includes(q),
    );
  }, [sortedSignups, memberSearch]);

  const selectedMember = useMemo(
    () => signups.find((m) => m.id === selectedSignupId) ?? null,
    [signups, selectedSignupId],
  );

  const existingLeave = selectedSignupId ? leaveBySignupId.get(selectedSignupId) : undefined;

  const isBusy = isSaving || isDeleting;

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        if (isDropdownOpen) {
          setIsDropdownOpen(false);
          return;
        }
        if (!isBusy) {
          onClose();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDropdownOpen, isBusy, onClose]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.setTimeout(() => searchInputRef.current?.focus(), 0);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  function handleSelectMember(member: GuildLeagueSignup) {
    setSelectedSignupId(member.id);
    const currentLeave = leaveBySignupId.get(member.id);
    setMessage(currentLeave ? currentLeave.message : '');
    setIsDropdownOpen(false);
    setMemberSearch('');
    setErrorMessage(null);
  }

  const nicknameError = !selectedSignupId ? 'Pilih nickname anggota terlebih dahulu.' : null;
  const trimmedMessage = message.trim();
  const messageError =
    trimmedMessage.length === 0
      ? 'Isi pesan alasan izin wajib diisi.'
      : trimmedMessage.length < 3
        ? 'Isi pesan minimal 3 karakter.'
        : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (nicknameError || messageError || isBusy || !selectedMember) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await upsertGuildEventLeave({
        eventKey,
        signupId: selectedMember.id,
        message: trimmedMessage,
      });
      await onSaved();
      onNotify({
        type: 'success',
        title: existingLeave ? 'Status izin diperbarui' : 'Izin hadir berhasil dikirim',
        message: `${selectedMember.nickname}: ${trimmedMessage}`,
      });
      onClose();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Gagal menyimpan status izin. Silakan coba lagi.';
      setErrorMessage(msg);
      setIsSaving(false);
    }
  }

  async function handleCancelLeave() {
    if (!selectedMember || !existingLeave || isBusy) return;
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await deleteGuildEventLeave(eventKey, selectedMember.id);
      await onSaved();
      onNotify({
        type: 'success',
        title: 'Status izin dibatalkan',
        message: `${selectedMember.nickname} kembali berstatus aktif.`,
      });
      onClose();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Gagal membatalkan izin. Silakan coba lagi.';
      setErrorMessage(msg);
      setIsDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/45 backdrop-blur-[2px] p-0 sm:p-4 overflow-y-auto"
      onClick={() => {
        if (!isBusy) onClose();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 id={titleId} className="text-lg font-bold text-slate-900">
              Form Izin Hadir
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              {eventName} · {eventDateLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            aria-label="Tutup"
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-1 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] disabled:opacity-50"
          >
            <X aria-hidden="true" className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div ref={dropdownRef} className="relative">
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
              Nickname
            </label>

            {signups.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs sm:text-sm text-slate-500">
                Belum ada anggota terdaftar di List Anggota. Silakan daftar nick terlebih dahulu.
              </div>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isBusy}
                  aria-haspopup="listbox"
                  aria-expanded={isDropdownOpen}
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  className={`w-full min-h-[44px] px-3.5 py-2 rounded-xl border bg-white text-left flex items-center justify-between gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] disabled:opacity-60 ${
                    touched && nicknameError
                      ? 'border-red-400'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {selectedMember ? (
                    <span className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                        {selectedMember.nickname}
                      </span>
                      <span
                        style={{
                          backgroundColor: getJobByName(selectedMember.job).color,
                          color: getJobByName(selectedMember.job).textColor,
                        }}
                        className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap"
                      >
                        {getJobByName(selectedMember.job).name}
                      </span>
                    </span>
                  ) : (
                    <span className="text-sm sm:text-base text-slate-400">
                      Pilih nickname anggota...
                    </span>
                  )}
                  <ChevronDown
                    aria-hidden="true"
                    className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${
                      isDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1.5 z-20 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-slate-100 bg-slate-50/70">
                      <div className="relative">
                        <Search
                          aria-hidden="true"
                          className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        />
                        <input
                          ref={searchInputRef}
                          type="text"
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          placeholder="Cari nickname..."
                          aria-label="Cari nickname anggota"
                          className="w-full min-h-[40px] pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3]"
                        />
                      </div>
                    </div>

                    <ul role="listbox" className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                      {filteredSignups.length === 0 ? (
                        <li className="px-4 py-6 text-center text-xs sm:text-sm text-slate-500">
                          Nickname tidak ditemukan.
                        </li>
                      ) : (
                        filteredSignups.map((member) => {
                          const jobMeta = getJobByName(member.job);
                          const isSelected = member.id === selectedSignupId;
                          const memberLeave = leaveBySignupId.get(member.id);

                          return (
                            <li key={member.id}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => handleSelectMember(member)}
                                className={`w-full min-h-[44px] px-3.5 py-2.5 text-left flex items-center justify-between gap-2 transition-colors ${
                                  isSelected
                                    ? 'bg-indigo-50 text-[#3730A3]'
                                    : 'hover:bg-slate-50 text-slate-900'
                                }`}
                              >
                                <span className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="text-sm font-medium truncate">
                                    {member.nickname}
                                  </span>
                                  {memberLeave && (
                                    <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-[11px] font-bold text-amber-900">
                                      Izin
                                    </span>
                                  )}
                                </span>
                                <span className="flex items-center gap-2 shrink-0">
                                  <span
                                    style={{
                                      backgroundColor: jobMeta.color,
                                      color: jobMeta.textColor,
                                    }}
                                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap"
                                  >
                                    {jobMeta.name}
                                  </span>
                                  {isSelected && (
                                    <Check
                                      aria-hidden="true"
                                      className="w-4 h-4 text-[#3730A3] shrink-0"
                                    />
                                  )}
                                </span>
                              </button>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </div>
                )}
              </>
            )}

            {touched && nicknameError && signups.length > 0 && (
              <p className="mt-1.5 text-xs font-medium text-red-600" role="alert">
                {nicknameError}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label htmlFor="leave-message-input" className="block text-sm font-semibold text-slate-800">
                Isi Pesan
              </label>
              <span className="text-xs text-slate-400 tabular-nums">
                {message.length}/{MAX_MESSAGE_LENGTH}
              </span>
            </div>
            <textarea
              id="leave-message-input"
              rows={3}
              maxLength={MAX_MESSAGE_LENGTH}
              value={message}
              disabled={isBusy || signups.length === 0}
              placeholder="Contoh: Berhalangan hadir karena lembur / acara keluarga."
              onChange={(e) => {
                setMessage(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              onBlur={() => setTouched(true)}
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] resize-y disabled:opacity-60 ${
                touched && messageError
                  ? 'border-red-400'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            />
            {touched && messageError && (
              <p className="mt-1.5 text-xs font-medium text-red-600" role="alert">
                {messageError}
              </p>
            )}
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-red-900 flex items-start gap-2"
            >
              <AlertCircle aria-hidden="true" className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <p className="text-xs text-slate-500 leading-relaxed">
            Status izin akan tampil pada nickname yang dipilih dan otomatis direset setelah event
            berakhir.
          </p>

          {existingLeave && (
            <button
              type="button"
              onClick={() => void handleCancelLeave()}
              disabled={isBusy}
              className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-red-200 bg-red-50/70 hover:bg-red-50 text-xs sm:text-sm font-semibold text-red-700 inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:opacity-60"
            >
              {isDeleting ? (
                <>
                  <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />
                  <span>Membatalkan izin...</span>
                </>
              ) : (
                <>
                  <Trash2 aria-hidden="true" className="w-4 h-4" />
                  <span>Batalkan Status Izin ({selectedMember?.nickname})</span>
                </>
              )}
            </button>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="min-h-[48px] px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] disabled:opacity-60"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isBusy || signups.length === 0}
              className="min-h-[48px] px-4 py-3 rounded-xl text-sm font-semibold text-white bg-[#3730A3] hover:bg-[#312E81] flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <UserCheck aria-hidden="true" className="w-4 h-4" />
                  <span>{existingLeave ? 'Simpan Izin' : 'Kirim Izin'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
