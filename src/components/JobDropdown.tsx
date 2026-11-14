import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { JOBS, type JobOption } from '../constants/jobs';

interface JobDropdownProps {
  value: string;
  onChange: (jobName: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  error?: string;
}

export function JobDropdown({
  value,
  onChange,
  onBlur,
  disabled = false,
  error,
}: JobDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const labelId = useId();
  const listboxId = useId();
  const errorId = useId();

  const selectedJob: JobOption | undefined = JOBS.find((item) => item.name === value);
  const selectedIndex = JOBS.findIndex((item) => item.name === value);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onBlur?.();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen, onBlur]);

  useEffect(() => {
    if (isOpen && activeIndex >= 0) {
      optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [isOpen, activeIndex]);

  function openDropdown(initialIndex?: number) {
    if (disabled) return;
    const fallbackIndex = selectedIndex >= 0 ? selectedIndex : 0;
    setActiveIndex(initialIndex !== undefined ? initialIndex : fallbackIndex);
    setIsOpen(true);
  }

  function closeDropdown(returnFocus: boolean) {
    setIsOpen(false);
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  }

  function selectByIndex(index: number) {
    const chosen = JOBS[index];
    if (!chosen) return;
    onChange(chosen.name);
    closeDropdown(true);
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        if (!isOpen) {
          openDropdown(selectedIndex >= 0 ? selectedIndex : 0);
        } else {
          setActiveIndex((prev) => (prev + 1) % JOBS.length);
        }
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        if (!isOpen) {
          openDropdown(selectedIndex >= 0 ? selectedIndex : JOBS.length - 1);
        } else {
          setActiveIndex((prev) => (prev <= 0 ? JOBS.length - 1 : prev - 1));
        }
        break;
      }
      case 'Home': {
        if (isOpen) {
          event.preventDefault();
          setActiveIndex(0);
        }
        break;
      }
      case 'End': {
        if (isOpen) {
          event.preventDefault();
          setActiveIndex(JOBS.length - 1);
        }
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        if (!isOpen) {
          openDropdown();
        } else if (activeIndex >= 0) {
          selectByIndex(activeIndex);
        } else {
          closeDropdown(true);
        }
        break;
      }
      case 'Escape': {
        if (isOpen) {
          event.preventDefault();
          closeDropdown(true);
          onBlur?.();
        }
        break;
      }
      case 'Tab': {
        if (isOpen) {
          setIsOpen(false);
          onBlur?.();
        }
        break;
      }
    }
  }

  const activeOptionId =
    isOpen && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  return (
    <div ref={containerRef} className="relative">
      <label
        id={labelId}
        htmlFor={`${listboxId}-trigger`}
        className="block text-sm font-semibold text-slate-800 mb-1.5"
      >
        Job
      </label>

      <button
        ref={triggerRef}
        id={`${listboxId}-trigger`}
        type="button"
        disabled={disabled}
        aria-labelledby={labelId}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={activeOptionId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onBlur={(e) => {
          if (!isOpen && !containerRef.current?.contains(e.relatedTarget as Node | null)) {
            onBlur?.();
          }
        }}
        onClick={() => {
          if (isOpen) {
            closeDropdown(false);
            onBlur?.();
          } else {
            openDropdown();
          }
        }}
        onKeyDown={handleTriggerKeyDown}
        style={
          selectedJob
            ? {
                backgroundColor: selectedJob.color,
                color: selectedJob.textColor,
                borderColor: selectedJob.color,
              }
            : undefined
        }
        className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border text-left text-base font-medium flex items-center justify-between gap-3 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3] focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed ${
          selectedJob
            ? 'shadow-xs'
            : error
              ? 'bg-white border-red-400 text-slate-500 hover:border-red-500'
              : 'bg-white border-slate-300 text-slate-500 hover:border-slate-400'
        }`}
      >
        <span className="flex items-center gap-2.5 min-w-0 truncate">
          {selectedJob ? (
            <>
              <span
                aria-hidden="true"
                className={`w-3.5 h-3.5 rounded-full shrink-0 border ${
                  selectedJob.textColor === '#FFFFFF' ? 'border-white/70' : 'border-slate-900/30'
                }`}
                style={{ backgroundColor: selectedJob.color }}
              />
              <span className="font-semibold truncate">{selectedJob.name}</span>
            </>
          ) : (
            <span>Pilih job karakter kamu</span>
          )}
        </span>

        <ChevronDown
          aria-hidden="true"
          className={`w-5 h-5 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-labelledby={labelId}
          tabIndex={-1}
          className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 max-h-72 overflow-y-auto focus:outline-none"
        >
          {JOBS.map((job, index) => {
            const isSelected = job.name === value;
            const isActive = index === activeIndex;

            return (
              <button
                key={job.name}
                ref={(el) => {
                  optionRefs.current[index] = el;
                }}
                id={`${listboxId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                tabIndex={-1}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectByIndex(index)}
                className={`w-full min-h-[44px] px-3.5 py-2 text-left text-sm flex items-center justify-between gap-3 transition-colors ${
                  isActive ? 'bg-slate-100' : 'bg-white hover:bg-slate-50'
                } ${isSelected ? 'font-semibold text-slate-900' : 'font-medium text-slate-800'}`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span
                    aria-hidden="true"
                    className="w-4 h-4 rounded-md shrink-0 border border-black/10"
                    style={{ backgroundColor: job.color }}
                  />
                  <span className="truncate">{job.name}</span>
                </span>

                {isSelected && (
                  <Check aria-hidden="true" className="w-4 h-4 text-[#3730A3] shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
