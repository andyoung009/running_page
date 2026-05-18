import { useState } from 'react';
import type { Activity } from '../types';
import {
  formatDistance,
  formatDuration,
  formatPace,
} from '../hooks/useActivities';

interface ActivityListProps {
  activities: Activity[];
}

type ViewMode = 'card' | 'table';
type SortKey = 'date' | 'distance' | 'pace';

export function ActivityList({ activities }: ActivityListProps) {
  const [view, setView] = useState<ViewMode>('card');
  const [sortKey, setSortKey] = useState<SortKey>('date');

  const sorted = [...activities].sort((a, b) => {
    if (sortKey === 'date')
      return (
        new Date(b.start_date_local).getTime() -
        new Date(a.start_date_local).getTime()
      );
    if (sortKey === 'distance') return b.distance - a.distance;
    return b.average_speed - a.average_speed;
  });

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">活动列表</h3>
        <div className="flex items-center gap-3">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm"
          >
            <option value="date">按日期</option>
            <option value="distance">按距离</option>
            <option value="pace">按速度</option>
          </select>
          <div className="flex gap-1">
            <button
              onClick={() => setView('card')}
              className={`rounded px-2 py-1 text-sm ${view === 'card' ? 'bg-[var(--color-all)] text-white' : 'text-[var(--color-muted)]'}`}
            >
              ▦
            </button>
            <button
              onClick={() => setView('table')}
              className={`rounded px-2 py-1 text-sm ${view === 'table' ? 'bg-[var(--color-all)] text-white' : 'text-[var(--color-muted)]'}`}
            >
              ≡
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {view === 'card' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.slice(0, 30).map((a) => (
            <ActivityCard key={a.run_id} activity={a} />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-muted)]">
                <th className="pb-2 font-medium">日期</th>
                <th className="pb-2 font-medium">类型</th>
                <th className="pb-2 font-medium">距离</th>
                <th className="pb-2 font-medium">时间</th>
                <th className="pb-2 font-medium">速度</th>
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, 50).map((a) => (
                <tr
                  key={a.run_id}
                  className="border-[var(--color-border)]/50 border-b hover:bg-[var(--color-bg)]"
                >
                  <td className="py-2">{a.start_date_local.slice(0, 10)}</td>
                  <td className="py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${a.type === 'Run' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}
                    >
                      {a.type === 'Run' ? '跑步' : '骑行'}
                    </span>
                  </td>
                  <td className="py-2 font-mono">
                    {formatDistance(a.distance)} km
                  </td>
                  <td className="py-2">{formatDuration(a.moving_time)}</td>
                  <td className="py-2 font-mono">
                    {a.type === 'Run'
                      ? formatPace(a.average_speed)
                      : `${(a.average_speed * 3.6).toFixed(1)} km/h`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ActivityCard({ activity: a }: { activity: Activity }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-[var(--color-muted)]">
          {a.start_date_local.slice(0, 10)}
        </span>
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${a.type === 'Run' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}
        >
          {a.type === 'Run' ? '🏃 跑步' : '🚴 骑行'}
        </span>
      </div>
      <p className="mb-1 font-mono text-2xl font-bold">
        {formatDistance(a.distance)}{' '}
        <span className="text-sm font-normal text-[var(--color-muted)]">
          km
        </span>
      </p>
      <div className="flex gap-3 text-xs text-[var(--color-muted)]">
        <span>{formatDuration(a.moving_time)}</span>
        <span>
          {a.type === 'Run'
            ? formatPace(a.average_speed)
            : `${(a.average_speed * 3.6).toFixed(1)} km/h`}
        </span>
      </div>
    </div>
  );
}
