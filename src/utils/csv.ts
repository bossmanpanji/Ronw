import {
  DIVISIONS,
  getCategoryLabel,
  makeDivisionTitleKey,
  makeSlotKey,
  makeTeamTitleKey,
  SLOTS_PER_TEAM,
  TEAMS_PER_DIVISION,
} from '../constants/teams';
import type {
  GuildLeagueFixedParty,
  GuildLeagueFixedPartySlot,
  GuildLeagueRosterTitle,
  GuildLeagueSignup,
  GuildLeagueTeamSlot,
} from '../types/signup';

function escapeCsvCell(rawValue: string | number): string {
  let str = String(rawValue);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\r\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsvContent(headers: string[], rows: (string | number)[][]): string {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const bodyLines = rows.map((row) => row.map(escapeCsvCell).join(','));
  return `\uFEFF${[headerLine, ...bodyLines].join('\r\n')}`;
}

function triggerCsvDownload(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getTodayDateSlug(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateTimeId(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

export function downloadSignupsCsv(signups: GuildLeagueSignup[]): void {
  const headers = ['No', 'Nick In Game', 'Job', 'Waktu Daftar'];
  const rows = signups.map((member, index) => [
    index + 1,
    member.nickname,
    member.job,
    formatDateTimeId(member.created_at),
  ]);

  const csv = buildCsvContent(headers, rows);
  triggerCsvDownload(`java-glitch-daftar-anggota-${getTodayDateSlug()}.csv`, csv);
}

export function downloadTeamRosterCsv(
  signups: GuildLeagueSignup[],
  teamSlots: GuildLeagueTeamSlot[],
  rosterTitles: GuildLeagueRosterTitle[] = [],
): void {
  const signupMap = new Map<string, GuildLeagueSignup>();
  for (const member of signups) {
    signupMap.set(member.id, member);
  }

  const slotMap = new Map<string, GuildLeagueTeamSlot>();
  for (const slot of teamSlots) {
    slotMap.set(slot.slot_key, slot);
  }

  const titleMap = new Map<string, string>();
  for (const item of rosterTitles) {
    titleMap.set(item.title_key, item.title);
  }

  const headers = ['Kategori', 'Divisi', 'Team', 'Slot', 'Nick In Game', 'Job'];
  const rows: (string | number)[][] = [];

  for (const division of DIVISIONS) {
    const categoryLabel = getCategoryLabel(division.category);
    const divisionLabel = titleMap.get(makeDivisionTitleKey(division.id)) ?? division.label;
    for (let team = 1; team <= TEAMS_PER_DIVISION; team += 1) {
      const teamLabel = titleMap.get(makeTeamTitleKey(division.id, team)) ?? `Team ${team}`;
      for (let slotNum = 1; slotNum <= SLOTS_PER_TEAM; slotNum += 1) {
        const slot = slotMap.get(makeSlotKey(division.id, team, slotNum));
        const member = slot ? signupMap.get(slot.signup_id) : undefined;
        if (member) {
          rows.push([
            categoryLabel,
            divisionLabel,
            teamLabel,
            slotNum,
            member.nickname,
            member.job,
          ]);
        }
      }
    }
  }

  const csv = buildCsvContent(headers, rows);
  triggerCsvDownload(`java-glitch-lineup-${getTodayDateSlug()}.csv`, csv);
}

export function downloadFixedPartiesCsv(
  parties: GuildLeagueFixedParty[],
  partySlots: GuildLeagueFixedPartySlot[],
  signups: GuildLeagueSignup[],
): void {
  const signupMap = new Map<string, GuildLeagueSignup>();
  for (const member of signups) {
    signupMap.set(member.id, member);
  }

  const slotMap = new Map<string, GuildLeagueFixedPartySlot>();
  for (const slot of partySlots) {
    slotMap.set(slot.slot_key, slot);
  }

  const headers = ['Nama Team', 'Slot', 'Nick In Game', 'Job'];
  const rows: (string | number)[][] = [];

  for (const party of parties) {
    for (let slotNum = 1; slotNum <= SLOTS_PER_TEAM; slotNum += 1) {
      const slot = slotMap.get(`${party.id}:${slotNum}`);
      const member = slot ? signupMap.get(slot.signup_id) : undefined;
      if (member) {
        rows.push([party.name, slotNum, member.nickname, member.job]);
      }
    }
  }

  const csv = buildCsvContent(headers, rows);
  triggerCsvDownload(`java-glitch-party-tetap-${getTodayDateSlug()}.csv`, csv);
}
