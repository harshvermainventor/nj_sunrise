import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatIsoDateDisplay, getTodayIsoDate } from '../utils/crmLogic';

interface CalendarDatePickerProps {
  id?: string;
  value: string; // YYYY-MM-DD or ''
  onChange: (isoDate: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  hasError?: boolean;
  ariaLabel?: string;
  compact?: boolean;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const FULL_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function parseIsoParts(iso: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export const CalendarDatePicker: React.FC<CalendarDatePickerProps> = ({
  id,
  value,
  onChange,
  placeholder = 'Select date',
  allowClear = false,
  hasError = false,
  ariaLabel,
  compact = false,
}) => {
  const [open, setOpen] = useState(false);

  const initialParts = useMemo(() => {
    const parsed = parseIsoParts(value);
    if (parsed) return { year: parsed.year, month: parsed.month };
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }, [value]);

  const [viewYear, setViewYear] = useState(initialParts.year);
  const [viewMonth, setViewMonth] = useState(initialParts.month);

  useEffect(() => {
    if (open) {
      const parsed = parseIsoParts(value);
      if (parsed) {
        setViewYear(parsed.year);
        setViewMonth(parsed.month);
      } else {
        const now = new Date();
        setViewYear(now.getFullYear());
        setViewMonth(now.getMonth());
      }
    }
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const todayIso = getTodayIsoDate();
  const tomorrowIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return getTodayIsoDate(d);
  }, []);

  const daysGrid = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: { iso: string; label: number; inMonth: boolean }[] = [];

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      cells.push({
        iso: toIsoDate(prevYear, prevMonth, dayNum),
        label: dayNum,
        inMonth: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        iso: toIsoDate(viewYear, viewMonth, d),
        label: d,
        inMonth: true,
      });
    }

    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      cells.push({
        iso: toIsoDate(nextYear, nextMonth, d),
        label: d,
        inMonth: false,
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const stepMonth = (delta: number) => {
    let nextMonth = viewMonth + delta;
    let nextYear = viewYear;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    } else if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    setViewMonth(nextMonth);
    setViewYear(nextYear);
  };

  const selectDate = (iso: string) => {
    onChange(iso);
    setOpen(false);
  };

  const displayValue = formatIsoDateDisplay(value);

  return (
    <>
      <button
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border bg-white dark:bg-[#0B0F17] text-left transition-colors focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 ${
          compact ? 'px-3 py-2 text-xs min-h-[36px]' : 'px-3 py-2.5 text-sm min-h-[42px]'
        } ${
          hasError
            ? 'border-red-500 dark:border-red-500'
            : 'border-slate-200 dark:border-slate-700'
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
        <Calendar className="h-4 w-4 text-slate-400 shrink-0" aria-hidden="true" />
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
              aria-label="Calendar date picker"
              className="w-full max-w-[330px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121826] p-4 shadow-2xl"
            >
              {/* Month / Year Header */}
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() => stepMonth(-1)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>

                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <span>{FULL_MONTHS[viewMonth]}</span>
                  <span className="font-mono-num">{viewYear}</span>
                </div>

                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() => stepMonth(1)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 pt-3 pb-1.5 text-center">
                {WEEKDAYS.map((wd) => (
                  <span
                    key={wd}
                    className="text-[11px] font-medium text-slate-400 dark:text-slate-500"
                  >
                    {wd}
                  </span>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {daysGrid.map((cell) => {
                  const isSelected = value === cell.iso;
                  const isToday = todayIso === cell.iso;
                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      onClick={() => selectDate(cell.iso)}
                      aria-label={formatIsoDateDisplay(cell.iso)}
                      aria-pressed={isSelected}
                      className={`h-9 w-full rounded-lg text-xs font-mono-num transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white font-semibold'
                          : isToday
                          ? 'border border-blue-500 text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/40'
                          : cell.inMonth
                          ? 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          : 'text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      {cell.label}
                    </button>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => selectDate(todayIso)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => selectDate(tomorrowIso)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Tomorrow
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  {allowClear && value && (
                    <button
                      type="button"
                      onClick={() => selectDate('')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
