import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export interface ToastData {
  id: number;
  type: 'success' | 'error';
  title: string;
  message?: string;
}

interface ToastProps {
  toast: ToastData | null;
  onDismiss: () => void;
  durationMs?: number;
}

export function Toast({ toast, onDismiss, durationMs = 4500 }: ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      onDismiss();
    }, durationMs);
    return () => window.clearTimeout(timer);
  }, [toast, durationMs, onDismiss]);

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-full sm:max-w-sm z-50 pointer-events-none">
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={`pointer-events-auto rounded-2xl border bg-white p-3.5 sm:p-4 shadow-lg flex items-start gap-3 ${
              toast.type === 'success' ? 'border-emerald-300' : 'border-red-300'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                toast.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 aria-hidden="true" className="w-5 h-5" />
              ) : (
                <AlertCircle aria-hidden="true" className="w-5 h-5" />
              )}
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <p
                className={`text-sm font-bold ${
                  toast.type === 'success' ? 'text-emerald-950' : 'text-red-950'
                }`}
              >
                {toast.title}
              </p>
              {toast.message && (
                <p className="mt-0.5 text-xs sm:text-sm text-slate-600 break-words">
                  {toast.message}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onDismiss}
              aria-label="Tutup notifikasi"
              className="min-h-[44px] min-w-[44px] -mr-2 -mt-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3]"
            >
              <X aria-hidden="true" className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
