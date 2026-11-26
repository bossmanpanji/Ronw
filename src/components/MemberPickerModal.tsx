import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertCircle, Loader2, Search, X } from 'lucide-react';
import { getJobByName } from '../constants/jobs';
import { DIVISIONS, type DivisionId } from '../constants/teams';
import { clearGuildLeagueTeamSlot, upsertGuildLeagueTeamSlot } from '../lib/supabase';
import type { GuildLeagueSignup, GuildLeagueTeamSlot } from '../types/signup';

interface MemberPickerModalProps {
  division: DivisionId;
  divisionLabel: string;
  teamNumber: number;
  slotNumber: number;
  currentSlot: GuildLeagueTeamSlot | undefined;
  signups: GuildLeagueSignup[];
  allSlots: GuildLeagueTeamSlot[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

export function MemberPickerModal({
  division,
  divisionLabel,
  teamNumber,
  slotNumber,
  currentSlot,
  signups,
  allSlots,
  onClose,
  onSaved,
}: MemberPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape' && !isSaving) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSaving, onClose]);

  const divisionMap = useMemo(() => {
    const map = new Map<DivisionId, (typeof DIVISIONS)[number]>();
    for (const d of DIVISIONS) {
      map.set(d.id, d);
    }
    return map;
  }, []);

  const assignmentsBySignupId = useMemo(() => {
    const map = new Map<string, GuildLeagueTeamSlot[]>();
    for (const slot of allSlots) {
      const existing = map.get(slot.signup_id) ?? [];
      existing.push(slot);
      map.set(slot.signup_id, existing);
    }
    return map;
  }, [allSlots]);

  const filteredSignups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return signups;
    return signups.filter(
      (member) =>
        member.nickname.toLowerCase().includes(query) ||
        member.job.toLowerCase().includes(query),
    );
  }, [signups, searchQuery]);

  async function handleSelectMember(signupId: string) {
    if (isSaving) return;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      await upsertGuildLeagueTeamSlot({
        division,
        teamNumber,
        slotNumber,
        signupId,
      });
      await onSaved();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Gagal menyimpan anggota ke slot team. Silakan coba lagi.';
      setErrorMessage(message);
      setIsSaving(false);
    }
  }

  async function handleClearCurrentSlot() {
    if (!currentSlot || isSaving) return;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      await clearGuildLeagueTeamSlot(currentSlot.slot_key);
      await onSaved();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Gagal mengosongkan slot team. Silakan coba lagi.';
      setErrorMessage(message);
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/45 backdrop-blur-[2px] p-0 sm:p-4"
      onClick={() => {
        if (!isSaving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-xl flex flex-col max-h-[88vh] overflow-hidden"
      >
        <div className="px-5 pt-5 pb-4 border-b border-slate-200 space-y-3 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 id={titleId} className="text-lg font-bold text-slate-900">
                Pilih Anggota
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                {divisionLabel} · Team {teamNumber} · Slot {slotNumber}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              aria-label="Tutup"
              className="min-h-[44px] min-w-[44px] -mr-2 -mt-1 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] disabled:opacity-50"
            >
              <X aria-hidden="true" className="w-5 h-5" />
            </button>
          </div>

          <div className="relative">
            <Search
              aria-hidden="true"
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              disabled={isSaving}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nick atau job anggota..."
              aria-label="Cari nick atau job anggota"
              className="w-full min-h-[44px] pl-10 pr-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3]"
            />
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mx-5 mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-900 flex items-start gap-2.5 shrink-0"
          >
            <AlertCircle aria-hidden="true" className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
          {signups.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">
              Belum ada anggota di Daftar Anggota. Silakan daftar terlebih dahulu di tab
              Pendaftaran.
            </div>
          ) : filteredSignups.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">
              Tidak ada anggota yang cocok dengan pencarian.
            </div>
          ) : (
            filteredSignups.map((member) => {
              const jobMeta = getJobByName(member.job);
              const memberSlots = assignmentsBySignupId.get(member.id) ?? [];
              const isCurrentSlotMember = currentSlot?.signup_id === member.id;
              const sameDivisionSlot = memberSlots.find(
                (s) => s.division === division && s.slot_key !== currentSlot?.slot_key,
              );
              const otherDivisionSlots = memberSlots.filter((s) => s.division !== division);
              const isBlocked = Boolean(sameDivisionSlot);

              return (
                <button
                  key={member.id}
                  type="button"
                  disabled={isSaving || isBlocked}
                  onClick={() => handleSelectMember(member.id)}
                  className={`w-full px-5 py-3 min-h-[56px] text-left flex items-center justify-between gap-3 transition-colors focus-visible:outline-none focus-visible:bg-slate-100 ${
                    isCurrentSlotMember
                      ? 'bg-indigo-50/70'
                      : isBlocked
                        ? 'bg-slate-50 opacity-55 cursor-not-allowed'
                        : 'bg-white hover:bg-slate-50 active:bg-slate-100'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm sm:text-base font-semibold text-slate-900 break-words">
                        {member.nickname}
                      </span>
                      {isCurrentSlotMember && (
                        <span className="text-xs font-semibold text-[#3730A3] shrink-0">
                          (Terpilih)
                        </span>
                      )}
                    </div>
                    {(sameDivisionSlot || otherDivisionSlots.length > 0) && (
                      <div className="mt-0.5 text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        {sameDivisionSlot && (
                          <span className="text-amber-700 font-medium">
                            Sudah di Team {sameDivisionSlot.team_number}
                          </span>
                        )}
                        {!sameDivisionSlot && otherDivisionSlots.length > 0 && (
                          <span className="inline-flex flex-wrap items-center gap-1.5">
                            <span>Terisi di:</span>
                            {otherDivisionSlots.map((s) => {
                              const divInfo = divisionMap.get(s.division);
                              return (
                                <span
                                  key={s.slot_key}
                                  className="inline-flex items-center gap-1 font-medium text-slate-700"
                                >
                                  <span
                                    aria-hidden="true"
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: divInfo?.color ?? '#64748B' }}
                                  />
                                  <span>
                                    {divInfo?.label ?? s.division} (T{s.team_number})
                                  </span>
                                </span>
                              );
                            })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <span
                    style={{
                      backgroundColor: jobMeta.color,
                      color: jobMeta.textColor,
                    }}
                    className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap"
                  >
                    {jobMeta.name}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3 shrink-0">
          {currentSlot ? (
            <button
              type="button"
              onClick={handleClearCurrentSlot}
              disabled={isSaving}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-red-200 bg-white text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:opacity-60"
            >
              Kosongkan Slot
            </button>
          ) : (
            <span className="text-xs text-slate-500">
              {isSaving ? 'Menyimpan...' : 'Sumber data: Daftar Anggota'}
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] disabled:opacity-60 inline-flex items-center gap-2"
          >
            {isSaving && <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />}
            <span>Tutup</span>
          </button>
        </div>
      </div>
    </div>
  );
}
