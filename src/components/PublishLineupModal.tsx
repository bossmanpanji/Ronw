import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  Eye,
  Link2,
  Loader2,
  MessageCircle,
  RotateCcw,
  Save,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { fetchPublishLineupMessages, savePublishLineupMessages } from '../lib/supabase';
import type { ToastData } from './Toast';

const MEMBER_PAGE_DISPLAY_URL = 'javaglitch.vercel.app';
const MEMBER_PAGE_FULL_URL = 'https://javaglitch.vercel.app';
const PUBLISH_MESSAGES_CACHE_KEY = 'javaglitch-publish-messages-v1';

const DEFAULT_MESSAGE_ID =
  `📢 Lineup sudah keluar! Cek posisi kamu di ${MEMBER_PAGE_DISPLAY_URL} — berhalangan hadir? Segera konfirmasi di halaman yang sama`;

const DEFAULT_MESSAGE_EN =
  `📢 The lineup is out! Check your spot at ${MEMBER_PAGE_DISPLAY_URL} — can't make it? Report leave on the same page`;

type CopiedTarget = 'id' | 'en' | 'link' | null;

interface PublishLineupModalProps {
  onClose: () => void;
  onNotify: (toast: Omit<ToastData, 'id'>) => void;
}

interface CachedPublishMessages {
  idMessage: string;
  enMessage: string;
}

function readCachedMessages(): CachedPublishMessages {
  try {
    const raw = window.localStorage.getItem(PUBLISH_MESSAGES_CACHE_KEY);
    if (!raw) {
      return { idMessage: DEFAULT_MESSAGE_ID, enMessage: DEFAULT_MESSAGE_EN };
    }
    const parsed = JSON.parse(raw) as Partial<CachedPublishMessages>;
    return {
      idMessage:
        typeof parsed.idMessage === 'string' && parsed.idMessage.trim().length > 0
          ? parsed.idMessage
          : DEFAULT_MESSAGE_ID,
      enMessage:
        typeof parsed.enMessage === 'string' && parsed.enMessage.trim().length > 0
          ? parsed.enMessage
          : DEFAULT_MESSAGE_EN,
    };
  } catch {
    return { idMessage: DEFAULT_MESSAGE_ID, enMessage: DEFAULT_MESSAGE_EN };
  }
}

