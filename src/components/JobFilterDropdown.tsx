import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown, Filter, Search, X } from 'lucide-react';
import { getJobByName, JOBS } from '../constants/jobs';
import type { GuildLeagueSignup } from '../types/signup';

export type JobFilterValue =
  | { kind: 'all' }
  | { kind: 'group'; group: string }
  | { kind: 'job'; jobName: string };

interface JobFilterOption {
  id: string;
  filter: JobFilterValue;
  label: string;
  groupLabel: string | null;
  color?: string;
  count: number;
}

interface JobFilterDropdownProps {
  signups: GuildLeagueSignup[];
  value: JobFilterValue;
  onChange: (nextValue: JobFilterValue) => void;
}

const CLASS_ORDER = [
  'Swordsman',
  'Mage',
  'Archer',
  'Acolyte',
  'Thief',
  'Merchant',
  'Gunslinger',
  'Druid',
] as const;

export function isSameJobFilter(a: JobFilterValue, b: JobFilterValue): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'all' && b.kind === 'all') return true;
  if (a.kind === 'group' && b.kind === 'group') return a.group === b.group;
  if (a.kind === 'job' && b.kind === 'job') return a.jobName === b.jobName;
  return false;
}

export function getJobFilterLabel(value: JobFilterValue): string {
  if (value.kind === 'all') return 'Semua Job / Class';
  if (value.kind === 'group') return `Semua ${value.group}`;
  return value.jobName;
}

