import React from 'react';
import {
  ArrowRight,
  Building2,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  ClockAlert,
  Handshake,
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

  const kpis = [
    {
      label: 'Total Visitors',
      value: metrics.totalVisitors,
      icon: Users,
      tone: 'text-slate-900 dark:text-slate-100',
    },
    {
      label: 'Completed Visits',
      value: metrics.totalCompletedVisits,
      icon: CheckCircle2,
      tone: 'text-emerald-700 dark:text-emerald-400',
    },
    {
      label: 'Upcoming Visits',
      value: metrics.upcomingVisits,
      icon: CalendarCheck2,
      tone: 'text-blue-700 dark:text-blue-400',
    },
    {
      label: 'Interested Visitors',
      value: metrics.interestedVisitors,
      icon: UserPlus,
      tone: 'text-blue-700 dark:text-blue-400',
    },
    {
      label: 'Pending Follow-ups',
      value: metrics.pendingFollowUps,
      icon: CalendarClock,
      tone: 'text-slate-900 dark:text-slate-100',
    },
    {
      label: 'Overdue Follow-ups',
      value: metrics.overdueFollowUps,
      icon: ClockAlert,
      tone:
        metrics.overdueFollowUps > 0
          ? 'text-red-700 dark:text-red-400'
          : 'text-slate-900 dark:text-slate-100',
    },
    {
      label: 'Finalised Deals',
      value: metrics.finalisedDeals,
      icon: Handshake,
      tone: 'text-emerald-700 dark:text-emerald-400',
    },
    {
      label: 'Apartment Status',
      value: apartment.availabilityStatus,
      icon: Building2,
      tone:
        apartment.availabilityStatus === 'Available'
          ? 'text-emerald-700 dark:text-emerald-400'
          : 'text-slate-900 dark:text-slate-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Single Apartment Banner */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121826] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {[
                'Active Property',
                apartment.floor,
                `${apartment.bedrooms} Bedrooms`,
                apartment.sizeSqFt,
              ]
                .filter(Boolean)
                .join(' · ')}
            </div>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
              {apartment.apartmentNumber}
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-slate-600 dark:text-slate-300">
              <span>
                Expected Monthly Rent:{' '}
                <span className="font-mono-num font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(apartment.expectedMonthlyRent, apartment.currency)}/mo
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Edit Apartment Info
            </button>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              View Reports
            </button>
          </div>
        </div>
      </section>

      {/* 8 KPI Cards */}
      <section aria-label="Key metrics" className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121826] p-4 flex flex-col justify-between gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {kpi.label}
                </span>
                <Icon className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" aria-hidden="true" />
              </div>
              <div
                className={`font-display font-bold tracking-tight font-mono-num ${
                  typeof kpi.value === 'string' ? 'text-lg' : 'text-2xl'
                } ${kpi.tone}`}
              >
                {kpi.value}
              </div>
            </div>
          );
        })}
      </section>

      {/* Empty State Banner when zero real visitors */}
      {visitors.length === 0 ? (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121826] p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <UserPlus className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            No visitors registered yet
          </h3>
          <p className="mt-1.5 max-w-md mx-auto text-sm text-slate-600 dark:text-slate-400">
            Start tracking enquiries, apartment viewings, budgets, and follow-up reminders for{' '}
            {apartment.apartmentNumber}. Every record stays safely stored offline on your device.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('register')}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Register First Visitor
            </button>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Restore from Backup
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* Analytics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121826] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Monthly Visitor Trends
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Last 6 active months
                </span>
              </div>
              <MonthlyTrendsChart data={metrics.monthlyTrends} />
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121826] p-5 space-y-5">
              <div>
                <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  Rent Budget Fit (vs {formatCurrency(apartment.expectedMonthlyRent, apartment.currency)}/mo)
                </h3>
                <RentBudgetFitChart
                  withinRent={metrics.budgetFitStats.withinRent}
                  belowRent={metrics.budgetFitStats.belowRent}
                  unspecified={metrics.budgetFitStats.unspecified}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  Rent Budget Distribution
                </h3>
                <BudgetDistributionChart buckets={metrics.budgetDistribution} />
              </div>
            </div>
          </div>

          {/* Recent Visitors + Upcoming Follow-ups + Status Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Recently Registered Visitors */}
            <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121826] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
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
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {metrics.recentVisitors.map((visitor) => (
                  <div
                    key={visitor.id}
                    className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5"
                  >
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onSelectVisitor(visitor)}
                        className="text-left font-medium text-sm text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate block"
                      >
                        {visitor.fullName}
                      </button>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
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

            {/* Upcoming Follow-ups & Pipeline Status */}
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121826] p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
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
                  <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                    No pending follow-ups scheduled.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {metrics.upcomingFollowUpList.map(({ followUp, visitor }) => (
                      <div key={followUp.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectVisitor(visitor)}
                            className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 truncate"
                          >
                            {visitor.fullName}
                          </button>
                          <a
                            href={`tel:${visitor.contactNumber}`}
                            aria-label={`Call ${visitor.fullName}`}
                            className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
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

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121826] p-5">
                <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
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
