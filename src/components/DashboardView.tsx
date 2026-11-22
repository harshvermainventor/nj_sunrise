import React from 'react';
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  Phone,
  UserPlus,
  Users,
} from 'lucide-react';
import { ApartmentInfo, AppView, VisitorProfile } from '../types/crm';
import { computeDashboardMetrics, formatBudgetRange, formatCurrency } from '../utils/crmLogic';
import { PetStatusBadge, VisitStatusBadge, VisitorStageText } from './StatusBadges';
import {
  BudgetDistributionChart,
  MonthlyTrendsChart,
  RentBudgetFitChart,
  StatusDistributionChart,
} from './Charts';

interface DashboardViewProps {
  apartment: ApartmentInfo;
  visitors: VisitorProfile[];
  onNavigate: (view: AppView) => void;
  onSelectVisitor: (visitor: VisitorProfile) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  apartment,
  visitors,
  onNavigate,
  onSelectVisitor,
}) => {
  const metrics = computeDashboardMetrics(
    visitors,
    undefined,
    apartment.currency,
    apartment.expectedMonthlyRent
  );

  const primaryKpis = [
    {
      label: 'Total Visitors',
      value: metrics.totalVisitors,
      icon: Users,
      tone: 'text-zinc-950 dark:text-zinc-50',
      iconColor: 'text-zinc-400 dark:text-zinc-500',
    },
    {
      label: 'Completed Visits',
      value: metrics.totalCompletedVisits,
      icon: CheckCircle2,
      tone: 'text-emerald-600 dark:text-emerald-400',
      iconColor: 'text-emerald-500 dark:text-emerald-400',
    },
    {
      label: 'Upcoming Visits',
      value: metrics.upcomingVisits,
      icon: CalendarCheck2,
      tone: 'text-blue-600 dark:text-blue-400',
      iconColor: 'text-blue-500 dark:text-blue-400',
    },
    {
      label: 'Interested',
      value: metrics.interestedVisitors,
      icon: UserPlus,
      tone: 'text-zinc-950 dark:text-zinc-50',
      iconColor: 'text-blue-500 dark:text-blue-400',
    },
  ];

  const secondaryStats = [
    {
      label: 'Pending Follow-ups',
      value: metrics.pendingFollowUps,
      tone:
        metrics.pendingFollowUps > 0
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-zinc-900 dark:text-zinc-100',
    },
    {
      label: 'Overdue Follow-ups',
      value: metrics.overdueFollowUps,
      tone:
        metrics.overdueFollowUps > 0
          ? 'text-red-600 dark:text-red-400'
          : 'text-zinc-900 dark:text-zinc-100',
    },
    {
      label: 'Finalised Deals',
      value: metrics.finalisedDeals,
      tone:
        metrics.finalisedDeals > 0
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-zinc-900 dark:text-zinc-100',
    },
    {
      label: 'Availability',
      value: apartment.availabilityStatus,
      tone:
        apartment.availabilityStatus === 'Available'
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-zinc-900 dark:text-zinc-100',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Property Header Card */}
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {[
                'Active Property',
                apartment.floor,
                `${apartment.bedrooms} Bedrooms`,
                apartment.sizeSqFt,
              ]
                .filter(Boolean)
                .join(' · ')}
            </div>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                {apartment.apartmentNumber}
              </h2>
              <span className="font-mono-num text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(apartment.expectedMonthlyRent, apartment.currency)}
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">/mo</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap"
            >
              Edit Apartment Info
            </button>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap"
            >
              View Reports
            </button>
          </div>
        </div>
      </section>

      {/* Primary Metrics (4 Cards) */}
      <section aria-label="Key metrics" className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {primaryKpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] p-4 sm:p-5 flex flex-col justify-between gap-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {kpi.label}
                </span>
                <Icon className={`h-4 w-4 shrink-0 ${kpi.iconColor}`} aria-hidden="true" />
              </div>
              <div className={`font-display text-2xl sm:text-3xl font-bold tracking-tight font-mono-num ${kpi.tone}`}>
                {kpi.value}
              </div>
            </div>
          );
        })}
      </section>

      {/* Secondary Operations Summary Bar (Single Divided Strip) */}
      <section
        aria-label="Follow-up and property summary"
        className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-zinc-100 dark:divide-zinc-800"
      >
        {secondaryStats.map((stat, idx) => (
          <div
            key={stat.label}
            className={`px-4 py-3.5 sm:px-5 sm:py-4 flex items-center justify-between gap-3 ${
              idx % 2 === 1 ? 'border-l border-zinc-100 dark:border-zinc-800 lg:border-l-0' : ''
            }`}
          >
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {stat.label}
            </span>
            <span className={`font-display font-bold font-mono-num text-sm sm:text-base ${stat.tone}`}>
              {stat.value}
            </span>
          </div>
        ))}
      </section>

      {/* Empty State or Populated Analytics */}
      {visitors.length === 0 ? (
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] p-7 sm:p-9 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-blue-600 dark:text-blue-400">
            <UserPlus className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            No visitors registered yet
          </h3>
          <p className="mt-1.5 max-w-md mx-auto text-sm text-zinc-600 dark:text-zinc-400">
            Log enquiries, viewings, quoted rent, and follow-up reminders for {apartment.apartmentNumber}. Everything stays saved offline on your device.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('register')}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Register First Visitor
            </button>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Restore from Backup
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* Analytics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Monthly Visitor Trends
                </h3>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Last 6 active months
                </span>
              </div>
              <MonthlyTrendsChart data={metrics.monthlyTrends} />
            </div>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] p-5 space-y-5">
              <div>
                <h3 className="font-display text-sm font-semibold text-zinc-950 dark:text-zinc-50 mb-3">
                  Rent Budget Fit (vs {formatCurrency(apartment.expectedMonthlyRent, apartment.currency)}/mo)
                </h3>
                <RentBudgetFitChart
                  withinRent={metrics.budgetFitStats.withinRent}
                  belowRent={metrics.budgetFitStats.belowRent}
                  unspecified={metrics.budgetFitStats.unspecified}
                />
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <h3 className="font-display text-sm font-semibold text-zinc-950 dark:text-zinc-50 mb-3">
                  Rent Budget Distribution
                </h3>
                <BudgetDistributionChart buckets={metrics.budgetDistribution} />
              </div>
            </div>
          </div>

          {/* Recent Visitors + Upcoming Follow-ups + Status Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Recently Registered Visitors
                </h3>
                <button
                  type="button"
                  onClick={() => onNavigate('directory')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {metrics.recentVisitors.map((visitor) => (
                  <div
                    key={visitor.id}
                    className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5"
                  >
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onSelectVisitor(visitor)}
                        className="text-left font-medium text-sm text-zinc-950 dark:text-zinc-50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate block"
                      >
                        {visitor.fullName}
                      </button>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="font-mono-num">{visitor.contactNumber}</span>
                        {visitor.quotedRent ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-num">
                              Quoted: {formatCurrency(visitor.quotedRent, apartment.currency)}/mo
                            </span>
                          </>
                        ) : null}
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-num">
                          Budget:{' '}
                          {formatBudgetRange(
                            {
                              budgetMin: visitor.budgetMin,
                              budgetMax: visitor.budgetMax,
                              expectedBudget: visitor.expectedBudget,
                            },
                            apartment.currency
                          )}
                        </span>
                        <span aria-hidden="true">·</span>
                        <VisitorStageText status={visitor.visitorStatus} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <VisitStatusBadge
                        visitedStatus={visitor.latestVisitOutcome}
                        visitorStatus={visitor.visitorStatus}
                        compact
                      />
                      <PetStatusBadge petStatus={visitor.petStatus} compact />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    Upcoming Follow-ups
                  </h3>
                  <button
                    type="button"
                    onClick={() => onNavigate('followups')}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Manage
                  </button>
                </div>
                {metrics.upcomingFollowUpList.length === 0 ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 py-4 text-center">
                    No pending follow-ups scheduled.
                  </p>
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {metrics.upcomingFollowUpList.map(({ followUp, visitor }) => (
                      <div key={followUp.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectVisitor(visitor)}
                            className="text-sm font-medium text-zinc-950 dark:text-zinc-50 hover:text-blue-600 dark:hover:text-blue-400 truncate"
                          >
                            {visitor.fullName}
                          </button>
                          <a
                            href={`tel:${visitor.contactNumber}`}
                            aria-label={`Call ${visitor.fullName}`}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="font-mono-num">{followUp.scheduledDate}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-num">{followUp.preferredTime}</span>
                          <span aria-hidden="true">·</span>
                          <span>{followUp.method}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <VisitStatusBadge
                            visitedStatus={visitor.latestVisitOutcome}
                            visitorStatus={visitor.visitorStatus}
                            compact
                          />
                          <PetStatusBadge petStatus={visitor.petStatus} compact />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] p-5">
                <h3 className="font-display text-sm font-semibold text-zinc-950 dark:text-zinc-50 mb-3">
                  Visitor Status Statistics
                </h3>
                <StatusDistributionChart
                  items={metrics.statusBreakdown}
                  total={metrics.totalVisitors}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