export function JobFilterDropdown({ signups, value, onChange }: JobFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const listboxId = useId();

  const allOptions = useMemo<JobFilterOption[]>(() => {
    const jobCounts = new Map<string, number>();
    const groupCounts = new Map<string, number>();
    const unknownJobs = new Map<string, number>();

    for (const member of signups) {
      const meta = getJobByName(member.job);
      if (meta.group === 'Lainnya') {
        unknownJobs.set(member.job, (unknownJobs.get(member.job) ?? 0) + 1);
      } else {
        jobCounts.set(meta.name, (jobCounts.get(meta.name) ?? 0) + 1);
        groupCounts.set(meta.group, (groupCounts.get(meta.group) ?? 0) + 1);
      }
    }

    const options: JobFilterOption[] = [
      {
        id: 'all',
        filter: { kind: 'all' },
        label: 'Semua Job / Class',
        groupLabel: null,
        count: signups.length,
      },
    ];

    for (const groupName of CLASS_ORDER) {
      options.push({
        id: `group:${groupName}`,
        filter: { kind: 'group', group: groupName },
        label: `Semua ${groupName}`,
        groupLabel: groupName,
        count: groupCounts.get(groupName) ?? 0,
      });

      const groupJobs = JOBS.filter((job) => job.group === groupName);
      for (const job of groupJobs) {
        options.push({
          id: `job:${job.name}`,
          filter: { kind: 'job', jobName: job.name },
          label: job.name,
          groupLabel: groupName,
          color: job.color,
          count: jobCounts.get(job.name) ?? 0,
        });
      }
    }

    if (unknownJobs.size > 0) {
      const totalOther = Array.from(unknownJobs.values()).reduce((sum, n) => sum + n, 0);
      options.push({
        id: 'group:Lainnya',
        filter: { kind: 'group', group: 'Lainnya' },
        label: 'Semua Lainnya',
        groupLabel: 'Lainnya',
        count: totalOther,
      });
      for (const [jobName, count] of unknownJobs.entries()) {
        options.push({
          id: `job:${jobName}`,
          filter: { kind: 'job', jobName },
          label: jobName,
          groupLabel: 'Lainnya',
          color: '#E2E8F0',
          count,
        });
      }
    }

    return options;
  }, [signups]);

  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return allOptions;
    return allOptions.filter(
      (opt) =>
        opt.filter.kind === 'all' ||
        opt.label.toLowerCase().includes(query) ||
        (opt.groupLabel?.toLowerCase().includes(query) ?? false),
    );
  }, [allOptions, searchQuery]);

  const selectedOption = allOptions.find((opt) => isSameJobFilter(opt.filter, value));
  const isFiltered = value.kind !== 'all';

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeIndex >= 0) {
      optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [isOpen, activeIndex]);

  function openDropdown() {
    setSearchQuery('');
    const idx = allOptions.findIndex((opt) => isSameJobFilter(opt.filter, value));
    setActiveIndex(idx >= 0 ? idx : 0);
    setIsOpen(true);
  }

  function closeDropdown(returnFocus: boolean) {
    setIsOpen(false);
    setSearchQuery('');
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  }

  function selectOption(option: JobFilterOption) {
    onChange(option.filter);
    closeDropdown(true);
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement | HTMLInputElement>,
    allowSpaceSelect: boolean,
  ) {
    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        if (!isOpen) {
          openDropdown();
        } else if (filteredOptions.length > 0) {
          setActiveIndex((prev) => (prev + 1) % filteredOptions.length);
        }
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        if (!isOpen) {
          openDropdown();
        } else if (filteredOptions.length > 0) {
          setActiveIndex((prev) => (prev <= 0 ? filteredOptions.length - 1 : prev - 1));
        }
        break;
      }
      case 'Enter': {
        event.preventDefault();
        if (!isOpen) {
          openDropdown();
        } else if (activeIndex >= 0 && filteredOptions[activeIndex]) {
          selectOption(filteredOptions[activeIndex]);
        } else if (filteredOptions.length === 1 && filteredOptions[0]) {
          selectOption(filteredOptions[0]);
        } else {
          closeDropdown(true);
        }
        break;
      }
      case ' ': {
        if (!allowSpaceSelect) return;
        event.preventDefault();
        if (!isOpen) {
          openDropdown();
        } else if (activeIndex >= 0 && filteredOptions[activeIndex]) {
          selectOption(filteredOptions[activeIndex]);
        } else {
          closeDropdown(true);
        }
        break;
      }
      case 'Escape': {
        if (isOpen) {
          event.preventDefault();
          closeDropdown(true);
        }
        break;
      }
      case 'Tab': {
        if (isOpen && event.currentTarget === searchInputRef.current && event.shiftKey) {
          return;
        }
        if (isOpen && event.currentTarget === triggerRef.current && !event.shiftKey) {
          return;
        }
        if (isOpen) {
          setIsOpen(false);
          setSearchQuery('');
        }
        break;
      }
    }
  }

  const activeOptionId =
    isOpen && activeIndex >= 0 && filteredOptions[activeIndex]
      ? `${listboxId}-option-${activeIndex}`
      : undefined;

  return (
    <div ref={containerRef} className="relative sm:w-64 shrink-0">
      <div className="flex items-center gap-1.5">
        <button
          ref={triggerRef}
          type="button"
          aria-label="Filter berdasarkan Job atau Class"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
          onClick={() => {
            if (isOpen) {
              closeDropdown(false);
            } else {
              openDropdown();
            }
          }}
          onKeyDown={(e) => handleKeyDown(e, true)}
          className={`flex-1 min-w-0 min-h-[44px] px-3.5 py-2 rounded-xl border text-left text-sm sm:text-base font-medium flex items-center justify-between gap-2 shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] focus-visible:ring-offset-2 ${
            isFiltered
              ? 'border-[#3730A3]/50 bg-indigo-50/70 text-[#3730A3] font-semibold'
              : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
          }`}
        >
          <span className="flex items-center gap-2 min-w-0">
            {selectedOption?.color ? (
              <span
                aria-hidden="true"
                className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/15"
                style={{ backgroundColor: selectedOption.color }}
              />
            ) : (
              <Filter aria-hidden="true" className="w-4 h-4 shrink-0 opacity-75" />
            )}
            <span className="truncate">{getJobFilterLabel(value)}</span>
          </span>

          <ChevronDown
            aria-hidden="true"
            className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isFiltered && (
          <button
            type="button"
            onClick={() => onChange({ kind: 'all' })}
            aria-label="Reset filter job"
            title="Reset filter job"
            className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-300 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 flex items-center justify-center shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3]"
          >
            <X aria-hidden="true" className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-30 left-0 right-0 sm:left-auto sm:w-72 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search
                aria-hidden="true"
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={(e) => handleKeyDown(e, false)}
                placeholder="Cari job atau class..."
                aria-label="Cari job atau class untuk filter"
                className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3]"
              />
            </div>
          </div>

          <div
            id={listboxId}
            role="listbox"
            aria-label="Pilih filter Job atau Class"
            tabIndex={-1}
            className="py-1.5 max-h-72 overflow-y-auto focus:outline-none"
          >
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                Job atau Class tidak ditemukan.
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = isSameJobFilter(option.filter, value);
                const isActive = index === activeIndex;
                const prevGroup = index > 0 ? filteredOptions[index - 1]?.groupLabel : null;
                const showGroupHeader =
                  option.groupLabel !== null && option.groupLabel !== prevGroup;

                return (
                  <div key={option.id} role="none">
                    {showGroupHeader && (
                      <div
                        role="presentation"
                        className="px-3.5 pt-2 pb-1 text-xs font-semibold text-slate-400 border-t border-slate-100 mt-1"
                      >
                        Class {option.groupLabel}
                      </div>
                    )}
                    <button
                      ref={(el) => {
                        optionRefs.current[index] = el;
                      }}
                      id={`${listboxId}-option-${index}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={-1}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => selectOption(option)}
                      className={`w-full min-h-[44px] px-3.5 py-2 text-left text-sm flex items-center justify-between gap-2.5 transition-colors ${
                        isActive ? 'bg-slate-100' : 'bg-white hover:bg-slate-50'
                      } ${
                        isSelected
                          ? 'font-semibold text-[#3730A3]'
                          : option.filter.kind === 'group'
                            ? 'font-semibold text-slate-900'
                            : 'font-medium text-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        {option.color ? (
                          <span
                            aria-hidden="true"
                            className="w-3.5 h-3.5 rounded-md shrink-0 border border-black/10"
                            style={{ backgroundColor: option.color }}
                          />
                        ) : (
                          <Filter aria-hidden="true" className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        )}
                        <span className="truncate">{option.label}</span>
                      </span>

                      <span className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-xs tabular-nums ${
                            option.count > 0 ? 'text-slate-600 font-semibold' : 'text-slate-400'
                          }`}
                        >
                          {option.count}
                        </span>
                        {isSelected && (
                          <Check aria-hidden="true" className="w-4 h-4 text-[#3730A3]" />
                        )}
                      </span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
