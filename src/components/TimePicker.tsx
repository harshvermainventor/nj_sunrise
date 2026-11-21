import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock, X } from 'lucide-react';
import { formatTime12h } from '../utils/crmLogic';

interface TimePickerProps {
  id?: string;
  value: string; // HH:mm 24-hour or ''
  onChange: (time24: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  ariaLabel?: string;
  compact?: boolean;
}

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES_5 = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const QUICK_SLOTS: { label: string; time24: string }[] = [
  { label: '09:30 AM', time24: '09:30' },
  { label: '11:00 AM', time24: '11:00' },
  { label: '04:00 PM', time24: '16:00' },
  { label: '06:30 PM', time24: '18:30' },
];

function parseTimeParts(time24: string): {
  hour12: number;
  minute: number;
  period: 'AM' | 'PM';
} {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time24.trim());
  if (!match) {
    return { hour12: 11, minute: 0, period: 'AM' };
  }
  const h24 = Math.min(23, Math.max(0, Number(match[1])));
  const m = Math.min(59, Math.max(0, Number(match[2])));
  const period: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { hour12, minute: m, period };
}

function buildTime24(hour12: number, minute: number, period: 'AM' | 'PM'): string {
  let h24 = hour12 % 12;
  if (period === 'PM') h24 += 12;
  return `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  id,
  value,
  onChange,
  placeholder = 'Select time',
  allowClear = false,
  ariaLabel,
  compact = false,
}) => {
  const [open, setOpen] = useState(false);

  const parsed = parseTimeParts(value);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const setHour12 = (h: number) => {
    onChange(buildTime24(h, parsed.minute, parsed.period));
  };

  const setMinute = (m: number) => {
    onChange(buildTime24(parsed.hour12, m, parsed.period));
  };

  const setPeriod = (p: 'AM' | 'PM') => {
    onChange(buildTime24(parsed.hour12, parsed.minute, p));
  };

  const displayValue = formatTime12h(value);

  return (
    <>
      <button
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-left transition-colors focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 ${
          compact ? 'px-3 py-2 text-xs min-h-[36px]' : 'px-3 py-2.5 text-sm min-h-[42px]'
        }`}
      >
        <span
          className={`font-mono-num truncate ${
            displayValue
              ? 'text-slate-900 dark:text-slate-100'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {displayValue || placeholder}
        </span>
        <Clock className="h-4 w-4 text-slate-400 shrink-0" aria-hidden="true" />
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Time selector"
              className="w-full max-w-[330px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121826] p-4 shadow-2xl space-y-3"
            >
              {/* Current Selection + AM / PM Toggle */}
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  <span className="font-mono-num text-base font-bold text-slate-900 dark:text-slate-100">
                    {displayValue || formatTime12h(buildTime24(parsed.hour12, parsed.minute, parsed.period))}
                  </span>
                </div>
                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-[#0B0F17]">
                  {(['AM', 'PM'] as const).map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setPeriod(period)}
                      aria-pressed={parsed.period === period}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                        parsed.period === period
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hour Selection Grid */}
              <div>
                <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  Hour
                </span>
                <div className="grid grid-cols-6 gap-1.5">
                  {HOURS_12.map((h) => {
                    const active = parsed.hour12 === h && Boolean(value);
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHour12(h)}
                        aria-label={`Hour ${h}`}
                        aria-pressed={active}
                        className={`h-9 rounded-lg font-mono-num text-xs font-medium transition-colors ${
                          active
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'bg-slate-50 dark:bg-[#0B0F17] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-800'
                        }`}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Minute Selection Grid */}
              <div>
                <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  Minute
                </span>
                <div className="grid grid-cols-6 gap-1.5">
                  {MINUTES_5.map((m) => {
                    const active = parsed.minute === m && Boolean(value);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMinute(m)}
                        aria-label={`Minute ${String(m).padStart(2, '0')}`}
                        aria-pressed={active}
                        className={`h-9 rounded-lg font-mono-num text-xs font-medium transition-colors ${
                          active
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'bg-slate-50 dark:bg-[#0B0F17] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-800'
                        }`}
                      >
                        :{String(m).padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Slots */}
              <div>
                <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  Quick Select
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {QUICK_SLOTS.map((slot) => (
                    <button
                      key={slot.time24}
                      type="button"
                      onClick={() => {
                        onChange(slot.time24);
                        setOpen(false);
                      }}
                      className={`py-2 px-2 rounded-lg font-mono-num text-xs font-medium border transition-colors ${
                        value === slot.time24
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                {allowClear && value ? (
                  <button
                    type="button"
                    onClick={() => {
                      onChange('');
                      setOpen(false);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    Clear
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400">Tap hour & minute</span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (!value) {
                      onChange(buildTime24(parsed.hour12, parsed.minute, parsed.period));
                    }
                    setOpen(false);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
