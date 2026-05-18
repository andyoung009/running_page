import { useMemo, useState } from 'react';
import type { Activity, SportFilter } from '../types';
import {
  getAvailableYears,
  formatDistance,
  parseMovingTime,
  formatPace,
} from '../hooks/useActivities';
import { useLocale } from '../hooks/useLocale';

interface HeatmapPageProps {
  activities: Activity[];
  filter: SportFilter;
  onSelectActivity?: (a: Activity | null) => void;
  onBack: () => void;
}

function getColor(distance: number, max: number, filter: SportFilter): string {
  if (distance === 0) return 'var(--color-border)';
  const ratio = Math.min(distance / max, 1);
  const level = Math.ceil(ratio * 4);
  const colors: Record<string, string[]> = {
    all: ['#3b0764', '#7c3aed', '#a855f7', '#c084fc', '#e9d5ff'],
    Run: ['#431407', '#c2410c', '#f97316', '#fb923c', '#fed7aa'],
    Ride: ['#1e3a5f', '#1d4ed8', '#3b82f6', '#60a5fa', '#bfdbfe'],
    Hike: ['#14532d', '#15803d', '#22c55e', '#4ade80', '#bbf7d0'],
    Gym: ['#4a1942', '#86198f', '#c026d3', '#d946ef', '#f5d0fe'],
  };
  return colors[filter]?.[4 - level] || colors.all[0];
}

