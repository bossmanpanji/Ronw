import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Download,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { getJobByName } from '../constants/jobs';
import {
  DIVISIONS,
  makeDivisionTitleKey,
  makeSlotKey,
  makeTeamTitleKey,
  SLOTS_PER_TEAM,
  TEAMS_PER_DIVISION,
  type DivisionConfig,
  type DivisionId,
} from '../constants/teams';
import {
  clearGuildLeagueTeamSlot,
  deleteGuildLeagueRosterTitle,
  upsertGuildLeagueRosterTitle,
} from '../lib/supabase';
import type {
  GuildLeagueRosterTitle,
  GuildLeagueSignup,
  GuildLeagueTeamSlot,
} from '../types/signup';
import { downloadTeamRosterCsv } from '../utils/csv';
import { MemberPickerModal } from './MemberPickerModal';
import type { ToastData } from './Toast';

interface TeamRosterTabProps {
  signups: GuildLeagueSignup[];
  teamSlots: GuildLeagueTeamSlot[];
  rosterTitles: GuildLeagueRosterTitle[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void> | void;
  onNotify: (toast: Omit<ToastData, 'id'>) => void;
}

interface ActiveSlotTarget {
  division: DivisionId;
  divisionLabel: string;
  teamNumber: number;
  teamLabel: string;
  slotNumber: number;
}

interface EditingTitleTarget {
  titleKey: string;
  defaultTitle: string;
  currentTitle: string;
  kindLabel: string;
}

function validateRosterTitle(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return 'Judul wajib diisi.';
  }
  if (trimmed.length < 2) {
    return 'Judul minimal 2 karakter.';
  }
  if (trimmed.length > 32) {
    return 'Judul maksimal 32 karakter.';
  }
  return null;
}

