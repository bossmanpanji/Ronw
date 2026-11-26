import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { updateGuildLeagueSignup } from '../lib/supabase';
import type { GuildLeagueSignup } from '../types/signup';
import { JobDropdown } from './JobDropdown';

interface EditMemberModalProps {
  member: GuildLeagueSignup;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

function validateNickname(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return 'Nick in game wajib diisi.';
  }
  if (trimmed.length < 2) {
    return 'Nick minimal 2 karakter.';
  }
  if (trimmed.length > 24) {
    return 'Nick maksimal 24 karakter.';
  }
  return null;
}

export function EditMemberModal({ member, onClose, onSaved }: EditMemberModalProps) {
  const [nickname, setNickname] = useState(member.nickname);
  const [job, setJob] = useState(member.job);

  const [nickTouched, setNickTouched] = useState(false);
  const [jobTouched, setJobTouched] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const nickInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const errorId = useId();

  useEffect(() => {
    nickInputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose]);

  const nickError = validateNickname(nickname);
  const jobError = job ? null : 'Pilih salah satu job.';
  const isFormValid = !nickError && !jobError;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNickTouched(true);
    setJobTouched(true);

    if (!isFormValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await updateGuildLeagueSignup({
        id: member.id,
        nickname,
        job,
      });
      await onSaved();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Gagal memperbarui data anggota. Silakan coba lagi.';
      setErrorMessage(message);
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/45 backdrop-blur-[2px] p-0 sm:p-4"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between gap-3 mb-5">
          <h3 id={titleId} className="text-lg font-bold text-slate-900">
            Edit Data Anggota
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Tutup"
            className="min-h-[44px] min-w-[44px] -mr-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] disabled:opacity-50"
          >
            <X aria-hidden="true" className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <label
              htmlFor="edit-nickname-input"
              className="block text-sm font-semibold text-slate-800 mb-1.5"
            >
              Nick In Game
            </label>
            <input
              ref={nickInputRef}
              id="edit-nickname-input"
              name="nickname"
              type="text"
              autoComplete="off"
              maxLength={32}
              value={nickname}
              disabled={isSubmitting}
              aria-invalid={Boolean(nickTouched && nickError)}
              aria-describedby={nickTouched && nickError ? errorId : undefined}
              onChange={(e) => {
                setNickname(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              onBlur={() => setNickTouched(true)}
              className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border bg-white text-base text-slate-900 placeholder:text-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] focus-visible:ring-offset-2 disabled:opacity-60 disabled:bg-slate-50 ${
                nickTouched && nickError
                  ? 'border-red-400 focus-visible:border-red-500'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            />
            {nickTouched && nickError && (
              <p id={errorId} className="mt-1.5 text-xs font-medium text-red-600" role="alert">
                {nickError}
              </p>
            )}
          </div>

          <JobDropdown
            value={job}
            disabled={isSubmitting}
            error={jobTouched && jobError ? jobError : undefined}
            onChange={(selectedJob) => {
              setJob(selectedJob);
              setJobTouched(true);
              if (errorMessage) setErrorMessage(null);
            }}
            onBlur={() => setJobTouched(true)}
          />

          {errorMessage && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-900 flex items-start gap-2.5"
            >
              <AlertCircle aria-hidden="true" className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[48px] px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm sm:text-base font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] disabled:opacity-60"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="min-h-[48px] px-4 py-3 rounded-xl text-sm sm:text-base font-semibold text-white bg-[#3730A3] hover:bg-[#312E81] active:scale-[0.99] transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] focus-visible:ring-offset-2 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
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
  );
}
