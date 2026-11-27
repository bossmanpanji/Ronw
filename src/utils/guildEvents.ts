const UTC7_OFFSET_MS = 7 * 60 * 60 * 1000;

export interface GuildEventDefinition {
  id: 'guild-siege';
  name: string;
  dayOfWeek: number; // 0 = Minggu ... 6 = Sabtu (UTC+7)
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  scheduleLabel: string;
}

export const GUILD_EVENTS: readonly GuildEventDefinition[] = [
  {
    id: 'guild-siege',
    name: 'Guild Siege',
    dayOfWeek: 0, // Minggu
    startHour: 21,
    startMinute: 0,
    endHour: 22,
    endMinute: 0,
    scheduleLabel: 'Setiap Minggu · 21:00 – 22:00 UTC+7',
  },
];

export interface ActiveGuildEventState {
  event: GuildEventDefinition;
  eventKey: string;
  status: 'upcoming' | 'live';
  startMs: number;
  endMs: number;
  countdownTargetMs: number;
  dateLabelWib: string;
}

const MONTH_SHORT_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
] as const;

const DAY_NAMES_ID = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
] as const;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function makeWibDateSlug(wibYear: number, wibMonthZeroBased: number, wibDate: number): string {
  const normalized = new Date(Date.UTC(wibYear, wibMonthZeroBased, wibDate));
  return `${normalized.getUTCFullYear()}-${pad2(normalized.getUTCMonth() + 1)}-${pad2(
    normalized.getUTCDate(),
  )}`;
}

function formatWibEventLabel(
  wibYear: number,
  wibMonthZeroBased: number,
  wibDate: number,
  event: GuildEventDefinition,
): string {
  const normalized = new Date(Date.UTC(wibYear, wibMonthZeroBased, wibDate));
  const dayName = DAY_NAMES_ID[normalized.getUTCDay()] ?? 'Minggu';
  const monthName = MONTH_SHORT_ID[normalized.getUTCMonth()] ?? '';
  return `${dayName}, ${normalized.getUTCDate()} ${monthName} ${normalized.getUTCFullYear()} · ${pad2(
    event.startHour,
  )}:${pad2(event.startMinute)}–${pad2(event.endHour)}:${pad2(event.endMinute)} UTC+7`;
}

export function getActiveGuildEvent(nowMs: number = Date.now()): ActiveGuildEventState {
  const event = GUILD_EVENTS[0];
  const nowWib = new Date(nowMs + UTC7_OFFSET_MS);

  const wibYear = nowWib.getUTCFullYear();
  const wibMonth = nowWib.getUTCMonth();
  const wibDate = nowWib.getUTCDate();
  const wibDay = nowWib.getUTCDay();

  let daysUntilEvent = (event.dayOfWeek - wibDay + 7) % 7;

  const candidateStartMs =
    Date.UTC(wibYear, wibMonth, wibDate + daysUntilEvent, event.startHour, event.startMinute, 0, 0) -
    UTC7_OFFSET_MS;
  const candidateEndMs =
    Date.UTC(wibYear, wibMonth, wibDate + daysUntilEvent, event.endHour, event.endMinute, 0, 0) -
    UTC7_OFFSET_MS;

  // If today is event day and event already ended (>= 22:00 UTC+7), advance to next week's event
  if (daysUntilEvent === 0 && nowMs >= candidateEndMs) {
    daysUntilEvent = 7;
  }

  const targetDateOffset = wibDate + daysUntilEvent;
  const startMs =
    daysUntilEvent === 0
      ? candidateStartMs
      : Date.UTC(
          wibYear,
          wibMonth,
          targetDateOffset,
          event.startHour,
          event.startMinute,
          0,
          0,
        ) - UTC7_OFFSET_MS;
  const endMs =
    daysUntilEvent === 0
      ? candidateEndMs
      : Date.UTC(
          wibYear,
          wibMonth,
          targetDateOffset,
          event.endHour,
          event.endMinute,
          0,
          0,
        ) - UTC7_OFFSET_MS;

  const isLive = nowMs >= startMs && nowMs < endMs;

  return {
    event,
    eventKey: `${event.id}:${makeWibDateSlug(wibYear, wibMonth, targetDateOffset)}`,
    status: isLive ? 'live' : 'upcoming',
    startMs,
    endMs,
    countdownTargetMs: isLive ? endMs : startMs,
    dateLabelWib: formatWibEventLabel(wibYear, wibMonth, targetDateOffset, event),
  };
}

export function splitRemainingTime(diffMs: number) {
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}