export function TeamRosterTab({
  signups,
  teamSlots,
  rosterTitles,
  isLoading,
  error,
  onRefresh,
  onNotify,
}: TeamRosterTabProps) {
  const [selectedDivision, setSelectedDivision] = useState<DivisionId>('main-1');
  const [searchQuery, setSearchQuery] = useState('');
  const [pickerTarget, setPickerTarget] = useState<ActiveSlotTarget | null>(null);
  const [clearingSlotKey, setClearingSlotKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [editingTitleTarget, setEditingTitleTarget] = useState<EditingTitleTarget | null>(null);
  const [titleInputValue, setTitleInputValue] = useState('');
  const [titleInputTouched, setTitleInputTouched] = useState(false);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const titleValidationError = validateRosterTitle(titleInputValue);

  useEffect(() => {
    if (!editingTitleTarget) return;
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape' && !isSavingTitle) {
        setEditingTitleTarget(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingTitleTarget, isSavingTitle]);

  const titleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of rosterTitles) {
      map.set(item.title_key, item.title);
    }
    return map;
  }, [rosterTitles]);

  function getDivisionLabel(division: DivisionConfig): string {
    return titleMap.get(makeDivisionTitleKey(division.id)) ?? division.label;
  }

  function getTeamLabel(divisionId: DivisionId, teamNumber: number): string {
    return titleMap.get(makeTeamTitleKey(divisionId, teamNumber)) ?? `Team ${teamNumber}`;
  }

  const signupMap = useMemo(() => {
    const map = new Map<string, GuildLeagueSignup>();
    for (const s of signups) {
      map.set(s.id, s);
    }
    return map;
  }, [signups]);

  const slotMap = useMemo(() => {
    const map = new Map<string, GuildLeagueTeamSlot>();
    for (const slot of teamSlots) {
      map.set(slot.slot_key, slot);
    }
    return map;
  }, [teamSlots]);

  const divisionCounts = useMemo(() => {
    const counts = new Map<DivisionId, number>();
    for (const d of DIVISIONS) {
      counts.set(d.id, 0);
    }
    for (const slot of teamSlots) {
      if (
        slot.team_number >= 1 &&
        slot.team_number <= TEAMS_PER_DIVISION &&
        slot.slot_number >= 1 &&
        slot.slot_number <= SLOTS_PER_TEAM &&
        signupMap.has(slot.signup_id)
      ) {
        counts.set(slot.division, (counts.get(slot.division) ?? 0) + 1);
      }
    }
    return counts;
  }, [teamSlots, signupMap]);

  const totalAssignedCount = useMemo(() => {
    let total = 0;
    for (const count of divisionCounts.values()) {
      total += count;
    }
    return total;
  }, [divisionCounts]);

  const currentDivisionConfig =
    DIVISIONS.find((d) => d.id === selectedDivision) ?? DIVISIONS[0];
  const currentDivisionCount = divisionCounts.get(selectedDivision) ?? 0;
  const maxSlotsPerDivision = TEAMS_PER_DIVISION * SLOTS_PER_TEAM;

  const teamNumbers = useMemo(
    () => Array.from({ length: TEAMS_PER_DIVISION }, (_, idx) => idx + 1),
    [],
  );
  const slotNumbers = useMemo(
    () => Array.from({ length: SLOTS_PER_TEAM }, (_, idx) => idx + 1),
    [],
  );

  const searchResults = useMemo(() => {
    if (!trimmedQuery) {
      return {
        matchedTeams: [] as { division: DivisionConfig; teamNumber: number }[],
        matchedSlotCount: 0,
      };
    }

    const matchedTeams: { division: DivisionConfig; teamNumber: number }[] = [];
    let matchedSlotCount = 0;

    for (const division of DIVISIONS) {
      for (const teamNumber of teamNumbers) {
        let teamMatchCount = 0;
        for (const slotNumber of slotNumbers) {
          const slot = slotMap.get(makeSlotKey(division.id, teamNumber, slotNumber));
          const member = slot ? signupMap.get(slot.signup_id) : undefined;
          if (member && member.nickname.toLowerCase().includes(trimmedQuery)) {
            teamMatchCount += 1;
          }
        }
        if (teamMatchCount > 0) {
          matchedTeams.push({ division, teamNumber });
          matchedSlotCount += teamMatchCount;
        }
      }
    }

    return { matchedTeams, matchedSlotCount };
  }, [trimmedQuery, teamNumbers, slotNumbers, slotMap, signupMap]);

  const unassignedMatches = useMemo(() => {
    if (!trimmedQuery || searchResults.matchedTeams.length > 0) {
      return [];
    }
    return signups.filter((member) =>
      member.nickname.toLowerCase().includes(trimmedQuery),
    );
  }, [trimmedQuery, searchResults.matchedTeams.length, signups]);

  function openTitleEditor(target: EditingTitleTarget) {
    setEditingTitleTarget(target);
    setTitleInputValue(target.currentTitle);
    setTitleInputTouched(false);
    setTitleError(null);
  }

  async function handleSaveTitle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTitleInputTouched(true);
    if (!editingTitleTarget || titleValidationError || isSavingTitle) return;

    setIsSavingTitle(true);
    setTitleError(null);
    const cleanTitle = titleInputValue.trim();

    try {
      if (cleanTitle === editingTitleTarget.defaultTitle) {
        await deleteGuildLeagueRosterTitle(editingTitleTarget.titleKey);
      } else {
        await upsertGuildLeagueRosterTitle(editingTitleTarget.titleKey, cleanTitle);
      }
      setEditingTitleTarget(null);
      onNotify({
        type: 'success',
        title: 'Judul berhasil diperbarui',
        message: cleanTitle,
      });
      await onRefresh();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Gagal menyimpan judul. Silakan coba lagi.';
      setTitleError(msg);
    } finally {
      setIsSavingTitle(false);
    }
  }

  async function handleResetDefaultTitle() {
    if (!editingTitleTarget || isSavingTitle) return;
    setIsSavingTitle(true);
    setTitleError(null);

    try {
      await deleteGuildLeagueRosterTitle(editingTitleTarget.titleKey);
      const defaultTitle = editingTitleTarget.defaultTitle;
      setEditingTitleTarget(null);
      onNotify({
        type: 'success',
        title: 'Judul dikembalikan ke default',
        message: defaultTitle,
      });
      await onRefresh();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Gagal mereset judul. Silakan coba lagi.';
      setTitleError(msg);
    } finally {
      setIsSavingTitle(false);
    }
  }

  function renderTeamCard(
    divisionConfig: DivisionConfig,
    teamNumber: number,
    showDivisionBadge: boolean,
  ) {
    const divisionLabel = getDivisionLabel(divisionConfig);
    const teamLabel = getTeamLabel(divisionConfig.id, teamNumber);
    const teamFilledCount = slotNumbers.filter((slotNumber) => {
      const slot = slotMap.get(makeSlotKey(divisionConfig.id, teamNumber, slotNumber));
      return slot && signupMap.has(slot.signup_id);
    }).length;

    return (
      <div
        key={`${divisionConfig.id}-${teamNumber}`}
        style={{ borderColor: divisionConfig.softBorder }}
        className="bg-white rounded-2xl border shadow-xs overflow-hidden"
      >
        <div
          style={{
            backgroundColor: divisionConfig.softBg,
            borderColor: divisionConfig.softBorder,
          }}
          className="px-4 sm:px-5 py-2.5 border-b flex items-center justify-between gap-2"
        >
          <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
            {showDivisionBadge ? (
              <span
                style={{
                  backgroundColor: divisionConfig.color,
                  color: divisionConfig.textColor,
                }}
                className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold whitespace-nowrap shrink-0 mr-0.5"
              >
                {divisionLabel}
              </span>
            ) : (
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-full shrink-0 mr-0.5"
                style={{ backgroundColor: divisionConfig.color }}
              />
            )}
            <h3 className="text-base font-bold text-slate-900 break-words min-w-0">
              {teamLabel}
            </h3>
            <button
              type="button"
              onClick={() =>
                openTitleEditor({
                  titleKey: makeTeamTitleKey(divisionConfig.id, teamNumber),
                  defaultTitle: `Team ${teamNumber}`,
                  currentTitle: teamLabel,
                  kindLabel: `Judul ${divisionLabel} · Team ${teamNumber}`,
                })
              }
              aria-label={`Ubah judul ${teamLabel}`}
              title="Ubah judul team"
              className="min-h-[44px] min-w-[44px] rounded-xl text-slate-500 hover:text-[#3730A3] hover:bg-white/80 transition-colors flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3]"
            >
              <Pencil aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-xs sm:text-sm font-semibold text-slate-700 tabular-nums whitespace-nowrap shrink-0">
            {teamFilledCount}/{SLOTS_PER_TEAM} orang
          </span>
        </div>

        <ul className="divide-y divide-slate-100">
          {slotNumbers.map((slotNumber) => {
            const slotKey = makeSlotKey(divisionConfig.id, teamNumber, slotNumber);
            const slot = slotMap.get(slotKey);
            const assignedMember = slot ? signupMap.get(slot.signup_id) : undefined;
            const isClearing = clearingSlotKey === slotKey;

            if (!assignedMember) {
              return (
                <li key={slotNumber} className="px-3 sm:px-4 py-2">
                  <button
                    type="button"
                    disabled={Boolean(clearingSlotKey)}
                    onClick={() => {
                      setActionError(null);
                      setPickerTarget({
                        division: divisionConfig.id,
                        divisionLabel,
                        teamNumber,
                        teamLabel,
                        slotNumber,
                      });
                    }}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 hover:text-[#3730A3] hover:border-[#3730A3]/50 hover:bg-indigo-50/40 transition-colors flex items-center justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs font-medium text-slate-400 tabular-nums w-4 shrink-0">
                        {slotNumber}.
                      </span>
                      <span className="truncate">Pilih anggota dari daftar</span>
                    </span>
                    <Plus aria-hidden="true" className="w-4 h-4 shrink-0" />
                  </button>
                </li>
              );
            }

            const jobMeta = getJobByName(assignedMember.job);
            const isSearchMatch = Boolean(
              trimmedQuery && assignedMember.nickname.toLowerCase().includes(trimmedQuery),
            );

            return (
              <li
                key={slotNumber}
                className={`px-3 sm:px-4 py-2 min-h-[56px] flex items-center justify-between gap-2 ${
                  isSearchMatch ? 'bg-indigo-50/75' : ''
                }`}
              >
                <button
                  type="button"
                  disabled={isClearing}
                  onClick={() => {
                    setActionError(null);
                    setPickerTarget({
                      division: divisionConfig.id,
                      divisionLabel,
                      teamNumber,
                      teamLabel,
                      slotNumber,
                    });
                  }}
                  className="flex-1 min-w-0 min-h-[44px] px-2 py-1.5 rounded-xl hover:bg-slate-50/80 text-left flex items-start sm:items-center gap-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3]"
                >
                  <span className="text-xs font-medium text-slate-400 tabular-nums w-4 shrink-0 pt-1 sm:pt-0">
                    {slotNumber}.
                  </span>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0 flex-1">
                    <span
                      className={`text-sm sm:text-base break-words min-w-0 ${
                        isSearchMatch
                          ? 'font-bold text-[#3730A3]'
                          : 'font-medium text-slate-900'
                      }`}
                    >
                      {assignedMember.nickname}
                    </span>
                    <span
                      style={{
                        backgroundColor: jobMeta.color,
                        color: jobMeta.textColor,
                      }}
                      className="self-start sm:self-auto shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap"
                    >
                      {jobMeta.name}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={isClearing}
                  onClick={() => {
                    void handleClearSlot(slotKey);
                  }}
                  aria-label={`Keluarkan ${assignedMember.nickname} dari ${divisionLabel} ${teamLabel} Slot ${slotNumber}`}
                  title="Keluarkan dari slot"
                  className="min-h-[44px] min-w-[44px] rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:opacity-50"
                >
                  {isClearing ? (
                    <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />
                  ) : (
                    <X aria-hidden="true" className="w-4 h-4" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  async function handleClearSlot(slotKey: string) {
    if (clearingSlotKey) return;
    setClearingSlotKey(slotKey);
    setActionError(null);
    try {
      await clearGuildLeagueTeamSlot(slotKey);
      await onRefresh();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Gagal mengosongkan slot team. Silakan coba lagi.';
      setActionError(msg);
    } finally {
      setClearingSlotKey(null);
    }
  }

  return (
    <section aria-labelledby="roster-heading" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="roster-heading" className="text-lg sm:text-xl font-bold text-slate-900">
            Susunan Team
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Pilih anggota dari Daftar Anggota untuk mengisi tiap team ({TEAMS_PER_DIVISION} team ×{' '}
            {SLOTS_PER_TEAM} orang).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => downloadTeamRosterCsv(signups, teamSlots, rosterTitles)}
            disabled={isLoading || totalAssignedCount === 0}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] transition-all duration-150 inline-flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download aria-hidden="true" className="w-4 h-4" />
            <span>Unduh CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActionError(null);
              void onRefresh();
            }}
            disabled={isLoading}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] transition-all duration-150 inline-flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw
              aria-hidden="true"
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            <span>Muat ulang</span>
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          />
          <input
            id="roster-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nick in-game di semua team..."
            aria-label="Cari nick in-game di susunan team"
            className={`w-full min-h-[44px] pl-10 py-2.5 rounded-xl border border-slate-300 bg-white text-sm sm:text-base text-slate-900 placeholder:text-slate-400 shadow-xs transition-colors hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] focus-visible:ring-offset-2 ${
              searchQuery ? 'pr-11' : 'pr-3.5'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Hapus pencarian"
              className="min-h-[44px] min-w-[44px] absolute right-0 top-1/2 -translate-y-1/2 rounded-xl text-slate-400 hover:text-slate-700 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3]"
            >
              <X aria-hidden="true" className="w-4 h-4" />
            </button>
          )}
        </div>
        {trimmedQuery && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <p className="text-xs text-slate-600 tabular-nums">
              {searchResults.matchedTeams.length > 0
                ? `Ditemukan ${searchResults.matchedSlotCount} kecocokan di ${searchResults.matchedTeams.length} team (semua divisi)`
                : `Tidak ditemukan "${searchQuery.trim()}" di susunan team`}
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs font-semibold text-[#3730A3] hover:underline whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] rounded"
            >
              Reset pencarian
            </button>
          </div>
        )}
      </div>

      {!trimmedQuery && (
        <div
          role="tablist"
          aria-label="Pilih divisi team"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2"
        >
          {DIVISIONS.map((division) => {
            const isSelected = division.id === selectedDivision;
            const filled = divisionCounts.get(division.id) ?? 0;

            return (
              <button
                key={division.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => {
                  setSelectedDivision(division.id);
                  setActionError(null);
                }}
                style={
                  isSelected
                    ? {
                        backgroundColor: division.color,
                        borderColor: division.color,
                        color: division.textColor,
                      }
                    : {
                        backgroundColor: division.softBg,
                        borderColor: division.softBorder,
                      }
                }
                className={`min-h-[48px] px-3 py-2.5 rounded-xl border text-left transition-all duration-150 flex items-center justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] focus-visible:ring-offset-1 ${
                  isSelected ? 'shadow-xs' : 'text-slate-900 hover:brightness-[0.98]'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    aria-hidden="true"
                    className={`w-2.5 h-2.5 rounded-full shrink-0 border ${
                      isSelected
                        ? division.textColor === '#FFFFFF'
                          ? 'border-white/75'
                          : 'border-slate-900/35'
                        : 'border-black/10'
                    }`}
                    style={{ backgroundColor: division.color }}
                  />
                  <span className="text-xs sm:text-sm font-semibold truncate">
                    {getDivisionLabel(division)}
                  </span>
                </span>
                <span className="text-xs font-semibold tabular-nums shrink-0 opacity-85">
                  {filled}/{maxSlotsPerDivision}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {(error || actionError) && (
        <div
          role="alert"
          className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3.5 text-sm font-medium text-red-900 flex items-start gap-2.5"
        >
          <AlertCircle aria-hidden="true" className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          <span>{actionError ?? error}</span>
        </div>
      )}

      {!trimmedQuery && (
        <div
          style={{
            backgroundColor: currentDivisionConfig.softBg,
            borderColor: currentDivisionConfig.softBorder,
          }}
          className="rounded-2xl border px-4 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              style={{
                backgroundColor: currentDivisionConfig.color,
                color: currentDivisionConfig.textColor,
              }}
              className="inline-flex items-center px-3 py-1 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap truncate max-w-[220px] sm:max-w-xs"
            >
              {getDivisionLabel(currentDivisionConfig)}
            </span>
            <button
              type="button"
              onClick={() =>
                openTitleEditor({
                  titleKey: makeDivisionTitleKey(currentDivisionConfig.id),
                  defaultTitle: currentDivisionConfig.label,
                  currentTitle: getDivisionLabel(currentDivisionConfig),
                  kindLabel: `Judul Divisi (${currentDivisionConfig.label})`,
                })
              }
              aria-label={`Ubah judul divisi ${getDivisionLabel(currentDivisionConfig)}`}
              title="Ubah judul divisi"
              className="min-h-[44px] min-w-[44px] rounded-xl text-slate-600 hover:text-[#3730A3] hover:bg-white/80 transition-colors flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3]"
            >
              <Pencil aria-hidden="true" className="w-4 h-4" />
            </button>
          </div>
          <span className="text-slate-700 font-medium tabular-nums">
            {currentDivisionCount} / {maxSlotsPerDivision} slot terisi · {signups.length} anggota
            tersedia
          </span>
        </div>
      )}

      {isLoading && teamSlots.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-12 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
          <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin text-slate-400" />
          <span>Memuat susunan team...</span>
        </div>
      ) : trimmedQuery ? (
        searchResults.matchedTeams.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 px-5 py-10 text-center text-sm text-slate-500 space-y-3">
            <p>
              Tidak ada anggota dengan nama &ldquo;{searchQuery.trim()}&rdquo; di susunan team.
            </p>
            {unassignedMatches.length > 0 && (
              <div className="max-w-md mx-auto rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-left space-y-1.5">
                <p className="text-xs font-semibold text-slate-700">
                  Terdaftar di Daftar Anggota namun belum masuk team:
                </p>
                <ul className="space-y-1">
                  {unassignedMatches.map((member) => {
                    const jobMeta = getJobByName(member.job);
                    return (
                      <li
                        key={member.id}
                        className="flex items-center justify-between gap-2 text-xs sm:text-sm"
                      >
                        <span className="font-semibold text-slate-900 break-words">
                          {member.nickname}
                        </span>
                        <span
                          style={{
                            backgroundColor: jobMeta.color,
                            color: jobMeta.textColor,
                          }}
                          className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap"
                        >
                          {jobMeta.name}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold text-[#3730A3] hover:bg-indigo-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3]"
            >
              Reset pencarian
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            {searchResults.matchedTeams.map(({ division, teamNumber }) =>
              renderTeamCard(division, teamNumber, true),
            )}
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {teamNumbers.map((teamNumber) =>
            renderTeamCard(currentDivisionConfig, teamNumber, false),
          )}
        </div>
      )}

      {pickerTarget && (
        <MemberPickerModal
          division={pickerTarget.division}
          divisionLabel={pickerTarget.divisionLabel}
          teamNumber={pickerTarget.teamNumber}
          teamLabel={pickerTarget.teamLabel}
          slotNumber={pickerTarget.slotNumber}
          currentSlot={slotMap.get(
            makeSlotKey(
              pickerTarget.division,
              pickerTarget.teamNumber,
              pickerTarget.slotNumber,
            ),
          )}
          signups={signups}
          allSlots={teamSlots}
          rosterTitles={rosterTitles}
          onClose={() => setPickerTarget(null)}
          onSaved={async () => {
            setPickerTarget(null);
            await onRefresh();
          }}
        />
      )}

      {editingTitleTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/45 backdrop-blur-[2px] p-0 sm:p-4"
          onClick={() => {
            if (!isSavingTitle) setEditingTitleTarget(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-roster-title-heading"
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-xl p-5 sm:p-6"
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 id="edit-roster-title-heading" className="text-lg font-bold text-slate-900">
                  Ubah Judul
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  {editingTitleTarget.kindLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTitleTarget(null)}
                disabled={isSavingTitle}
                aria-label="Tutup"
                className="min-h-[44px] min-w-[44px] -mr-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] disabled:opacity-50"
              >
                <X aria-hidden="true" className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTitle} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="edit-roster-title-input"
                  className="block text-sm font-semibold text-slate-800 mb-1.5"
                >
                  Judul Baru
                </label>
                <input
                  id="edit-roster-title-input"
                  type="text"
                  maxLength={32}
                  autoFocus
                  value={titleInputValue}
                  disabled={isSavingTitle}
                  placeholder={editingTitleTarget.defaultTitle}
                  onChange={(e) => {
                    setTitleInputValue(e.target.value);
                    if (titleError) setTitleError(null);
                  }}
                  onBlur={() => setTitleInputTouched(true)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-base text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3]"
                />
                {titleInputTouched && titleValidationError && (
                  <p className="mt-1.5 text-xs font-medium text-red-600" role="alert">
                    {titleValidationError}
                  </p>
                )}
              </div>

              {titleError && (
                <div
                  role="alert"
                  className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-900 flex items-start gap-2.5"
                >
                  <AlertCircle aria-hidden="true" className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
                  <span>{titleError}</span>
                </div>
              )}

              {editingTitleTarget.currentTitle !== editingTitleTarget.defaultTitle && (
                <button
                  type="button"
                  onClick={() => {
                    void handleResetDefaultTitle();
                  }}
                  disabled={isSavingTitle}
                  className="min-h-[44px] w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] disabled:opacity-60"
                >
                  <RotateCcw aria-hidden="true" className="w-4 h-4" />
                  <span>Kembalikan ke &ldquo;{editingTitleTarget.defaultTitle}&rdquo;</span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingTitleTarget(null)}
                  disabled={isSavingTitle}
                  className="min-h-[48px] px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] disabled:opacity-60"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={Boolean(titleValidationError) || isSavingTitle}
                  className="min-h-[48px] px-4 py-3 rounded-xl text-sm font-semibold text-white bg-[#3730A3] hover:bg-[#312E81] flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] disabled:bg-slate-200 disabled:text-slate-500"
                >
                  {isSavingTitle ? (
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
      )}
    </section>
  );
}
