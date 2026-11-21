import React, { useMemo, useState } from 'react';
import {
  MessageCircle,
  Phone,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  UserPlus,
} from 'lucide-react';
import {
  CurrencySymbol,
  PetStatus,
  VisitorFilters,
  VisitorProfile,
  VisitorStatus,
} from '../types/crm';
import {
  PET_STATUSES,
  VISITOR_STATUSES,
  filterAndSortVisitors,
  formatBudgetRange,
  formatCurrency,
  formatPeopleStayingLabel,
  formatPhoneForWhatsApp,
} from '../utils/crmLogic';
import { CalendarDatePicker } from './CalendarDatePicker';
import { PetStatusBadge, VisitStatusBadge, VisitorStageText } from './StatusBadges';

interface DirectoryViewProps {
  visitors: VisitorProfile[];
  currency: CurrencySymbol;
  onSelectVisitor: (visitor: VisitorProfile) => void;
  onDeleteVisitor: (visitorId: string) => void;
  onNavigateRegister: () => void;
}

const DEFAULT_FILTERS: VisitorFilters = {
  search: '',
  visitDateFrom: '',
  visitDateTo: '',
  budgetMin: '',
  budgetMax: '',
  visitorStatus: 'All',
  enquiryType: 'All',
  petStatus: 'All',
  sortBy: 'date-desc',
};

