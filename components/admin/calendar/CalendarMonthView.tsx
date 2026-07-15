'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  buildCalendarMonth,
  buildCalendarWeek,
  fetchBookingRequests,
  fetchCalendarBlocks,
  fetchCalendarSettings as fetchCalendarSettingsClient,
  fetchCalendarRules,
  getMonthLabel,
} from '@/lib/calendar/client';
import type { BookingRequest, CalendarBlock, CalendarDay, CalendarRule, CalendarSettings } from '@/lib/calendar/types';

type Props = {
  onDateClick?: (dateStr: string) => void;
  selectedDate?: string | null;
};

type ViewMode = 'month' | 'week';

export default function CalendarMonthView({ onDateClick, selectedDate }: Props) {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);
  const [settings, setSettings] = useState<CalendarSettings | null>(null);
  const [rules, setRules] = useState<CalendarRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [requestsData, blocksData, settingsData, rulesData] = await Promise.all([
        fetchBookingRequests(),
        fetchCalendarBlocks(),
        fetchCalendarSettingsClient(),
        fetchCalendarRules(),
      ]);
      setRequests(requestsData);
      setBlocks(blocksData);
      setSettings(settingsData);
      setRules(rulesData);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Nu am putut încărca calendarul.');
    } finally {
      setLoading(false);
    }
  };

  const monthCalendar = useMemo(
    () => buildCalendarMonth(currentYear, currentMonth, requests, blocks),
    [currentYear, currentMonth, requests, blocks]
  );
  const weekDays = useMemo(
    () => buildCalendarWeek(selectedDate ?? null, requests, blocks),
    [selectedDate, requests, blocks]
  );
  const visibleDays = viewMode === 'month' ? monthCalendar.days : weekDays;
  const monthLabel = getMonthLabel(currentYear, currentMonth);

  const enrichedDays = useMemo(() => {
    if (!settings) return visibleDays;
    return visibleDays.map(day => {
      const isAvailableDay = settings.available_days.includes(day.dayName);
      const isWeekend = day.dayName === 'Saturday' || day.dayName === 'Sunday';
      const applicableRule = findApplicableRule(day, rules);
      const weekendBlocked = applicableRule ? !applicableRule.allow_weekends : isWeekend;
      const dayUnavailable = !isAvailableDay || weekendBlocked;
      return { ...day, dayUnavailable };
    });
  }, [visibleDays, settings, rules]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{viewMode === 'month' ? monthLabel : 'Săptămâna selectată'}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex rounded-lg border border-gray-200 p-1 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`rounded-md px-3 py-1.5 text-sm ${viewMode === 'month' ? 'bg-emerald-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
            >
              Lunar
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`rounded-md px-3 py-1.5 text-sm ${viewMode === 'week' ? 'bg-emerald-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
            >
              Săptămânal
            </button>
          </div>
          <button
            onClick={handlePrevMonth}
            className="rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Luna trecută
          </button>
          <button
            onClick={handleNextMonth}
            className="rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Luna următoare
          </button>
        </div>
      </div>

      {loading && <div className="py-12 text-center">Se încarcă...</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      {!loading && !error && (
        <div className="grid grid-cols-7 gap-1">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => (
            <div key={`${day}-${index}`} className="py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">
              {day}
            </div>
          ))}

          {enrichedDays.map((day) => (
            <CalendarDayButton
              key={day.date}
              day={day}
              selected={day.date === selectedDate}
              onDateClick={onDateClick}
              muted={viewMode === 'month' && !day.isCurrentMonth}
            />
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3 border-t border-gray-200 pt-4 text-xs dark:border-zinc-800">
        <Legend color="bg-gray-300" label="Trecut" />
        <Legend ring label="Azi" />
        <Legend color="bg-blue-500" label="Cereri" />
        <Legend color="bg-emerald-500" label="Confirmat" />
        <Legend color="bg-red-100" label="Blocat" />
        <Legend color="bg-yellow-100" label="Indisponibil (setari)" />
      </div>
    </div>
  );
}

function findApplicableRule(day: CalendarDay, rules: CalendarRule[]): CalendarRule | null {
  const matchingRules = rules.filter(r =>
    r.active && day.dayName === day.dayName
  );
  return matchingRules.length > 0 ? matchingRules[0] : null;
}

type EnrichedDay = CalendarDay & { dayUnavailable?: boolean };

function CalendarDayButton({
  day,
  selected,
  muted,
  onDateClick,
}: {
  day: EnrichedDay;
  selected: boolean;
  muted: boolean;
  onDateClick?: (dateStr: string) => void;
}) {
  const isDisabled = day.isBlocked || day.isPast || day.dayUnavailable;
  return (
    <button
      type="button"
      onClick={() => !isDisabled && onDateClick?.(day.date)}
      disabled={isDisabled}
      className={`aspect-square rounded-lg p-1 text-xs font-medium transition ${
        muted ? 'bg-gray-50 text-gray-300 dark:bg-zinc-800/50 dark:text-zinc-600' :
        day.isBlocked ? 'cursor-not-allowed bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
        day.dayUnavailable ? 'cursor-not-allowed bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400' :
        day.isPast ? 'cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-500' :
        selected ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' :
        day.isToday ? 'ring-2 ring-emerald-300' :
        'hover:bg-gray-100 dark:hover:bg-zinc-800'
      }`}
    >
      <div className="flex h-full flex-col items-center justify-center gap-0.5">
        <span>{day.date.split('-')[2]}</span>
        <div className="flex gap-1">
          {day.requestCount > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white">
              {day.requestCount}
            </span>
          )}
          {day.bookingCount > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
              {day.bookingCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function Legend({ color, label, ring = false }: { color?: string; label: string; ring?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-3 w-3 rounded ${color || ''} ${ring ? 'ring-2 ring-emerald-400' : ''}`}></div>
      <span>{label}</span>
    </div>
  );
}
