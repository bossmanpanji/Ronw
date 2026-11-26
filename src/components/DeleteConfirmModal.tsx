import { useEffect, useId, useState } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { deleteGuildLeagueSignup } from '../lib/supabase';
import type { GuildLeagueSignup } from '../types/signup';

interface DeleteConfirmModalProps {
  member: GuildLeagueSignup;
  onClose: () => void;
  onDeleted: () => Promise<void> | void;
}

export function DeleteConfirmModal({ member, onClose, onDeleted }: DeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const titleId = useId();

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape' && !isDeleting) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDeleting, onClose]);

  async function handleConfirmDelete() {
    if (isDeleting) return;
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await deleteGuildLeagueSignup(member.id);
      await onDeleted();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Gagal menghapus data anggota. Silakan coba lagi.';
      setErrorMessage(message);
      setIsDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/45 backdrop-blur-[2px] p-0 sm:p-4"
      onClick={() => {
        if (!isDeleting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-xl p-5 sm:p-6 space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 id={titleId} className="text-lg font-bold text-slate-900">
            Hapus Anggota?
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Tutup"
            className="min-h-[44px] min-w-[44px] -mr-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] disabled:opacity-50"
          >
            <X aria-hidden="true" className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm sm:text-base text-slate-600">
          Data <span className="font-semibold text-slate-900 break-words">{member.nickname}</span>{' '}
          ({member.job}) akan dihapus dari Daftar Anggota.
        </p>

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
            disabled={isDeleting}
            className="min-h-[48px] px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm sm:text-base font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="min-h-[48px] px-4 py-3 rounded-xl text-sm sm:text-base font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
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
  );
}
