import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { getJobByName, JOBS } from '../constants/jobs';
import type { GuildLeagueSignup } from '../types/signup';

interface JobSummaryCardProps {
  signups: GuildLeagueSignup[];
  isLoading: boolean;
}

interface JobCountItem {
  name: string;
  color: string;
  textColor: string;
  count: number;
  orderIndex: number;
}

export function JobSummaryCard({ signups, isLoading }: JobSummaryCardProps) {
  const jobCounts = useMemo<JobCountItem[]>(() => {
    const countsByKey = new Map<string, { rawName: string; count: number }>();

    for (const member of signups) {
      const key = member.job.trim().toLowerCase();
      const current = countsByKey.get(key);
      if (current) {
        current.count += 1;
      } else {
        countsByKey.set(key, { rawName: member.job.trim(), count: 1 });
      }
    }

    const items: JobCountItem[] = [];
    for (const [, entry] of countsByKey) {
      const meta = getJobByName(entry.rawName);
      const idx = JOBS.findIndex((j) => j.name.toLowerCase() === entry.rawName.toLowerCase());
      items.push({
        name: meta.name,
        color: meta.color,
        textColor: meta.textColor,
        count: entry.count,
        orderIndex: idx >= 0 ? idx : JOBS.length,
      });
    }

    items.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.orderIndex - b.orderIndex;
    });

    return items;
  }, [signups]);

  return (
    <section aria-labelledby="job-summary-heading">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/60 flex flex-wrap items-center justify-between gap-2">
          <h2 id="job-summary-heading" className="text-base sm:text-lg font-bold text-slate-900">
            Ringkasan Komposisi Job
          </h2>
          <span className="text-xs sm:text-sm font-medium text-slate-600 tabular-nums">
            {signups.length} anggota · {jobCounts.length} job
          </span>
        </div>

        {isLoading && signups.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
            <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin text-slate-400" />
            <span>Menghitung komposisi job...</span>
          </div>
        ) : jobCounts.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-slate-500">
            Belum ada data komposisi job.
          </div>
        ) : (
          <ul className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-3">
            {jobCounts.map((item) => (
              <li
                key={item.name}
                className="flex items-center justify-between gap-2 min-w-0 py-1 border-b border-slate-100"
              >
                <span
                  style={{
                    backgroundColor: item.color,
                    color: item.textColor,
                  }}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold truncate min-w-0"
                >
                  {item.name}
                </span>
                <span className="text-sm font-bold text-slate-900 tabular-nums shrink-0">
                  {item.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