export const DirectoryView: React.FC<DirectoryViewProps> = ({
  visitors,
  currency,
  onSelectVisitor,
  onDeleteVisitor,
  onNavigateRegister,
}) => {
  const [filters, setFilters] = useState<VisitorFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<VisitorProfile | null>(null);

  const filteredVisitors = useMemo(
    () => filterAndSortVisitors(visitors, filters),
    [visitors, filters]
  );

  const hasActiveFilters =
    filters.search !== '' ||
    filters.visitDateFrom !== '' ||
    filters.visitDateTo !== '' ||
    filters.budgetMin !== '' ||
    filters.budgetMax !== '' ||
    filters.visitorStatus !== 'All' ||
    filters.enquiryType !== 'All' ||
    filters.petStatus !== 'All';

  const inputClass =
    'w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F17] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none';

  return (
    <div className="space-y-5">
      {/* Search & Filter Controls */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121826] p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Search visitors by name or contact number"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Search by visitor name, phone number, or notes..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F17] pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              aria-label="Sort visitors"
              value={filters.sortBy}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  sortBy: e.target.value as VisitorFilters['sortBy'],
                }))
              }
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F17] px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200"
            >
              <option value="date-desc">Newest visit first</option>
              <option value="date-asc">Oldest visit first</option>
              <option value="budget-desc">Highest budget first</option>
              <option value="budget-asc">Lowest budget first</option>
              <option value="name-asc">Name A–Z</option>
            </select>

            <button
              type="button"
              onClick={() => setShowFilters((s) => !s)}
              aria-expanded={showFilters}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label htmlFor="flt-status" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Visitor Status
              </label>
              <select
                id="flt-status"
                value={filters.visitorStatus}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    visitorStatus: e.target.value as VisitorStatus | 'All',
                  }))
                }
                className={inputClass}
              >
                <option value="All">All statuses</option>
                {VISITOR_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="flt-pet" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Pet Status
              </label>
              <select
                id="flt-pet"
                value={filters.petStatus}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    petStatus: e.target.value as PetStatus | 'All',
                  }))
                }
                className={inputClass}
              >
                <option value="All">All pet statuses</option>
                {PET_STATUSES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="flt-date-from" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Visit Date From
              </label>
              <CalendarDatePicker
                id="flt-date-from"
                value={filters.visitDateFrom}
                onChange={(val) => setFilters((f) => ({ ...f, visitDateFrom: val }))}
                placeholder="From date"
                allowClear
                compact
                ariaLabel="Visit Date From"
              />
            </div>

            <div>
              <label htmlFor="flt-date-to" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Visit Date To
              </label>
              <CalendarDatePicker
                id="flt-date-to"
                value={filters.visitDateTo}
                onChange={(val) => setFilters((f) => ({ ...f, visitDateTo: val }))}
                placeholder="To date"
                allowClear
                compact
                ariaLabel="Visit Date To"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="flt-budget-min" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Min ({currency})
                </label>
                <input
                  id="flt-budget-min"
                  type="number"
                  min={0}
                  value={filters.budgetMin}
                  onChange={(e) => setFilters((f) => ({ ...f, budgetMin: e.target.value }))}
                  placeholder="0"
                  className={`${inputClass} font-mono-num`}
                />
              </div>
              <div>
                <label htmlFor="flt-budget-max" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Max ({currency})
                </label>
                <input
                  id="flt-budget-max"
                  type="number"
                  min={0}
                  value={filters.budgetMax}
                  onChange={(e) => setFilters((f) => ({ ...f, budgetMax: e.target.value }))}
                  placeholder="Any"
                  className={`${inputClass} font-mono-num`}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            Showing <strong className="font-mono-num text-slate-900 dark:text-slate-100">{filteredVisitors.length}</strong> of{' '}
            <strong className="font-mono-num text-slate-900 dark:text-slate-100">{visitors.length}</strong> visitors
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              Reset filters
            </button>
          )}
        </div>
      </section>

      {/* Results List */}
      {visitors.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121826] p-10 text-center">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Your visitor directory is empty
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Register your first apartment visitor to start building searchable profiles and visit history.
          </p>
          <button
            type="button"
            onClick={onNavigateRegister}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Register Visitor
          </button>
        </div>
      ) : filteredVisitors.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121826] p-10 text-center">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            No matching visitors found
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Try clearing your search or adjusting the date, budget, or status filters.
          </p>
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="mt-4 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVisitors.map((visitor) => {
            const waPhone = formatPhoneForWhatsApp(visitor.contactNumber);
            const pendingCount = visitor.followUps.filter((f) => f.status === 'Pending').length;
            return (
              <article
                key={visitor.id}
                data-testid="directory-visitor-card"
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121826] p-4 sm:p-5 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => onSelectVisitor(visitor)}
                        className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 text-left truncate"
                      >
                        {visitor.fullName}
                      </button>
                      <VisitorStageText status={visitor.visitorStatus} />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <span className="font-mono-num text-slate-800 dark:text-slate-200">
                        {visitor.contactNumber}
                      </span>
                      {visitor.quotedRent ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-num">
                            Quoted: {formatCurrency(visitor.quotedRent, currency)}/mo
                          </span>
                        </>
                      ) : null}
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-num font-semibold text-slate-900 dark:text-slate-100">
                        Budget:{' '}
                        {formatBudgetRange(
                          {
                            budgetMin: visitor.budgetMin,
                            budgetMax: visitor.budgetMax,
                            expectedBudget: visitor.expectedBudget,
                          },
                          currency
                        )}
                      </span>
                      {visitor.moveInTimeline && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-num">Move-in: {visitor.moveInTimeline}</span>
                        </>
                      )}
                      {formatPeopleStayingLabel(visitor.latestPeopleCount) && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{formatPeopleStayingLabel(visitor.latestPeopleCount)}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-num">
                        Visit: {visitor.latestVisitDate}
                        {visitor.latestVisitTime ? ` ${visitor.latestVisitTime}` : ''}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {visitor.visits.length} visit{visitor.visits.length === 1 ? '' : 's'}
                      </span>
                      {pendingCount > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            {pendingCount} follow-up{pendingCount === 1 ? '' : 's'}
                          </span>
                        </>
                      )}
                    </div>

                    {visitor.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                        {visitor.description}
                      </p>
                    )}

                    {/* Strictly separate colour-coded indicators */}
                    <div className="pt-1 flex flex-wrap items-center gap-2">
                      <VisitStatusBadge
                        visitedStatus={visitor.latestVisitOutcome}
                        visitorStatus={visitor.visitorStatus}
                      />
                      <PetStatusBadge petStatus={visitor.petStatus} />
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <a
                      href={`tel:${visitor.contactNumber}`}
                      aria-label={`Call ${visitor.fullName}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[38px]"
                    >
                      <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Call</span>
                    </a>
                    {waPhone && (
                      <a
                        href={`https://wa.me/${waPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Message ${visitor.fullName} on WhatsApp`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 min-h-[38px]"
                      >
                        <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => onSelectVisitor(visitor)}
                      className="rounded-lg bg-slate-900 dark:bg-slate-100 px-3.5 py-2 text-xs font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white min-h-[38px]"
                    >
                      Open Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(visitor)}
                      aria-label={`Delete ${visitor.fullName}`}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-slate-500 hover:text-red-600 hover:border-red-200 dark:hover:text-red-400 dark:hover:border-red-800 min-h-[38px] min-w-[38px]"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="del-visitor-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
        >
          <div className="w-full max-w-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121826] p-6 shadow-xl space-y-4">
            <h3
              id="del-visitor-title"
              className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              Delete Visitor Record?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to permanently remove{' '}
              <strong>{deleteTarget.fullName}</strong> and all {deleteTarget.visits.length}{' '}
              recorded visit{deleteTarget.visits.length === 1 ? '' : 's'}? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteVisitor(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 rounded-lg bg-red-600 text-xs font-semibold text-white hover:bg-red-700"
              >
                Delete Visitor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
