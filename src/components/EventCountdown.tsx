import { useEffect, useState, type FormEvent } from 'react';
import { CalendarClock, Check, RotateCcw } from 'lucide-react';

const STORAGE_KEY = 'java_glitch_guild_league_target_at';

function getDefaultNextEventDate(): Date {
  const now = new Date();
  const target = new Date(now);
  // Default lokal: jadwal Guild League berikutnya pada hari Sabtu pukul 20:00 waktu lokal
  const currentDay = now.getDay(); // 0 = Minggu, 6 = Sabtu
  let daysUntilSaturday = (6 - currentDay + 7) % 7;
  target.setHours(20, 0, 0, 0);

  if (daysUntilSaturday === 0 && target.getTime() <= now.getTime()) {
    daysUntilSaturday = 7;
  }

  target.setDate(now.getDate() + daysUntilSaturday);
  return target;
}

function toDatetimeLocalInputValue(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function loadInitialTarget(): { targetMs: number; isCustom: boolean } {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsedMs = Number(saved);
      if (Number.isFinite(parsedMs) && parsedMs > 0) {
        return { targetMs: parsedMs, isCustom: true };
      }
    }
  } catch {
    // Abaikan jika localStorage tidak tersedia
  }
  return { targetMs: getDefaultNextEventDate().getTime(), isCustom: false };
}

function formatEventDateId(timestampMs: number): string {
  const date = new Date(timestampMs);
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function splitRemainingTime(diffMs: number) {
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

export function EventCountdown() {
  const [{ targetMs, isCustom }, setTargetState] = useState(loadInitialTarget);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(() =>
    toDatetimeLocalInputValue(new Date(targetMs)),
  );
  const [inputError, setInputError] = useState<string | null>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const remainingMs = targetMs - nowMs;
  const isEventStarted = remainingMs <= 0;
  const { days, hours, minutes, seconds } = splitRemainingTime(remainingMs);

  function openEditor() {
    setInputValue(toDatetimeLocalInputValue(new Date(targetMs)));
    setInputError(null);
    setIsEditing(true);
  }

  function handleSaveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inputValue) {
      setInputError('Pilih tanggal dan jam event terlebih dahulu.');
      return;
    }

    const parsed = new Date(inputValue);
    if (Number.isNaN(parsed.getTime())) {
      setInputError('Format tanggal atau jam tidak valid.');
      return;
    }

    const nextMs = parsed.getTime();
    try {
      window.localStorage.setItem(STORAGE_KEY, String(nextMs));
    } catch {
      // Abaikan jika localStorage penuh/diblokir
    }

    setTargetState({ targetMs: nextMs, isCustom: true });
    setNowMs(Date.now());
    setInputError(null);
    setIsEditing(false);
  }

  function handleResetDefault() {
    const defaultDate = getDefaultNextEventDate();
    const defaultMs = defaultDate.getTime();
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Abaikan
    }

    setTargetState({ targetMs: defaultMs, isCustom: false });
    setInputValue(toDatetimeLocalInputValue(defaultDate));
    setNowMs(Date.now());
    setInputError(null);
    setIsEditing(false);
  }

  const countdownUnits = [
    { label: 'Hari', value: String(days).padStart(2, '0') },
    { label: 'Jam', value: String(hours).padStart(2, '0') },
    { label: 'Menit', value: String(minutes).padStart(2, '0') },
    { label: 'Detik', value: String(seconds).padStart(2, '0') },
  ];

  return (
    <section aria-labelledby="countdown-heading" className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="min-w-0">
            <h2
              id="countdown-heading"
              className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2"
            >
              <CalendarClock aria-hidden="true" className="w-4 h-4 text-[#3730A3] shrink-0" />
              <span>Hitung Mundur Guild League</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              {formatEventDateId(targetMs)} · {isCustom ? 'Jadwal manual' : 'Jadwal lokal'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (isEditing) {
                setIsEditing(false);
                setInputError(null);
              } else {
                openEditor();
              }
            }}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3]"
          >
            {isEditing ? 'Tutup' : 'Atur Jadwal'}
          </button>
        </div>

        {isEditing && (
          <form
            onSubmit={handleSaveSchedule}
            noValidate
            className="pt-3 border-t border-slate-100 space-y-3"
          >
            <div>
              <label
                htmlFor="event-datetime-input"
                className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5"
              >
                Tanggal &amp; Jam Event Berikutnya
              </label>
              <input
                id="event-datetime-input"
                type="datetime-local"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (inputError) setInputError(null);
                }}
                aria-invalid={Boolean(inputError)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm sm:text-base text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3]"
              />
              {inputError && (
                <p className="mt-1.5 text-xs font-medium text-red-600" role="alert">
                  {inputError}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#3730A3] hover:bg-[#312E81] text-white text-sm font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] focus-visible:ring-offset-1"
              >
                <Check aria-hidden="true" className="w-4 h-4" />
                <span>Simpan Jadwal</span>
              </button>

              {isCustom && (
                <button
                  type="button"
                  onClick={handleResetDefault}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3]"
                >
                  <RotateCcw aria-hidden="true" className="w-4 h-4" />
                  <span>Reset Default</span>
                </button>
              )}
            </div>
          </form>
        )}

        {isEventStarted ? (
          <div className="rounded-xl bg-indigo-50 px-4 py-3.5 text-center space-y-1">
            <p className="text-sm sm:text-base font-bold text-[#3730A3]">
              Event Guild League sudah dimulai!
            </p>
            <p className="text-xs sm:text-sm text-slate-600">
              Klik &ldquo;Atur Jadwal&rdquo; untuk menetapkan jadwal pertandingan berikutnya.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {countdownUnits.map((unit) => (
              <div
                key={unit.label}
                className="rounded-xl bg-slate-50 py-2.5 sm:py-3 px-2 text-center"
              >
                <div className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums leading-tight">
                  {unit.value}
                </div>
                <div className="mt-0.5 text-xs font-medium text-slate-500">{unit.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
