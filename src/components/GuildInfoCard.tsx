import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ImagePlus } from 'lucide-react';
import type { ToastData } from './Toast';

const LOGO_STORAGE_KEY = 'javaglitch-guild-logo-v1';
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const TARGET_SIZE_PX = 256;

interface GuildInfoCardProps {
  onNotify: (toast: Omit<ToastData, 'id'>) => void;
}

function loadStoredLogo(): string | null {
  try {
    const saved = window.localStorage.getItem(LOGO_STORAGE_KEY);
    if (saved && saved.startsWith('data:image/')) {
      return saved;
    }
  } catch {
    // Ignore storage read errors
  }
  return null;
}

function rasterizeImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const width = img.naturalWidth || TARGET_SIZE_PX;
        const height = img.naturalHeight || TARGET_SIZE_PX;
        const scale = Math.min(1, TARGET_SIZE_PX / Math.max(width, height));
        const targetWidth = Math.max(1, Math.round(width * scale));
        const targetHeight = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Gagal memproses gambar.'));
          return;
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const webpDataUrl = canvas.toDataURL('image/webp', 0.9);
        if (webpDataUrl.startsWith('data:image/webp') && webpDataUrl.length < 180_000) {
          resolve(webpDataUrl);
          return;
        }

        const pngDataUrl = canvas.toDataURL('image/png');
        if (pngDataUrl.length < 220_000) {
          resolve(pngDataUrl);
          return;
        }

        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch {
        reject(new Error('Gagal mengolah file gambar.'));
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('File gambar tidak dapat dibaca atau rusak.'));
    };

    img.src = objectUrl;
  });
}

function YouTubeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="w-5 h-5 shrink-0"
      fill="none"
    >
      <path
        d="M23.5 6.2a3.01 3.01 0 0 0-2.12-2.13C19.5 3.56 12 3.56 12 3.56s-7.5 0-9.38.51A3.01 3.01 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3.01 3.01 0 0 0 2.12 2.13c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.01 3.01 0 0 0 2.12-2.13A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8Z"
        fill="#FF0000"
      />
      <path d="M9.6 15.57V8.43L15.84 12 9.6 15.57Z" fill="#FFFFFF" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="w-5 h-5 shrink-0"
      fill="#5865F2"
    >
      <path d="M20.32 4.37A19.8 19.8 0 0 0 15.43 2.84a.08.08 0 0 0-.08.04c-.21.38-.45.87-.61 1.26a18.27 18.27 0 0 0-5.48 0 12.64 12.64 0 0 0-.62-1.26.08.08 0 0 0-.08-.04A19.74 19.74 0 0 0 3.68 4.37a.07.07 0 0 0-.03.03C.53 9.04-.32 13.58.1 18.06a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.22-2a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.9.08.08 0 0 1-.01-.13c.13-.09.25-.19.37-.29a.08.08 0 0 1 .08-.01c3.93 1.79 8.18 1.79 12.06 0a.08.08 0 0 1 .08.01c.12.1.24.2.37.29a.08.08 0 0 1-.01.13c-.6.35-1.22.65-1.87.9a.08.08 0 0 0-.04.11c.36.7.77 1.37 1.22 2a.08.08 0 0 0 .08.03 19.83 19.83 0 0 0 6-3.03.08.08 0 0 0 .03-.06c.5-5.18-.84-9.68-3.55-13.66a.06.06 0 0 0-.03-.03ZM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.95 2.42-2.16 2.42Z" />
    </svg>
  );
}

export function GuildInfoCard({ onNotify }: GuildInfoCardProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLogoUrl(loadStoredLogo());
  }, []);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onNotify({
        type: 'error',
        title: 'Format file tidak didukung',
        message: 'Pilih file gambar seperti PNG, JPG, atau WebP.',
      });
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      onNotify({
        type: 'error',
        title: 'Ukuran gambar terlalu besar',
        message: 'Ukuran file maksimal 5 MB.',
      });
      return;
    }

    try {
      const processedDataUrl = await rasterizeImageFile(file);
      window.localStorage.setItem(LOGO_STORAGE_KEY, processedDataUrl);
      setLogoUrl(processedDataUrl);
      onNotify({
        type: 'success',
        title: 'Logo guild diperbarui',
        message: 'Logo berhasil disimpan.',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Gagal menyimpan logo guild.';
      onNotify({
        type: 'error',
        title: 'Gagal mengunggah logo',
        message,
      });
    }
  }

  return (
    <section
      aria-label="Informasi Guild JAVAGLITCH"
      className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="sr-only"
        aria-label="Upload logo guild"
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label={logoUrl ? 'Ganti logo guild' : 'Upload logo guild'}
            title={logoUrl ? 'Klik untuk ganti logo' : 'Klik untuk upload logo'}
            className="relative w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-2xl border border-slate-200 bg-slate-50 hover:border-[#3730A3]/60 hover:bg-indigo-50/40 transition-colors overflow-hidden flex items-center justify-center shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] focus-visible:ring-offset-2"
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo Guild JAVAGLITCH"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-1 text-slate-500 group-hover:text-[#3730A3] transition-colors px-1">
                <ImagePlus aria-hidden="true" className="w-5 h-5" />
                <span className="text-[11px] font-semibold leading-tight text-center">
                  Logo
                </span>
              </div>
            )}
          </button>

          <div className="min-w-0 space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate">
              JAVAGLITCH
            </h2>
            <p className="text-sm font-medium text-slate-600">Server Phreeoni</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-col gap-2 shrink-0">
          <a
            href="https://www.youtube.com/@JAVAGLITCHTV"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-700 text-slate-800 text-sm font-semibold transition-colors inline-flex items-center justify-center sm:justify-start gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] focus-visible:ring-offset-2"
          >
            <YouTubeIcon />
            <span>YouTube</span>
          </a>

          <a
            href="https://discord.gg/zCjduGtcz6"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 hover:text-[#3730A3] text-slate-800 text-sm font-semibold transition-colors inline-flex items-center justify-center sm:justify-start gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] focus-visible:ring-offset-2"
          >
            <DiscordIcon />
            <span>Discord</span>
          </a>
        </div>
      </div>
    </section>
  );
}
