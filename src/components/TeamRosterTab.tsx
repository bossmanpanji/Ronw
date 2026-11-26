import { useMemo, useState } from 'react';
import { AlertCircle, Download, Loader2, Plus, RefreshCw, X } from 'lucide-react';
import { getJobByName } from '../constants/jobs';
import {
  DIVISIONS,
  makeSlotKey,
  SLOTS_PER_TEAM,
  TEAMS_PER_DIVISION,
  type DivisionId,
} from '../constants/teams';
import { clearGuildLeagueTeamSlot } from '../lib/supabase';
import type { GuildLeagueSignup, GuildLeagueTeamSlot } from '../types/signup';
import { downloadTeamRosterCsv } from '../utils/csv';
import { MemberPickerModal } from './MemberPickerModal';

interface TeamRosterTabProps {
  signups: GuildLeagueSignup[];
  teamSlots: GuildLeagueTeamSlot[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void> | void;
}

interface ActiveSlotTarget {
  division: DivisionId;
  divisionLabel: string;
  teamNumber: number;
  slotNumber: number;
}

export function TeamRosterTab({
  signups,
  teamSlots,
  isLoading,
  error,
  onRefresh,
}: TeamRosterTabProps) {
  const [selectedDivision, setSelectedDivision] = useState<DivisionId>('main-1');
  const [pickerTarget, setPickerTarget] = useState<ActiveSlotTarget | null>(null);
  const [clearingSlotKey, setClearingSlotKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
            onClick={() => downloadTeamRosterCsv(signups, teamSlots)}
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
                <span className="text-xs sm:text-sm font-semibold truncate">{division.label}</span>
              </span>
              <span
                className="text-xs font-semibold tabular-nums shrink-0 opacity-85"
              >
                {filled}/{maxSlotsPerDivision}
              </span>
            </button>
          );
        })}
      </div>

      {(error || actionError) && (
        <div
          role="alert"
          className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3.5 text-sm font-medium text-red-900 flex items-start gap-2.5"
        >
          <AlertCircle aria-hidden="true" className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          <span>{actionError ?? error}</span>
        </div>
      )}

      <div
        style={{
          backgroundColor: currentDivisionConfig.softBg,
          borderColor: currentDivisionConfig.softBorder,
        }}
        className="rounded-2xl border px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 text-sm"
      >
        <div className="flex items-center gap-2.5">
          <span
            style={{
              backgroundColor: currentDivisionConfig.color,
              color: currentDivisionConfig.textColor,
            }}
            className="inline-flex items-center px-3 py-1 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap"
          >
            {currentDivisionConfig.label}
          </span>
        </div>
        <span className="text-slate-700 font-medium tabular-nums">
          {currentDivisionCount} / {maxSlotsPerDivision} slot terisi · {signups.length} anggota
          tersedia
        </span>
      </div>

      {isLoading && teamSlots.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-12 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
          <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin text-slate-400" />
          <span>Memuat susunan team...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {teamNumbers.map((teamNumber) => {
            const teamFilledCount = slotNumbers.filter((slotNumber) => {
              const slot = slotMap.get(makeSlotKey(selectedDivision, teamNumber, slotNumber));
              return slot && signupMap.has(slot.signup_id);
            }).length;

            return (
              <div
                key={teamNumber}
                style={{ borderColor: currentDivisionConfig.softBorder }}
                className="bg-white rounded-2xl border shadow-xs overflow-hidden"
              >
                <div
                  style={{
                    backgroundColor: currentDivisionConfig.softBg,
                    borderColor: currentDivisionConfig.softBorder,
                  }}
                  className="px-4 sm:px-5 py-3.5 border-b flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: currentDivisionConfig.color }}
                    />
                    <h3 className="text-base font-bold text-slate-900">Team {teamNumber}</h3>
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-slate-700 tabular-nums">
                    {teamFilledCount}/{SLOTS_PER_TEAM} orang
                  </span>
                </div>

                <ul className="divide-y divide-slate-100">
                  {slotNumbers.map((slotNumber) => {
                    const slotKey = makeSlotKey(selectedDivision, teamNumber, slotNumber);
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
                                division: selectedDivision,
                                divisionLabel: currentDivisionConfig.label,
                                teamNumber,
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

                    return (
                      <li
                        key={slotNumber}
                        className="px-3 sm:px-4 py-2 min-h-[56px] flex items-center justify-between gap-2"
                      >
                        <button
                          type="button"
                          disabled={isClearing}
                          onClick={() => {
                            setActionError(null);
                            setPickerTarget({
                              division: selectedDivision,
                              divisionLabel: currentDivisionConfig.label,
                              teamNumber,
                              slotNumber,
                            });
                          }}
                          className="flex-1 min-w-0 min-h-[44px] px-2 py-1.5 rounded-xl hover:bg-slate-50 text-left flex items-start sm:items-center gap-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3]"
                        >
                          <span className="text-xs font-medium text-slate-400 tabular-nums w-4 shrink-0 pt-1 sm:pt-0">
                            {slotNumber}.
                          </span>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0 flex-1">
                            <span className="text-sm sm:text-base font-medium text-slate-900 break-words min-w-0">
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
                          aria-label={`Keluarkan ${assignedMember.nickname} dari Team ${teamNumber} Slot ${slotNumber}`}
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
          })}
        </div>
      )}

      {pickerTarget && (
        <MemberPickerModal
          division={pickerTarget.division}
          divisionLabel={pickerTarget.divisionLabel}
          teamNumber={pickerTarget.teamNumber}
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
          onClose={() => setPickerTarget(null)}
          onSaved={async () => {
            setPickerTarget(null);
            await onRefresh();
          }}
        />
      )}
    </section>
  );
}