function buildYearGrid(yr: number, acts: Activity[]) {
  const yearActivities = acts.filter(
    (a) => new Date(a.start_date_local).getFullYear() === yr
  );
  const totalDist = yearActivities.reduce((s, a) => s + a.distance, 0);
  const totalTime = yearActivities.reduce(
    (s, a) => s + parseMovingTime(a.moving_time),
    0
  );
  const runs = yearActivities.filter(
    (a) => a.type === 'Run' && a.average_speed > 0
  );
  const avgPace =
    runs.length > 0
      ? runs.reduce((s, a) => s + a.average_speed, 0) / runs.length
      : 0;

  const dayMap = new Map<string, number>();
  const dayActivitiesMap = new Map<string, Activity[]>();
  for (const a of yearActivities) {
    const day = a.start_date_local.slice(0, 10);
    dayMap.set(day, (dayMap.get(day) || 0) + a.distance);
    const arr = dayActivitiesMap.get(day) || [];
    arr.push(a);
    dayActivitiesMap.set(day, arr);
  }

  const maxDist = Math.max(...dayMap.values(), 1);
  const startDate = new Date(yr, 0, 1);
  const startDay = startDate.getDay();
  const grid: { date: string; distance: number; activities: Activity[] }[][] =
    [];
  const monthPositions: { label: string; weekIdx: number }[] = [];
  let currentMonth = -1;
  const endDate = new Date(yr, 11, 31);
  const totalDays =
    Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1;

  for (let d = 0; d < totalDays; d++) {
    const date = new Date(yr, 0, 1 + d);
    const weekIdx = Math.floor((d + startDay) / 7);
    while (grid.length <= weekIdx) grid.push([]);
    const key = `${yr}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    grid[weekIdx].push({
      date: key,
      distance: dayMap.get(key) || 0,
      activities: dayActivitiesMap.get(key) || [],
    });
    if (date.getMonth() !== currentMonth) {
      currentMonth = date.getMonth();
      monthPositions.push({ label: `${currentMonth + 1}`, weekIdx });
    }
  }

  // Monthly breakdown
  const monthlyData = Array.from({ length: 12 }, (_, m) => {
    const monthActs = yearActivities.filter(
      (a) => new Date(a.start_date_local).getMonth() === m
    );
    return {
      month: m,
      distance: monthActs.reduce((s, a) => s + a.distance, 0),
      count: monthActs.length,
    };
  });

  return {
    grid,
    max: maxDist,
    monthPositions,
    monthlyData,
    stats: {
      count: yearActivities.length,
      distance: totalDist,
      time: totalTime,
      pace: avgPace,
    },
    yearActivities,
  };
}

// Monthly expanded view: 12 mini calendars
function MonthGrid({
  yr,
  month,
  acts,
  max,
  filter,
  onSelectActivity,
}: {
  yr: number;
  month: number;
  acts: Activity[];
  max: number;
  filter: SportFilter;
  onSelectActivity?: (a: Activity | null) => void;
}) {
  const { locale } = useLocale();
  const firstDay = new Date(yr, month, 1).getDay();
  const daysInMonth = new Date(yr, month + 1, 0).getDate();

  const dayMap = new Map<
    number,
    { distance: number; activities: Activity[] }
  >();
  for (const a of acts) {
    const d = new Date(a.start_date_local);
    if (d.getFullYear() === yr && d.getMonth() === month) {
      const day = d.getDate();
      const prev = dayMap.get(day) || { distance: 0, activities: [] };
      dayMap.set(day, {
        distance: prev.distance + a.distance,
        activities: [...prev.activities, a],
      });
    }
  }

  const monthNames =
    locale === 'zh'
      ? [
          '1月',
          '2月',
          '3月',
          '4月',
          '5月',
          '6月',
          '7月',
          '8月',
          '9月',
          '10月',
          '11月',
          '12月',
        ]
      : [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ];

  const monthDist = Array.from(dayMap.values()).reduce(
    (s, v) => s + v.distance,
    0
  );
  const monthCount = Array.from(dayMap.values()).reduce(
    (s, v) => s + v.activities.length,
    0
  );

  const cells: (number | null)[] = [...Array(firstDay).fill(null)];
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="min-w-0 rounded-lg bg-[var(--color-bg)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold">{monthNames[month]}</span>
        <span className="text-[10px] text-[var(--color-muted)]">
          {monthCount > 0 ? `${formatDistance(monthDist)}km` : ''}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-[2px]">
        {cells.map((day, i) => {
          const info = day ? dayMap.get(day) : null;
          const color = info
            ? getColor(info.distance, max, filter)
            : 'transparent';
          return (
            <div
              key={i}
              onClick={() =>
                info?.activities[0] && onSelectActivity?.(info.activities[0])
              }
              className={`flex aspect-square items-center justify-center rounded-sm text-[8px] leading-none transition-all ${
                day
                  ? info
                    ? 'cursor-pointer hover:ring-1 hover:ring-[var(--color-muted)]'
                    : 'text-[var(--color-muted)]'
                  : ''
              }`}
              style={{
                backgroundColor: info
                  ? color
                  : day
                    ? 'var(--color-border)'
                    : 'transparent',
                opacity: day ? 1 : 0,
              }}
              title={
                info
                  ? `${yr}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}: ${(info.distance / 1000).toFixed(1)}km`
                  : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}

export function HeatmapPage({
  activities,
  filter,
  onSelectActivity,
  onBack,
}: HeatmapPageProps) {
  const { locale } = useLocale();
  const allYears = getAvailableYears(activities);
  const dayLabels =
    locale === 'zh'
      ? ['', '一', '', '三', '', '五', '']
      : ['', 'M', '', 'W', '', 'F', ''];
  const [expandedYear, setExpandedYear] = useState<number | null>(null);

  const yearData = useMemo(() => {
    return allYears.map((yr) => ({
      year: yr,
      ...buildYearGrid(yr, activities),
    }));
  }, [activities, filter, allYears]);

  const totalDist = activities.reduce((s, a) => s + a.distance, 0);
  const totalTime = activities.reduce(
    (s, a) => s + parseMovingTime(a.moving_time),
    0
  );
  const allRuns = activities.filter(
    (a) => a.type === 'Run' && a.average_speed > 0
  );
  const avgPace =
    allRuns.length > 0
      ? allRuns.reduce((s, a) => s + a.average_speed, 0) / allRuns.length
      : 0;

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6">
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes expandDown {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Page header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          {locale === 'zh' ? '返回' : 'Back'}
        </button>
        <h1 className="text-xl font-bold">
          {locale === 'zh'
            ? '活动热力图 · 全览'
            : 'Activity Heatmap · All Years'}
        </h1>
      </div>

      {/* All-time summary */}
      <div className="mb-6 grid grid-cols-4 gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 text-center text-sm">
        <div>
          <p className="mb-1 text-xs text-[var(--color-muted)]">
            {locale === 'zh' ? '活动总数' : 'Total Activities'}
          </p>
          <p className="font-mono text-lg font-bold">{activities.length}</p>
        </div>
        <div>
          <p className="mb-1 text-xs text-[var(--color-muted)]">
            {locale === 'zh' ? '总距离' : 'Total Distance'}
          </p>
          <p className="font-mono text-lg font-bold">
            {formatDistance(totalDist)} km
          </p>
        </div>
        <div>
          <p className="mb-1 text-xs text-[var(--color-muted)]">
            {locale === 'zh' ? '总时间' : 'Total Time'}
          </p>
          <p className="font-mono text-lg font-bold">
            {(totalTime / 3600).toFixed(0)}h
          </p>
        </div>
        <div>
          <p className="mb-1 text-xs text-[var(--color-muted)]">
            {locale === 'zh' ? '均配速' : 'Avg Pace'}
          </p>
          <p className="font-mono text-lg font-bold">
            {avgPace > 0 ? formatPace(avgPace) : '--'}
          </p>
        </div>
      </div>

      {/* Per-year heatmaps */}
      <div className="space-y-4">
        {yearData.map(
          (
            {
              year: yr,
              grid,
              max,
              monthPositions,
              monthlyData,
              stats,
              yearActivities,
            },
            idx
          ) => {
            const isExpanded = expandedYear === yr;
            const maxMonthDist = Math.max(
              ...monthlyData.map((m) => m.distance),
              1
            );

            return (
              <div
                key={yr}
                className="animate-[fadeSlideIn_0.3s_ease-out_both] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                {/* Year header — clickable */}
                <div
                  className="hover:bg-[var(--color-accent)]/5 flex cursor-pointer items-center justify-between px-5 pb-3 pt-4 transition-colors"
                  onClick={() => setExpandedYear(isExpanded ? null : yr)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold">{yr}</span>
                    <svg
                      className={`h-4 w-4 text-[var(--color-muted)] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                  <span className="flex items-center gap-4 font-mono text-xs text-[var(--color-muted)]">
                    <span className="flex items-center gap-1">
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      {stats.count} {locale === 'zh' ? '次' : 'acts'}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        />
                      </svg>
                      {formatDistance(stats.distance)} km
                    </span>
                    <span className="flex items-center gap-1">
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {(stats.time / 3600).toFixed(0)}h
                    </span>
                    {filter === 'Run' && stats.pace > 0 && (
                      <span className="flex items-center gap-1">
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                          />
                        </svg>
                        {formatPace(stats.pace)}
                      </span>
                    )}
                  </span>
                </div>

                {/* Heatmap + monthly bar — always visible */}
                {!isExpanded && (
                  <div className="grid grid-cols-1 items-center gap-4 px-5 pb-4 xl:grid-cols-[auto_1fr]">
                    {/* Heatmap card */}
                    <div className="overflow-x-auto">
                      <div className="mb-1 ml-5 flex">
                        {monthPositions.map((m, i) => {
                          const nextStart =
                            monthPositions[i + 1]?.weekIdx ?? grid.length;
                          const span = nextStart - m.weekIdx;
                          return (
                            <div
                              key={i}
                              className="text-xs text-[var(--color-muted)]"
                              style={{
                                width: `${span * 14}px`,
                                minWidth: `${span * 14}px`,
                              }}
                            >
                              {locale === 'zh'
                                ? `${m.label}月`
                                : [
                                    'Jan',
                                    'Feb',
                                    'Mar',
                                    'Apr',
                                    'May',
                                    'Jun',
                                    'Jul',
                                    'Aug',
                                    'Sep',
                                    'Oct',
                                    'Nov',
                                    'Dec',
                                  ][Number(m.label) - 1]}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-[3px]">
                        <div className="mr-1 flex flex-col gap-[3px]">
                          {dayLabels.map((d, i) => (
                            <div
                              key={i}
                              className="flex h-3 w-3 items-center justify-center text-[10px] text-[var(--color-muted)]"
                            >
                              {d}
                            </div>
                          ))}
                        </div>
                        {grid.map((week, wi) => (
                          <div key={wi} className="flex flex-col gap-[3px]">
                            {week.map((day, di) => (
                              <div
                                key={di}
                                className="h-3 w-3 cursor-pointer rounded-sm transition-colors hover:ring-1 hover:ring-[var(--color-muted)]"
                                style={{
                                  backgroundColor: getColor(
                                    day.distance,
                                    max,
                                    filter
                                  ),
                                }}
                                title={`${day.date}: ${(day.distance / 1000).toFixed(1)} km`}
                                onClick={() => {
                                  if (day.activities.length > 0)
                                    onSelectActivity?.(day.activities[0]);
                                }}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Monthly bar chart card — hidden on narrow screens */}
                    <div className="hidden w-full rounded-lg bg-[var(--color-bg)] px-3 pb-2 pt-3 xl:block">
                      <div
                        className="flex items-end gap-[3px]"
                        style={{ height: '72px' }}
                      >
                        {monthlyData.map((m) => {
                          const barH =
                            m.distance > 0
                              ? Math.max(
                                  Math.round((m.distance / maxMonthDist) * 64),
                                  4
                                )
                              : 0;
                          return (
                            <div
                              key={m.month}
                              className="group relative flex flex-1 items-end"
                            >
                              {m.distance > 0 && (
                                <div
                                  className="bg-[var(--color-accent)]/50 w-full rounded-t-sm transition-colors group-hover:bg-[var(--color-accent)]"
                                  style={{ height: `${barH}px` }}
                                />
                              )}
                              {m.distance > 0 && (
                                <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] text-[var(--color-accent)] opacity-0 transition-opacity group-hover:opacity-100">
                                  {formatDistance(m.distance)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-1 flex gap-[3px]">
                        {monthlyData.map((m) => (
                          <div
                            key={m.month}
                            className="flex-1 text-center text-[9px] text-[var(--color-muted)]"
                          >
                            {
                              [
                                'J',
                                'F',
                                'M',
                                'A',
                                'M',
                                'J',
                                'J',
                                'A',
                                'S',
                                'O',
                                'N',
                                'D',
                              ][m.month]
                            }
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Expanded: 12 monthly mini-calendars */}
                {isExpanded && (
                  <div className="animate-[expandDown_0.2s_ease-out_both] px-5 pb-5">
                    <div className="grid grid-cols-6 gap-3">
                      {Array.from({ length: 12 }, (_, m) => (
                        <MonthGrid
                          key={m}
                          yr={yr}
                          month={m}
                          acts={yearActivities}
                          max={max}
                          filter={filter}
                          onSelectActivity={onSelectActivity}
                        />
                      ))}
                    </div>
                    {/* Month distance bars in expanded view */}
                    <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                      <div className="flex h-16 items-end gap-1">
                        {monthlyData.map((m) => {
                          const heightPct =
                            m.distance > 0
                              ? Math.max((m.distance / maxMonthDist) * 100, 4)
                              : 0;
                          return (
                            <div
                              key={m.month}
                              className="group flex flex-1 flex-col items-center gap-1"
                            >
                              <div
                                className="flex w-full flex-col items-center justify-end"
                                style={{ height: '44px' }}
                              >
                                {m.count > 0 && (
                                  <span className="mb-0.5 text-[9px] text-[var(--color-muted)] opacity-0 transition-opacity group-hover:opacity-100">
                                    {formatDistance(m.distance)}
                                  </span>
                                )}
                                <div
                                  className="bg-[var(--color-accent)]/60 w-full rounded-t-sm transition-colors group-hover:bg-[var(--color-accent)]"
                                  style={{ height: `${heightPct}%` }}
                                />
                              </div>
                              <span className="text-[9px] text-[var(--color-muted)]">
                                {locale === 'zh'
                                  ? `${m.month + 1}月`
                                  : [
                                      'Jan',
                                      'Feb',
                                      'Mar',
                                      'Apr',
                                      'May',
                                      'Jun',
                                      'Jul',
                                      'Aug',
                                      'Sep',
                                      'Oct',
                                      'Nov',
                                      'Dec',
                                    ][m.month]}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}
