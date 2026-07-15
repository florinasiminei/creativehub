'use client';

import { useMemo } from 'react';
import { toDateInputValue, formatRoDate } from '@/lib/calendar/shared';
import type { CalendarAvailabilityDay } from '@/lib/calendar/types';

type Props = {
  days: CalendarAvailabilityDay[];
  selectedDate: string;
  minDate: string;
  onDateSelect: (date: string) => void;
};

const DAY_HEADERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default function PublicAvailabilityCalendar({ days, selectedDate, minDate, onDateSelect }: Props) {
  const { weeks, startOffset } = useMemo(() => {
    if (days.length === 0) return { weeks: [], startOffset: 0 };
    const firstDate = new Date(days[0].date + 'T00:00:00');
    const startDow = (firstDate.getDay() + 6) % 7;
    const padded: (CalendarAvailabilityDay | null)[] = Array(startDow).fill(null).concat(days);
    while (padded.length % 7 !== 0) padded.push(null);
    const result: (CalendarAvailabilityDay | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      result.push(padded.slice(i, i + 7));
    }
    return { weeks: result, startOffset: startDow };
  }, [days]);

  const monthLabel = useMemo(() => {
    if (days.length === 0) return '';
    const first = new Date(days[0].date + 'T00:00:00');
    return first.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
  }, [days]);

  const todayStr = toDateInputValue(new Date());

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {monthLabel}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {DAY_HEADERS.map((d, i) => (
          <div key={`${d}-${i}`} className="py-1 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
            {d}
          </div>
        ))}
        {weeks.map((week, wi) =>
          week.map((day, di) => {
            if (!day) {
              return <div key={`empty-${wi}-${di}`} className="aspect-square" />;
            }
            const dayNum = day.date.split('-')[2];
            const isPast = day.date < minDate;
            const isToday = day.date === todayStr;
            const isSelected = day.date === selectedDate;
            const isUnavailable = !day.available || isPast;
            const isWeekend = (() => {
              const d = new Date(day.date + 'T00:00:00');
              return d.getDay() === 0 || d.getDay() === 6;
            })();

            return (
              <button
                key={day.date}
                type="button"
                disabled={isUnavailable}
                onClick={() => onDateSelect(day.date)}
                title={day.reason || undefined}
                className={`aspect-square rounded-lg p-1 text-xs font-medium transition ${
                  isSelected
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                    : isUnavailable
                      ? isPast
                        ? 'cursor-not-allowed bg-gray-100 text-gray-300 dark:bg-zinc-800 dark:text-zinc-600'
                        : 'cursor-not-allowed bg-red-50 text-red-400 dark:bg-red-900/20 dark:text-red-400'
                      : isToday
                        ? 'ring-2 ring-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                        : isWeekend
                          ? 'bg-gray-50 text-gray-600 hover:bg-emerald-50 dark:bg-zinc-800/50 dark:text-gray-300 dark:hover:bg-emerald-950/30'
                          : 'bg-white text-gray-700 hover:bg-emerald-50 dark:bg-zinc-900 dark:text-gray-200 dark:hover:bg-emerald-950/30'
                }`}
              >
                <div className="flex h-full flex-col items-center justify-center">
                  <span>{dayNum}</span>
                  {day.request_count > 0 && !isUnavailable && (
                    <span className="mt-0.5 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-blue-500 px-0.5 text-[8px] font-bold text-white">
                      {day.request_count}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
      {selectedDate && (() => {
        const sel = days.find(d => d.date === selectedDate);
        if (sel && !sel.available) {
          return (
            <p className="text-sm text-red-600 dark:text-red-400">
              {sel.reason || 'Data indisponibila.'}
            </p>
          );
        }
        return null;
      })()}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-white border border-gray-200 dark:bg-zinc-900" />
          <span>Disponibil</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-red-50 dark:bg-red-900/20" />
          <span>Indisponibil</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-gray-100 dark:bg-zinc-800" />
          <span>Trecut</span>
        </div>
      </div>
    </div>
  );
}