function writeCachedMessages(messages: CachedPublishMessages): void {
  try {
    window.localStorage.setItem(PUBLISH_MESSAGES_CACHE_KEY, JSON.stringify(messages));
  } catch {
    // Ignore local storage quota errors
  }
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below for restricted iframe contexts
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function PublishLineupModal({ onClose, onNotify }: PublishLineupModalProps) {
  const initialCached = readCachedMessages();

  const [messageId, setMessageId] = useState(initialCached.idMessage);
  const [messageEn, setMessageEn] = useState(initialCached.enMessage);
  const [savedIdMessage, setSavedIdMessage] = useState(initialCached.idMessage);
  const [savedEnMessage, setSavedEnMessage] = useState(initialCached.enMessage);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copiedTarget, setCopiedTarget] = useState<CopiedTarget>(null);

  const hasEditedLocallyRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSavedMessages() {
      try {
        const remote = await fetchPublishLineupMessages();
        if (!isMounted) return;

        const nextId =
          remote.idMessage && remote.idMessage.trim().length > 0
            ? remote.idMessage
            : DEFAULT_MESSAGE_ID;
        const nextEn =
          remote.enMessage && remote.enMessage.trim().length > 0
            ? remote.enMessage
            : DEFAULT_MESSAGE_EN;

        if (remote.idMessage !== null || remote.enMessage !== null) {
          setSavedIdMessage(nextId);
          setSavedEnMessage(nextEn);
          writeCachedMessages({ idMessage: nextId, enMessage: nextEn });

          if (!hasEditedLocallyRef.current) {
            setMessageId(nextId);
            setMessageEn(nextEn);
          }
        }
      } catch {
        // Keep cached/default messages silently if fetch fails
      } finally {
        if (isMounted) {
          setIsLoadingMessages(false);
        }
      }
    }

    void loadSavedMessages();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape' && !isSaving) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSaving, onClose]);

  useEffect(() => {
    if (!copiedTarget) return;
    const timer = window.setTimeout(() => {
      setCopiedTarget(null);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [copiedTarget]);

  useEffect(() => {
    if (!justSaved) return;
    const timer = window.setTimeout(() => {
      setJustSaved(false);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [justSaved]);

  const hasUnsavedChanges =
    messageId !== savedIdMessage || messageEn !== savedEnMessage;

  const isDifferentFromDefault =
    messageId !== DEFAULT_MESSAGE_ID || messageEn !== DEFAULT_MESSAGE_EN;

  async function handleSaveMessages() {
    if (isSaving) return;

    const cleanId = messageId.trim();
    const cleanEn = messageEn.trim();

    if (!cleanId || !cleanEn) {
      setSaveError('Pesan Indonesia dan English tidak boleh kosong.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await savePublishLineupMessages({
        idMessage: cleanId,
        enMessage: cleanEn,
      });

      setMessageId(cleanId);
      setMessageEn(cleanEn);
      setSavedIdMessage(cleanId);
      setSavedEnMessage(cleanEn);
      hasEditedLocallyRef.current = false;
      writeCachedMessages({ idMessage: cleanId, enMessage: cleanEn });
      setJustSaved(true);

      onNotify({
        type: 'success',
        title: 'Pesan publikasi tersimpan',
        message: 'Perubahan pesan akan tetap tersimpan untuk dibuka kembali nanti.',
      });
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Gagal menyimpan pesan publikasi. Silakan coba lagi.';
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  }

  function handleResetDefault() {
    if (isSaving) return;
    hasEditedLocallyRef.current = true;
    setMessageId(DEFAULT_MESSAGE_ID);
    setMessageEn(DEFAULT_MESSAGE_EN);
    setSaveError(null);
    setJustSaved(false);
  }

  async function handleCopy(target: Exclude<CopiedTarget, null>, text: string, label: string) {
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopiedTarget(target);
      onNotify({
        type: 'success',
        title: `${label} berhasil disalin`,
      });
    } else {
      onNotify({
        type: 'error',
        title: 'Gagal menyalin teks',
        message: 'Silakan salin teks secara manual dari kolom yang tersedia.',
      });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/45 backdrop-blur-[2px] p-0 sm:p-4 overflow-y-auto"
      onClick={() => {
        if (!isSaving) onClose();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-lineup-heading"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-[440px] bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          aria-label="Tutup popup publikasi"
          className="absolute top-3.5 right-3.5 min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] disabled:opacity-50"
        >
          <X aria-hidden="true" className="w-4 h-4" />
        </button>

        <div className="text-center pt-2">
          <div className="mx-auto w-14 h-14 rounded-full border-2 border-emerald-600 bg-emerald-50/50 flex items-center justify-center text-emerald-600">
            <Check aria-hidden="true" className="w-7 h-7 stroke-[2.5]" />
          </div>

          <h3
            id="publish-lineup-heading"
            className="mt-4 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight"
          >
            Dipublikasikan!
          </h3>
          <p className="mt-1.5 text-sm sm:text-base text-slate-500 leading-relaxed max-w-xs mx-auto">
            Anggota bisa melihatnya sekarang di halaman anggota.
          </p>
        </div>

        <div className="mt-5 rounded-2xl bg-[#FFF9EB] border border-amber-200/90 p-4 space-y-3.5">
          <div className="flex items-center justify-between gap-2 text-slate-900">
            <div className="flex items-center gap-2 min-w-0">
              <MessageCircle aria-hidden="true" className="w-4 h-4 text-slate-800 shrink-0" />
              <span className="text-sm font-bold leading-snug">
                Pesan untuk chat guild di game (bisa diubah)
              </span>
            </div>
            {isLoadingMessages && (
              <Loader2
                aria-label="Memuat pesan tersimpan"
                className="w-4 h-4 animate-spin text-amber-700 shrink-0"
              />
            )}
          </div>

          <div>
            <label
              htmlFor="publish-message-id"
              className="block text-sm font-bold text-slate-800 mb-1.5"
            >
              Indonesia
            </label>
            <textarea
              id="publish-message-id"
              rows={3}
              value={messageId}
              disabled={isSaving}
              onChange={(e) => {
                hasEditedLocallyRef.current = true;
                setMessageId(e.target.value);
                if (saveError) setSaveError(null);
                if (justSaved) setJustSaved(false);
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] resize-y disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => void handleCopy('id', messageId, 'Pesan Indonesia')}
              className="w-full min-h-[44px] mt-2 px-4 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] active:scale-[0.99] text-slate-950 font-bold text-sm transition-all inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] focus-visible:ring-offset-1"
            >
              {copiedTarget === 'id' ? (
                <>
                  <Check aria-hidden="true" className="w-4 h-4 stroke-[2.5]" />
                  <span>Tersalin! (Indonesia)</span>
                </>
              ) : (
                <>
                  <Copy aria-hidden="true" className="w-4 h-4" />
                  <span>Copy (Indonesia)</span>
                </>
              )}
            </button>
          </div>

          <div>
            <label
              htmlFor="publish-message-en"
              className="block text-sm font-bold text-slate-800 mb-1.5"
            >
              English
            </label>
            <textarea
              id="publish-message-en"
              rows={3}
              value={messageEn}
              disabled={isSaving}
              onChange={(e) => {
                hasEditedLocallyRef.current = true;
                setMessageEn(e.target.value);
                if (saveError) setSaveError(null);
                if (justSaved) setJustSaved(false);
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] resize-y disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => void handleCopy('en', messageEn, 'English message')}
              className="w-full min-h-[44px] mt-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-900 font-semibold text-sm transition-all inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] focus-visible:ring-offset-1"
            >
              {copiedTarget === 'en' ? (
                <>
                  <Check aria-hidden="true" className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                  <span>Copied! (English)</span>
                </>
              ) : (
                <>
                  <Copy aria-hidden="true" className="w-4 h-4" />
                  <span>Copy (English)</span>
                </>
              )}
            </button>
          </div>

          {saveError && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-red-900 flex items-start gap-2"
            >
              <AlertCircle aria-hidden="true" className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}

          <div className="pt-1 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleSaveMessages()}
              disabled={isSaving || !hasUnsavedChanges}
              className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#3730A3] hover:bg-[#312E81] active:scale-[0.99] text-white font-semibold text-sm transition-all inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] focus-visible:ring-offset-1 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : justSaved && !hasUnsavedChanges ? (
                <>
                  <Check aria-hidden="true" className="w-4 h-4 stroke-[2.5]" />
                  <span>Pesan Tersimpan</span>
                </>
              ) : (
                <>
                  <Save aria-hidden="true" className="w-4 h-4" />
                  <span>Simpan Pesan</span>
                </>
              )}
            </button>

            {isDifferentFromDefault && (
              <button
                type="button"
                onClick={handleResetDefault}
                disabled={isSaving}
                title="Kembalikan teks ke template awal"
                className="min-h-[44px] px-3.5 py-2.5 rounded-xl border border-amber-300 bg-white hover:bg-amber-50 text-slate-700 font-semibold text-xs sm:text-sm transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] disabled:opacity-60"
              >
                <RotateCcw aria-hidden="true" className="w-4 h-4" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center gap-2.5">
          <a
            href={MEMBER_PAGE_FULL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-800 text-sm font-semibold transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] focus-visible:ring-offset-2"
          >
            <Eye aria-hidden="true" className="w-4 h-4 text-slate-700" />
            <span>Lihat halaman anggota</span>
            <ExternalLink aria-hidden="true" className="w-4 h-4 text-slate-500" />
          </a>

          <button
            type="button"
            onClick={() => void handleCopy('link', MEMBER_PAGE_FULL_URL, 'Link anggota')}
            className="min-h-[44px] px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-800 text-sm font-semibold transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] focus-visible:ring-offset-2"
          >
            {copiedTarget === 'link' ? (
              <>
                <Check aria-hidden="true" className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                <span>Link tersalin!</span>
              </>
            ) : (
              <>
                <Link2 aria-hidden="true" className="w-4 h-4 text-slate-700" />
                <span>Salin link anggota</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
