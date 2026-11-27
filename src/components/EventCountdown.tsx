import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, ChevronDown, UserCheck } from 'lucide-react';
import type { GuildEventLeave, GuildLeagueSignup } from '../types/signup';
import { getActiveGuildEvent, splitRemainingTime } from '../utils/guildEvents';

interface EventCountdownProps {
  signups: GuildLeagueSignup[];
  leaves: GuildEventLeave[];
  onOpenLeaveModal: () => void;
  onEventKeyChange: (nextEventKey: string) => void;
}

export function EventCountdown({
  signups,
  leaves,
  onOpenLeaveModal,
  onEventKeyChange,
}: EventCountdownProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [showLeavePreview, setShowLeavePreview] = useState(false);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const activeEvent = useMemo(() => getActiveGuildEvent(nowMs), [nowMs]);

  useEffect(() => {
    onEventKeyChange(activeEvent.eventKey);
  }, [activeEvent.eventKey, onEventKeyChange]);

  const remainingMs = activeEvent.countdownTargetMs - nowMs;
  const { days, hours, minutes, seconds } = splitRemainingTime(remainingMs);
  const isLive = activeEvent.status === 'live';

  const signupMap = useMemo(() => {
    const map = new Map<string, GuildLeagueSignup>();
    for (const member of signups) {
      map.set(member.id, member);
    }
    return map;
  }, [signups]);

  const activeLeaveEntries = useMemo(() => {
    return leaves
      .filter((leave) => leave.event_key === activeEvent.eventKey)
      .map((leave) => ({
        leave,
        member: signupMap.get(leave.signup_id),
      }))
      .filter((entry): entry is { leave: GuildEventLeave; member: GuildLeagueSignup } =>
        Boolean(entry.member),
      );
  }, [leaves, activeEvent.eventKey, signupMap]);

  const countdownUnits = [
    { label: 'Hari', value: String(days).padStart(2, '0') },
    { label: 'Jam', value: String(hours).padStart(2, '0') },
    { label: 'Menit', value: String(minutes).padStart(2, '0') },
    { label: 'Detik', value: String(seconds).padStart(2, '0') },
  ];

  return (
    <section aria-labelledby="countdown-heading" className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="countdown-heading"
                className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2"
              >
                <CalendarClock aria-hidden="true" className="w-4 h-4 text-[#3730A3] shrink-0" />
                <span>{activeEvent.event.name}</span>
              </h2>
              {isLive && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-100 border border-emerald-300 text-xs font-bold text-emerald-800">
                  Berlangsung
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-600">{activeEvent.dateLabelWib}</p>
          </div>

          <button
            type="button"
            onClick={onOpenLeaveModal}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-xs sm:text-sm font-bold text-slate-950 shadow-xs transition-all inline-flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] focus-visible:ring-offset-2"
          >
            <UserCheck aria-hidden="true" className="w-4 h-4" />
            <span>Izin Hadir</span>
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500">
            {isLive
              ? 'Event sedang berlangsung · sisa waktu menuju selesai (22:00 UTC+7):'
              : 'Hitung mundur menuju event dimulai:'}
          </p>
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {countdownUnits.map((unit) => (
              <div
                key={unit.label}
                className={`rounded-xl py-2.5 sm:py-3 px-2 text-center ${
                  isLive ? 'bg-emerald-50 border border-emerald-200/80' : 'bg-slate-50'
                }`}
              >
                <div
                  className={`text-xl sm:text-2xl font-bold tabular-nums leading-tight ${
                    isLive ? 'text-emerald-900' : 'text-slate-900'
                  }`}
                >
                  {unit.value}
                </div>
                <div className="mt-0.5 text-xs font-medium text-slate-500">{unit.label}</div>
              </div>
            ))}
          </div>
        </div>

        {activeLeaveEntries.length > 0 && (
          <div className="pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowLeavePreview((prev) => !prev)}
              aria-expanded={showLeavePreview}
              className="w-full min-h-[40px] px-2 py-1.5 rounded-xl hover:bg-slate-50 text-left flex items-center justify-between gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3]"
            >
              <span className="text-xs sm:text-sm font-semibold text-amber-900 tabular-nums">
                {activeLeaveEntries.length} anggota berstatus Izin untuk event ini
              </span>
              <ChevronDown
                aria-hidden="true"
                className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${
                  showLeavePreview ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showLeavePreview && (
              <ul className="mt-2 space-y-1.5 px-2 pb-1">
                {activeLeaveEntries.map(({ leave, member }) => (
                  <li
                    key={leave.signup_id}
                    className="rounded-xl bg-amber-50/75 border border-amber-200/80 px-3 py-2 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2"
                  >
                    <span className="font-bold text-slate-900 shrink-0">{member.nickname}</span>
                    <span className="text-slate-700 break-words">{leave.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
