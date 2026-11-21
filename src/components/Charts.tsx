import React from 'react';
import { BudgetBucket, MonthlyTrendPoint, StatusCount } from '../utils/crmLogic';

export const MonthlyTrendsChart: React.FC<{ data: MonthlyTrendPoint[] }> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400">
        Monthly trends will appear once visits are logged.
      </div>
    );
  }

  const maxVal = Math.max(1, ...data.map((d) => Math.max(d.visitors, d.completedVisits)));
  const chartHeight = 160;
  const leftPad = 24;
  const chartWidth = Math.max(340, data.length * 80 + leftPad);
  const plotWidth = chartWidth - leftPad;
  const barWidth = 20;

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[280px]">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight + 36}`}
          className="w-full h-48 overflow-visible"
          role="img"
          aria-label="Monthly visitor and completed visit trends"
        >
          {[0, 0.5, 1].map((step) => {
            const y = chartHeight - step * (chartHeight - 18) + 8;
            const tickVal = Math.round(step * maxVal);
            return (
              <g key={step}>
                <text
                  x={0}
                  y={y + 3}
                  className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono-num"
                >
                  {tickVal}
                </text>
                <line
                  x1={leftPad}
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  className="stroke-slate-200 dark:stroke-slate-800"
                  strokeWidth="1"
                  strokeDasharray={step === 0 ? undefined : '3 3'}
                />
              </g>
            );
          })}
          {data.map((point, idx) => {
            const groupX = leftPad + idx * (plotWidth / data.length) + plotWidth / data.length / 2;
            const totalH = Math.max(4, (point.visitors / maxVal) * (chartHeight - 24));
            const visitedH = Math.max(
              point.completedVisits > 0 ? 4 : 0,
              (point.completedVisits / maxVal) * (chartHeight - 24)
            );
            const baseLineY = chartHeight + 8;

            return (
              <g key={point.monthKey}>
                <rect
                  x={groupX - barWidth - 3}
                  y={baseLineY - totalH}
                  width={barWidth}
                  height={totalH}
                  rx={4}
                  className="fill-blue-600 dark:fill-blue-500"
                />
                <rect
                  x={groupX + 3}
                  y={baseLineY - visitedH}
                  width={barWidth}
                  height={visitedH}
                  rx={4}
                  className="fill-emerald-600 dark:fill-emerald-500"
                />
                <text
                  x={groupX - barWidth / 2 - 3}
                  y={baseLineY - totalH - 6}
                  textAnchor="middle"
                  className="fill-slate-600 dark:fill-slate-300 text-[10px] font-mono-num"
                >
                  {point.visitors}
                </text>
                {point.completedVisits > 0 && (
                  <text
                    x={groupX + barWidth / 2 + 3}
                    y={baseLineY - visitedH - 6}
                    textAnchor="middle"
                    className="fill-emerald-700 dark:fill-emerald-400 text-[10px] font-mono-num"
                  >
                    {point.completedVisits}
                  </text>
                )}
                <text
                  x={groupX}
                  y={baseLineY + 18}
                  textAnchor="middle"
                  className="fill-slate-500 dark:fill-slate-400 text-[11px]"
                >
                  {point.label}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="mt-2 flex items-center gap-5 text-xs text-slate-600 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-blue-600 dark:bg-blue-500" />
            Visitors
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600 dark:bg-emerald-500" />
            Completed visits
          </span>
        </div>
      </div>
    </div>
  );
};

export const RentBudgetFitChart: React.FC<{
  withinRent: number;
  belowRent: number;
  unspecified: number;
}> = ({ withinRent, belowRent, unspecified }) => {
  const total = withinRent + belowRent + unspecified;
  if (total === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
        No rental enquiries recorded yet.
      </p>
    );
  }
  const withinPct = Math.round((withinRent / total) * 100);
  const belowPct = Math.round((belowRent / total) * 100);
  const unspecPct = Math.max(0, 100 - withinPct - belowPct);

  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        {withinRent > 0 && (
          <div
            style={{ width: `${withinPct}%` }}
            className="bg-emerald-600 dark:bg-emerald-500 transition-all duration-300"
            title={`Matches Rent: ${withinRent} (${withinPct}%)`}
          />
        )}
        {belowRent > 0 && (
          <div
            style={{ width: `${belowPct}%` }}
            className="bg-amber-500 dark:bg-amber-400 transition-all duration-300"
            title={`Below Rent: ${belowRent} (${belowPct}%)`}
          />
        )}
        {unspecified > 0 && (
          <div
            style={{ width: `${unspecPct}%` }}
            className="bg-slate-400 dark:bg-slate-600 transition-all duration-300"
            title={`Not specified: ${unspecified} (${unspecPct}%)`}
          />
        )}
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600 dark:bg-emerald-500" />
            Matches asking rent
          </span>
          <span className="font-mono-num font-semibold text-slate-900 dark:text-slate-100">
            {withinRent} ({withinPct}%)
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500 dark:bg-amber-400" />
            Below asking rent
          </span>
          <span className="font-mono-num font-semibold text-slate-900 dark:text-slate-100">
            {belowRent} ({belowPct}%)
          </span>
        </div>
        {unspecified > 0 && (
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <span className="h-2.5 w-2.5 rounded-sm bg-slate-400 dark:bg-slate-600" />
              Budget not specified
            </span>
            <span className="font-mono-num font-semibold text-slate-900 dark:text-slate-100">
              {unspecified} ({unspecPct}%)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export const RentalPurchaseSplitChart: React.FC<{
  rentalCount: number;
  purchaseCount: number;
}> = ({ rentalCount, purchaseCount }) => {
  const total = rentalCount + purchaseCount;
  if (total === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
        No enquiries recorded yet.
      </p>
    );
  }
  const rentalPct = Math.round((rentalCount / total) * 100);
  const purchasePct = 100 - rentalPct;

  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        {rentalCount > 0 && (
          <div
            style={{ width: `${rentalPct}%` }}
            className="bg-blue-600 dark:bg-blue-500 transition-all duration-300"
            title={`Rent: ${rentalCount} (${rentalPct}%)`}
          />
        )}
        {purchaseCount > 0 && (
          <div
            style={{ width: `${purchasePct}%` }}
            className="bg-slate-700 dark:bg-slate-400 transition-all duration-300"
            title={`Purchase: ${purchaseCount} (${purchasePct}%)`}
          />
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2.5">
          <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <span className="h-2.5 w-2.5 rounded-sm bg-blue-600 dark:bg-blue-500" />
            Rental
          </span>
          <span className="font-mono-num font-semibold text-slate-900 dark:text-slate-100">
            {rentalCount} ({rentalPct}%)
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2.5">
          <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <span className="h-2.5 w-2.5 rounded-sm bg-slate-700 dark:bg-slate-400" />
            Purchase
          </span>
          <span className="font-mono-num font-semibold text-slate-900 dark:text-slate-100">
            {purchaseCount} ({purchasePct}%)
          </span>
        </div>
      </div>
    </div>
  );
};

export const BudgetDistributionChart: React.FC<{ buckets: BudgetBucket[] }> = ({ buckets }) => {
  if (buckets.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
        No budget records entered yet.
      </p>
    );
  }
  const max = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <div className="space-y-2.5">
      {buckets.map((bucket, idx) => {
        const pct = Math.round((bucket.count / max) * 100);
        return (
          <div key={`${bucket.label}-${idx}`} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono-num text-slate-700 dark:text-slate-300">
                {bucket.label}
              </span>
              <span className="font-mono-num font-semibold text-slate-900 dark:text-slate-100">
                {bucket.count}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                style={{ width: `${pct}%` }}
                className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const StatusDistributionChart: React.FC<{
  items: StatusCount[];
  total: number;
}> = ({ items, total }) => {
  if (items.length === 0 || total === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
        Visitor pipeline breakdown will appear after registration.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {items.map((item) => {
        const pct = Math.round((item.count / total) * 100);
        const barColor =
          item.status === 'Finalised'
            ? 'bg-emerald-600 dark:bg-emerald-500'
            : item.status === 'Not interested' || item.status === 'No-show'
            ? 'bg-red-600 dark:bg-red-500'
            : 'bg-blue-600 dark:bg-blue-500';
        return (
          <div key={item.status} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-700 dark:text-slate-300">{item.status}</span>
              <span className="font-mono-num text-slate-900 dark:text-slate-100 font-medium">
                {item.count} · {pct}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div style={{ width: `${pct}%` }} className={`h-full rounded-full ${barColor}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
