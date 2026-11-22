import React, { useMemo, useState } from 'react';
import { Download, FileJson, RotateCcw } from 'lucide-react';
import { ApartmentInfo, VisitorProfile } from '../types/crm';
import {
  computeReportsMetrics,
  createBackupPayload,
  exportVisitorsToCsv,
  getTodayIsoDate,
} from '../utils/crmLogic';
import { CalendarDatePicker } from './CalendarDatePicker';
import {
  BudgetDistributionChart,
  MonthlyTrendsChart,
  RentBudgetFitChart,
} from './Charts';

interface ReportsViewProps {
  apartment: ApartmentInfo;
  visitors: VisitorProfile[];
}

export function triggerFileDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const ReportsView: React.FC<ReportsViewProps> = ({ apartment, visitors }) => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const scopedVisitors = useMemo(() => {
    return visitors.filter((v) => {
      if (dateFrom && v.latestVisitDate < dateFrom) return false;
      if (dateTo && v.latestVisitDate > dateTo) return false;
      return true;
    });
  }, [visitors, dateFrom, dateTo]);

  const metrics = useMemo(
    () =>
      computeReportsMetrics(
        visitors,
        dateFrom,
        dateTo,
        apartment.currency,
        apartment.expectedMonthlyRent
      ),
    [visitors, dateFrom, dateTo, apartment.currency, apartment.expectedMonthlyRent]
  );

  const handleExportCsv = () => {
    const csv = exportVisitorsToCsv(scopedVisitors);
    triggerFileDownload(
      csv,
      `apartment-visitors-${getTodayIsoDate()}.csv`,
      'text/csv;charset=utf-8;'
    );
  };

  const handleExportJson = () => {
    const payload = createBackupPayload(apartment, scopedVisitors);
    triggerFileDownload(
      JSON.stringify(payload, null, 2),
      `apartment-visitor-crm-report-${getTodayIsoDate()}.json`,
      'application/json'
    );
  };

  return (
    <div className="space-y-5">
      {/* Filter & Export Bar */}
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] p-4 sm:p-5 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[160px] flex-1 sm:flex-none">
            <label htmlFor="rep-from" className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
              From Date
            </label>
            <CalendarDatePicker
              id="rep-from"
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="From date"
              allowClear
              compact
              ariaLabel="From Date"
            />
          </div>
          <div className="min-w-[160px] flex-1 sm:flex-none">
            <label htmlFor="rep-to" className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
              To Date
            </label>
            <CalendarDatePicker
              id="rep-to"
              value={dateTo}
              onChange={setDateTo}
              placeholder="To date"
              allowClear
              compact
              ariaLabel="To Date"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Clear Dates
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={scopedVisitors.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            disabled={scopedVisitors.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <FileJson className="h-3.5 w-3.5" aria-hidden="true" />
            Export JSON
          </button>
        </div>
      </section>

      {/* Conversion & Summary Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] p-4 sm:p-5">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Visitors in Range</span>
          <div className="mt-1.5 font-display text-2xl sm:text-3xl font-bold font-mono-num text-zinc-950 dark:text-zinc-50">
            {metrics.filteredVisitorCount}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] p-4 sm:p-5">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Interested / Negotiating</span>
          <div className="mt-1.5 font-display text-2xl sm:text-3xl font-bold font-mono-num text-blue-600 dark:text-blue-400">
            {metrics.interestedVisitors}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] p-4 sm:p-5">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Finalised Deals</span>
          <div className="mt-1.5 font-display text-2xl sm:text-3xl font-bold font-mono-num text-emerald-600 dark:text-emerald-400">
            {metrics.finalisedDeals}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] p-4 sm:p-5">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Conversion Rate</span>
          <div className="mt-1.5 font-display text-2xl sm:text-3xl font-bold font-mono-num text-zinc-950 dark:text-zinc-50">
            {metrics.conversionRatePct}%
          </div>
        </div>
      </section>

      {/* Monthly Count & Enquiries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] p-5">
          <h2 className="font-display text-sm font-semibold text-zinc-950 dark:text-zinc-50 mb-4">
            Monthly Visitor Count
          </h2>
          <MonthlyTrendsChart data={metrics.monthlyCounts} />
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] p-5 space-y-5">
          <div>
            <h2 className="font-display text-sm font-semibold text-zinc-950 dark:text-zinc-50 mb-3">
              Rent Budget Fit
            </h2>
            <RentBudgetFitChart
              withinRent={metrics.budgetFitStats.withinRent}
              belowRent={metrics.budgetFitStats.belowRent}
              unspecified={metrics.budgetFitStats.unspecified}
            />
          </div>
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <h2 className="font-display text-sm font-semibold text-zinc-950 dark:text-zinc-50 mb-3">
              Rent Budget Distribution
            </h2>
            <BudgetDistributionChart buckets={metrics.budgetDistribution} />
          </div>
        </div>
      </div>

      {/* Pet Stats & Visit Outcome Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] p-5 space-y-3">
          <h2 className="font-display text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            Visited vs Not-Visited Statistics
          </h2>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">Visited</span>
              <span className="font-mono-num font-semibold text-zinc-950 dark:text-zinc-50">{metrics.visitStats.visited}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-blue-600 dark:text-blue-400 font-medium">Scheduled</span>
              <span className="font-mono-num font-semibold text-zinc-950 dark:text-zinc-50">{metrics.visitStats.scheduled}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-red-600 dark:text-red-400 font-medium">Not visited</span>
              <span className="font-mono-num font-semibold text-zinc-950 dark:text-zinc-50">{metrics.visitStats.notVisited}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-red-600 dark:text-red-400 font-medium">No-show</span>
              <span className="font-mono-num font-semibold text-zinc-950 dark:text-zinc-50">{metrics.visitStats.noShow}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] p-5 space-y-3">
          <h2 className="font-display text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            Pet & No-Pet Statistics
          </h2>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-red-600 dark:text-red-400 font-medium">Has pets</span>
              <span className="font-mono-num font-semibold text-zinc-950 dark:text-zinc-50">{metrics.petStats.hasPets}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">No pets</span>
              <span className="font-mono-num font-semibold text-zinc-950 dark:text-zinc-50">{metrics.petStats.noPets}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-400 font-medium">Not specified</span>
              <span className="font-mono-num font-semibold text-zinc-950 dark:text-zinc-50">{metrics.petStats.notSpecified}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
