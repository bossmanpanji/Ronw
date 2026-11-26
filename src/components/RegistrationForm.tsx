import { useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { upsertGuildLeagueSignup } from '../lib/supabase';
import { JobDropdown } from './JobDropdown';
import type { ToastData } from './Toast';

interface RegistrationFormProps {
  onSuccess: () => Promise<void> | void;
  onNotify: (toast: Omit<ToastData, 'id'>) => void;
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

export function RegistrationForm({ onSuccess, onNotify }: RegistrationFormProps) {
  const [nickname, setNickname] = useState('');
  const [job, setJob] = useState('');

  const [nickTouched, setNickTouched] = useState(false);
  const [jobTouched, setJobTouched] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const nickError = validateNickname(nickname);
  const jobError = job ? null : 'Pilih salah satu job.';

  const isFormValid = !nickError && !jobError;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNickTouched(true);
    setJobTouched(true);

    if (!isFormValid) {
      const errorMsg = nickError ?? jobError ?? 'Lengkapi data pendaftaran terlebih dahulu.';
      setFeedback({ type: 'error', message: errorMsg });
      onNotify({
        type: 'error',
        title: 'Data belum lengkap',
        message: errorMsg,
      });
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const submittedNick = nickname.trim();
    const submittedJob = job;

    try {
      const result = await upsertGuildLeagueSignup({
        nickname: submittedNick,
        job: submittedJob,
      });

      setNickname('');
      setJob('');
      setNickTouched(false);
      setJobTouched(false);

      const successTitle =
        result.action === 'updated' ? 'Data kamu diperbarui' : 'Berhasil terdaftar';

      setFeedback({
        type: 'success',
        message: successTitle,
      });

      onNotify({
        type: 'success',
        title: successTitle,
        message: `${submittedNick} (${submittedJob})`,
      });

      await onSuccess();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat menyimpan data. Silakan coba lagi.';
      setFeedback({
        type: 'error',
        message,
      });
      onNotify({
        type: 'error',
        title: 'Pendaftaran gagal',
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="form-heading">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-7">
        <div className="mb-5">
          <h2 id="form-heading" className="text-lg sm:text-xl font-bold text-slate-900">
            Form Pendaftaran
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Masukkan nick in game, pilih job karakter, lalu tekan Daftar.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <label
              htmlFor="nickname-input"
              className="block text-sm font-semibold text-slate-800 mb-1.5"
            >
              Nick In Game
            </label>
            <input
              id="nickname-input"
              name="nickname"
              type="text"
              autoComplete="off"
              maxLength={32}
              value={nickname}
              disabled={isSubmitting}
              placeholder="Contoh: ValkyrieID"
              aria-invalid={Boolean(nickTouched && nickError)}
              aria-describedby={nickTouched && nickError ? 'nickname-error' : undefined}
              onChange={(e) => {
                setNickname(e.target.value);
                if (feedback) setFeedback(null);
              }}
              onBlur={() => setNickTouched(true)}
              className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border bg-white text-base text-slate-900 placeholder:text-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] focus-visible:ring-offset-2 disabled:opacity-60 disabled:bg-slate-50 ${
                nickTouched && nickError
                  ? 'border-red-400 focus-visible:border-red-500'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            />
            {nickTouched && nickError && (
              <p id="nickname-error" className="mt-1.5 text-xs font-medium text-red-600" role="alert">
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
              if (feedback) setFeedback(null);
            }}
            onBlur={() => setJobTouched(true)}
          />

          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="w-full min-h-[48px] px-5 py-3 rounded-xl text-base font-semibold text-white bg-[#3730A3] hover:bg-[#312E81] active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] focus-visible:ring-offset-2 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {isSubmitting ? (
              <>
                <Loader2 aria-hidden="true" className="w-5 h-5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <span>Daftar</span>
            )}
          </button>

          {feedback && (
            <div
              role={feedback.type === 'error' ? 'alert' : 'status'}
              className={`rounded-xl px-4 py-3 text-sm font-medium flex items-start gap-2.5 border ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 aria-hidden="true" className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle aria-hidden="true" className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
