import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { getJobByName } from '../constants/jobs';
import type { GuildEventLeave, GuildLeagueSignup } from '../types/signup';
import { downloadSignupsCsv } from '../utils/csv';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { EditMemberModal } from './EditMemberModal';
import {
  getJobFilterLabel,
  JobFilterDropdown,
  type JobFilterValue,
} from './JobFilterDropdown';

interface SignupListProps {
  signups: GuildLeagueSignup[];
  leaveBySignupId?: Map<string, GuildEventLeave>;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void> | void;
}

export function SignupList({
  signups,
  leaveBySignupId,
  isLoading,
  error,
  onRefresh,
}: SignupListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [jobFilter, setJobFilter] = useState<JobFilterValue>({ kind: 'all' });
  const [editingMember, setEditingMember] = useState<GuildLeagueSignup | null>(null);
  const [deletingMember, setDeletingMember] = useState<GuildLeagueSignup | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const hasActiveFilter = Boolean(trimmedQuery) || jobFilter.kind !== 'all';

  const filteredEntries = useMemo(() => {
    const indexed = signups.map((member, idx) => ({
      member,
      orderNumber: idx + 1,
    }));
    if (!hasActiveFilter) return indexed;

    return indexed.filter(({ member }) => {
      if (trimmedQuery && !member.nickname.toLowerCase().includes(trimmedQuery)) {
        return false;
      }
      if (jobFilter.kind === 'job') {
        return member.job.toLowerCase() === jobFilter.jobName.toLowerCase();
      }
      if (jobFilter.kind === 'group') {
        return getJobByName(member.job).group === jobFilter.group;
      }
      return true;
    });
  }, [signups, trimmedQuery, jobFilter, hasActiveFilter]);

  return (
    <section aria-labelledby="list-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h2 id="list-heading" className="text-lg sm:text-xl font-bold text-slate-900 tabular-nums">
          Daftar Anggota ({signups.length})
        </h2>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => downloadSignupsCsv(signups)}
            disabled={isLoading || signups.length === 0}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] transition-all duration-150 inline-flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download aria-hidden="true" className="w-4 h-4" />
            <span>Unduh CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActionNotice(null);
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

      {signups.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1 min-w-0">
              <Search
                aria-hidden="true"
                className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              />
              <input
                id="member-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nick in-game anggota..."
                aria-label="Cari nick in-game anggota"
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

            <JobFilterDropdown
              signups={signups}
              value={jobFilter}
              onChange={setJobFilter}
            />
          </div>
          {hasActiveFilter && (
            <p className="text-xs text-slate-500 tabular-nums px-1">
              Menampilkan {filteredEntries.length} dari {signups.length} anggota
              {jobFilter.kind !== 'all' ? ` · ${getJobFilterLabel(jobFilter)}` : ''}
            </p>
          )}
        </div>
      )}

      {actionNotice && (
        <div
          role="status"
          className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-medium text-emerald-900 flex items-center gap-2.5"
        >
          <CheckCircle2 aria-hidden="true" className="w-5 h-5 text-emerald-700 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3.5 text-sm font-medium text-red-900 flex items-start gap-2.5"
        >
          <AlertCircle aria-hidden="true" className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading && signups.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
            <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin text-slate-400" />
            <span>Memuat Daftar Anggota...</span>
          </div>
        ) : signups.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            Belum ada yang mendaftar.
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500 space-y-2">
            <p>
              Tidak ada anggota yang cocok
              {trimmedQuery ? ` dengan nama "${searchQuery.trim()}"` : ''}
              {jobFilter.kind !== 'all' ? ` pada ${getJobFilterLabel(jobFilter)}` : ''}.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setJobFilter({ kind: 'all' });
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold text-[#3730A3] hover:bg-indigo-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3]"
            >
              Reset filter
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filteredEntries.map(({ member, orderNumber }) => {
              const jobMeta = getJobByName(member.job);
              const memberLeave = leaveBySignupId?.get(member.id);
              return (
                <li
                  key={member.id}
                  className="px-4 sm:px-5 py-3 min-h-[56px] flex items-center justify-between gap-2 sm:gap-3"
                >
                  <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <span className="text-xs font-medium text-slate-400 tabular-nums w-6 shrink-0 pt-1 sm:pt-0">
                      {orderNumber}.
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          <span className="text-sm sm:text-base font-medium text-slate-900 break-words min-w-0">
                            {member.nickname}
                          </span>
                          {memberLeave && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-[11px] font-bold text-amber-900 shrink-0">
                              Izin
                            </span>
                          )}
                        </div>
                        <span
                          style={{
                            backgroundColor: jobMeta.color,
                            color: jobMeta.textColor,
                          }}
                          className="self-start sm:self-auto shrink-0 inline-flex items-center px-2.5 py-0.5 sm:py-1 rounded-md text-xs font-semibold whitespace-nowrap"
                        >
                          {jobMeta.name}
                        </span>
                      </div>
                      {memberLeave && (
                        <p className="text-xs text-amber-800 break-words">
                          Izin: {memberLeave.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActionNotice(null);
                        setEditingMember(member);
                      }}
                      aria-label={`Edit ${member.nickname}`}
                      title="Edit"
                      className="min-h-[44px] min-w-[44px] rounded-xl text-slate-500 hover:text-[#3730A3] hover:bg-slate-100 active:scale-[0.97] transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3]"
                    >
                      <Pencil aria-hidden="true" className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionNotice(null);
                        setDeletingMember(member);
                      }}
                      aria-label={`Hapus ${member.nickname}`}
                      title="Hapus"
                      className="min-h-[44px] min-w-[44px] rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 active:scale-[0.97] transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                    >
                      <Trash2 aria-hidden="true" className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editingMember && (
        <EditMemberModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSaved={async () => {
            setEditingMember(null);
            setActionNotice('Data anggota berhasil diperbarui');
            await onRefresh();
          }}
        />
      )}

      {deletingMember && (
        <DeleteConfirmModal
          member={deletingMember}
          onClose={() => setDeletingMember(null)}
          onDeleted={async () => {
            setDeletingMember(null);
            setActionNotice('Anggota berhasil dihapus dari Daftar Anggota');
            await onRefresh();
          }}
        />
      )}
    </section>
  );
}
