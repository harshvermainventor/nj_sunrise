import {
  ApartmentInfo,
  CrmBackupPayload,
  CurrencySymbol,
  DEFAULT_APARTMENT_ID,
  FollowUpEntry,
  PetStatus,
  RegistrationFormInput,
  VisitRecord,
  VisitedAnswer,
  VisitorFilters,
  VisitorProfile,
  VisitorStatus,
} from '../types/crm';

export const VISITOR_STATUSES: VisitorStatus[] = [
  'New enquiry',
  'Visit scheduled',
  'Visited',
  'Interested',
  'Follow-up required',
  'Negotiating',
  'Finalised',
  'Not interested',
  'No-show',
];

export const PET_STATUSES: PetStatus[] = ['Has pets', 'No pets', 'Not specified'];

export function createId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

export function getTodayIsoDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatIsoDateDisplay(isoDate: string): string {
  if (!isoDate) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return isoDate;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) return isoDate;
  return `${String(day).padStart(2, '0')} ${SHORT_MONTHS[monthIndex]} ${year}`;
}

export function formatTime12h(time24: string): string {
  if (!time24) return '';
  const match = /^(\d{1,2}):(\d{2})$/.exec(time24.trim());
  if (!match) return time24;
  const hour24 = Number(match[1]);
  const minute = Number(match[2]);
  if (hour24 < 0 || hour24 > 23 || minute < 0 || minute > 59) return time24;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
}

export function createDefaultApartmentInfo(nowIso = new Date().toISOString()): ApartmentInfo {
  return {
    id: DEFAULT_APARTMENT_ID,
    apartmentNumber: 'Apt 4B',
    floor: '4th Floor',
    bedrooms: 2,
    sizeSqFt: '1,150 sq ft',
    expectedMonthlyRent: 25000,
    expectedSalePrice: 0,
    availabilityStatus: 'Available',
    currency: '₹',
    notes: 'Bright corner residence with balcony and dedicated parking.',
    updatedAt: nowIso,
  };
}

export function normalizePeopleStaying(val: string | number | undefined): string {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

export function formatPeopleStayingLabel(val: string | number | undefined): string {
  const clean = normalizePeopleStaying(val);
  if (!clean) return '';
  if (/^\d+$/.test(clean)) {
    const count = Number(clean);
    return count === 1 ? '1 person staying' : `${count} people staying`;
  }
  return `Staying: ${clean}`;
}

export function formatBudgetRange(
  opts: { budgetMin?: number; budgetMax?: number; expectedBudget?: number },
  currency: CurrencySymbol = '₹'
): string {
  const min = Math.max(0, Number(opts.budgetMin) || 0);
  const max = Math.max(0, Number(opts.budgetMax) || 0);
  const fallback = Math.max(0, Number(opts.expectedBudget) || 0);

  if (min > 0 && max > 0) {
    if (min === max) return `${formatCurrency(min, currency)}/mo`;
    const low = Math.min(min, max);
    const high = Math.max(min, max);
    return `${formatCurrency(low, currency)} – ${formatCurrency(high, currency)}/mo`;
  }
  if (max > 0) return `Up to ${formatCurrency(max, currency)}/mo`;
  if (min > 0) return `From ${formatCurrency(min, currency)}/mo`;
  if (fallback > 0) return `${formatCurrency(fallback, currency)}/mo`;
  return 'Not specified';
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function sanitizeTenDigitPhoneInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

export function isValidTenDigitPhone(phone: string): boolean {
  return normalizePhone(phone).length === 10;
}

export function phonesMatch(phoneA: string, phoneB: string): boolean {
  const normA = normalizePhone(phoneA);
  const normB = normalizePhone(phoneB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  if (normA.length >= 10 && normB.length >= 10) {
    return normA.slice(-10) === normB.slice(-10);
  }
  return false;
}

export function findDuplicateVisitorByPhone(
  visitors: VisitorProfile[],
  phone: string,
  excludeVisitorId?: string
): VisitorProfile | null {
  const norm = normalizePhone(phone);
  if (norm.length < 6) return null;
  return (
    visitors.find((v) => v.id !== excludeVisitorId && phonesMatch(v.contactNumber, phone)) ?? null
  );
}

export function resolveVisitBadgeState(
  visitedStatus: VisitedAnswer,
  visitorStatus?: VisitorStatus
): { label: 'Visited' | 'Not visited' | 'Scheduled' | 'No-show'; tone: 'green' | 'red' | 'blue' } {
  if (visitedStatus === 'Yes') {
    return { label: 'Visited', tone: 'green' };
  }
  if (visitedStatus === 'No-show' || (visitedStatus !== 'Scheduled' && visitorStatus === 'No-show')) {
    return { label: 'No-show', tone: 'red' };
  }
  if (visitedStatus === 'Scheduled') {
    return { label: 'Scheduled', tone: 'blue' };
  }
  return { label: 'Not visited', tone: 'red' };
}

export function createVisitorFromRegistration(
  input: RegistrationFormInput,
  apartmentId = DEFAULT_APARTMENT_ID,
  nowIso = new Date().toISOString()
): VisitorProfile {
  const visitorId = createId('vis');
  const visitId = createId('vst');

  const rawMin = Math.max(0, Number(input.budgetMin) || 0);
  const rawMax = Math.max(0, Number(input.budgetMax) || 0);
  const budgetMin = rawMin > 0 && rawMax > 0 ? Math.min(rawMin, rawMax) : rawMin;
  const budgetMax = rawMin > 0 && rawMax > 0 ? Math.max(rawMin, rawMax) : rawMax;
  const resolvedBudget = budgetMax || budgetMin || Math.max(0, Number(input.expectedBudget) || 0);
  const quotedRent = Math.max(0, Number(input.quotedRent) || 0);
  const peopleCount = normalizePeopleStaying(input.peopleCount);
  const visitTime = input.visitedStatus === 'Yes' ? '' : input.visitTime;

  const visit: VisitRecord = {
    id: visitId,
    apartmentId,
    visitDate: input.visitDate,
    visitTime,
    peopleCount,
    visitedStatus: input.visitedStatus,
    enquiryType: 'Rent',
    quotedRent,
    budgetMin,
    budgetMax,
    expectedBudget: resolvedBudget,
    budgetType: 'Monthly rent',
    moveInTimeline: input.moveInTimeline.trim(),
    visitorStatus: input.visitorStatus,
    visitorDescription: input.visitorDescription.trim(),
    initialComments: input.initialComments.trim(),
    followUpComments: input.followUpComments.trim(),
    additionalRequirements: input.additionalRequirements.trim(),
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const comments: VisitorProfile['comments'] = [];
  if (input.initialComments.trim()) {
    comments.push({
      id: createId('cmt'),
      text: input.initialComments.trim(),
      type: 'Visit',
      createdAt: nowIso,
    });
  }
  if (input.followUpComments.trim()) {
    comments.push({
      id: createId('cmt'),
      text: input.followUpComments.trim(),
      type: 'Follow-up',
      createdAt: nowIso,
    });
  }

  const followUps: FollowUpEntry[] = [];
  if (input.followUpRequired && input.nextFollowUpDate) {
    followUps.push({
      id: createId('fup'),
      visitorId,
      visitId,
      apartmentId,
      required: true,
      scheduledDate: input.nextFollowUpDate,
      preferredTime: input.preferredFollowUpTime || '11:00',
      method: input.followUpMethod,
      notes: input.followUpComments.trim() || input.initialComments.trim() || 'Scheduled follow-up',
      status: 'Pending',
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  return {
    id: visitorId,
    apartmentId,
    fullName: input.fullName.trim(),
    contactNumber: input.contactNumber.trim(),
    normalizedPhone: normalizePhone(input.contactNumber),
    petStatus: input.petStatus,
    enquiryType: 'Rent',
    quotedRent,
    budgetMin,
    budgetMax,
    expectedBudget: resolvedBudget,
    budgetType: 'Monthly rent',
    moveInTimeline: input.moveInTimeline.trim(),
    visitorStatus: input.visitorStatus,
    latestVisitOutcome: input.visitedStatus,
    latestVisitDate: input.visitDate,
    latestVisitTime: visitTime,
    latestPeopleCount: peopleCount,
    description: input.visitorDescription.trim(),
    additionalRequirements: input.additionalRequirements.trim(),
    visits: [visit],
    comments,
    followUps,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

/**
 * Adds a new visit to an existing visitor profile without overwriting historical visit records.
 */
export function mergeNewVisitIntoVisitor(
  existing: VisitorProfile,
  input: RegistrationFormInput,
  nowIso = new Date().toISOString()
): VisitorProfile {
  const visitId = createId('vst');

  const rawMin = Math.max(0, Number(input.budgetMin) || 0);
  const rawMax = Math.max(0, Number(input.budgetMax) || 0);
  const budgetMin = rawMin > 0 && rawMax > 0 ? Math.min(rawMin, rawMax) : rawMin;
  const budgetMax = rawMin > 0 && rawMax > 0 ? Math.max(rawMin, rawMax) : rawMax;
  const resolvedBudget = budgetMax || budgetMin || Math.max(0, Number(input.expectedBudget) || 0);
  const quotedRent = Math.max(0, Number(input.quotedRent) || 0);
  const peopleCount = normalizePeopleStaying(input.peopleCount);
  const visitTime = input.visitedStatus === 'Yes' ? '' : input.visitTime;

  const newVisit: VisitRecord = {
    id: visitId,
    apartmentId: existing.apartmentId,
    visitDate: input.visitDate,
    visitTime,
    peopleCount,
    visitedStatus: input.visitedStatus,
    enquiryType: 'Rent',
    quotedRent,
    budgetMin,
    budgetMax,
    expectedBudget: resolvedBudget,
    budgetType: 'Monthly rent',
    moveInTimeline: input.moveInTimeline.trim(),
    visitorStatus: input.visitorStatus,
    visitorDescription: input.visitorDescription.trim(),
    initialComments: input.initialComments.trim(),
    followUpComments: input.followUpComments.trim(),
    additionalRequirements: input.additionalRequirements.trim(),
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const addedComments: VisitorProfile['comments'] = [];
  if (input.initialComments.trim()) {
    addedComments.push({
      id: createId('cmt'),
      text: `Visit (${input.visitDate}): ${input.initialComments.trim()}`,
      type: 'Visit',
      createdAt: nowIso,
    });
  }
  if (input.followUpComments.trim()) {
    addedComments.push({
      id: createId('cmt'),
      text: input.followUpComments.trim(),
      type: 'Follow-up',
      createdAt: nowIso,
    });
  }

  const addedFollowUps: FollowUpEntry[] = [];
  if (input.followUpRequired && input.nextFollowUpDate) {
    addedFollowUps.push({
      id: createId('fup'),
      visitorId: existing.id,
      visitId,
      apartmentId: existing.apartmentId,
      required: true,
      scheduledDate: input.nextFollowUpDate,
      preferredTime: input.preferredFollowUpTime || '11:00',
      method: input.followUpMethod,
      notes: input.followUpComments.trim() || input.initialComments.trim() || 'Scheduled follow-up',
      status: 'Pending',
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  // Keep existing historical visits intact; sort visits newest-first by visitDate + visitTime
  const allVisits = [newVisit, ...existing.visits].sort((a, b) =>
    `${b.visitDate}T${b.visitTime || '00:00'}`.localeCompare(
      `${a.visitDate}T${a.visitTime || '00:00'}`
    )
  );
  const latestVisit = allVisits[0];

  return {
    ...existing,
    fullName: input.fullName.trim() || existing.fullName,
    contactNumber: input.contactNumber.trim() || existing.contactNumber,
    normalizedPhone: normalizePhone(input.contactNumber || existing.contactNumber),
    petStatus: input.petStatus,
    enquiryType: 'Rent',
    quotedRent: latestVisit.quotedRent ?? existing.quotedRent ?? 0,
    budgetMin: latestVisit.budgetMin ?? existing.budgetMin ?? 0,
    budgetMax: latestVisit.budgetMax ?? existing.budgetMax ?? 0,
    expectedBudget: latestVisit.expectedBudget,
    budgetType: 'Monthly rent',
    moveInTimeline: latestVisit.moveInTimeline || existing.moveInTimeline,
    visitorStatus: latestVisit.visitorStatus,
    latestVisitOutcome: latestVisit.visitedStatus,
    latestVisitDate: latestVisit.visitDate,
    latestVisitTime: latestVisit.visitTime,
    latestPeopleCount: latestVisit.peopleCount,
    description: input.visitorDescription.trim() || existing.description,
    additionalRequirements: input.additionalRequirements.trim() || existing.additionalRequirements,
    visits: allVisits,
    comments: [...addedComments, ...existing.comments],
    followUps: [...addedFollowUps, ...existing.followUps],
    updatedAt: nowIso,
  };
}

export interface FlattenedFollowUp {
  followUp: FollowUpEntry;
  visitor: VisitorProfile;
}

export interface CategorizedFollowUps {
  today: FlattenedFollowUp[];
  upcoming: FlattenedFollowUp[];
  overdue: FlattenedFollowUp[];
  completed: FlattenedFollowUp[];
}

export function categorizeFollowUps(
  visitors: VisitorProfile[],
  referenceDate = getTodayIsoDate()
): CategorizedFollowUps {
  const today: FlattenedFollowUp[] = [];
  const upcoming: FlattenedFollowUp[] = [];
  const overdue: FlattenedFollowUp[] = [];
  const completed: FlattenedFollowUp[] = [];

  for (const visitor of visitors) {
    for (const followUp of visitor.followUps) {
      const item = { followUp, visitor };
      if (followUp.status === 'Completed') {
        completed.push(item);
      } else if (followUp.scheduledDate < referenceDate) {
        overdue.push(item);
      } else if (followUp.scheduledDate === referenceDate) {
        today.push(item);
      } else {
        upcoming.push(item);
      }
    }
  }

  const byDateAsc = (a: FlattenedFollowUp, b: FlattenedFollowUp) =>
    `${a.followUp.scheduledDate}T${a.followUp.preferredTime}`.localeCompare(
      `${b.followUp.scheduledDate}T${b.followUp.preferredTime}`
    );

  const byDateDesc = (a: FlattenedFollowUp, b: FlattenedFollowUp) =>
    `${b.followUp.completedAt || b.followUp.scheduledDate}`.localeCompare(
      `${a.followUp.completedAt || a.followUp.scheduledDate}`
    );

  today.sort(byDateAsc);
  upcoming.sort(byDateAsc);
  overdue.sort(byDateAsc);
  completed.sort(byDateDesc);

  return { today, upcoming, overdue, completed };
}

export function filterAndSortVisitors(
  visitors: VisitorProfile[],
  filters: VisitorFilters
): VisitorProfile[] {
  const searchLower = filters.search.trim().toLowerCase();
  const searchDigits = normalizePhone(filters.search);
  const minBudget = filters.budgetMin !== '' ? Number(filters.budgetMin) : null;
  const maxBudget = filters.budgetMax !== '' ? Number(filters.budgetMax) : null;

  const filtered = visitors.filter((visitor) => {
    if (searchLower) {
      const nameMatch = visitor.fullName.toLowerCase().includes(searchLower);
      const phoneTextMatch = visitor.contactNumber.toLowerCase().includes(searchLower);
      const phoneDigitMatch =
        searchDigits.length > 0 && visitor.normalizedPhone.includes(searchDigits);
      const notesMatch = visitor.description.toLowerCase().includes(searchLower);
      if (!nameMatch && !phoneTextMatch && !phoneDigitMatch && !notesMatch) {
        return false;
      }
    }

    if (filters.visitDateFrom && visitor.latestVisitDate < filters.visitDateFrom) {
      return false;
    }
    if (filters.visitDateTo && visitor.latestVisitDate > filters.visitDateTo) {
      return false;
    }

    const visitorBudgetLow = visitor.budgetMin || visitor.expectedBudget;
    const visitorBudgetHigh = visitor.budgetMax || visitor.expectedBudget;
    if (minBudget !== null && !Number.isNaN(minBudget) && visitorBudgetHigh < minBudget) {
      return false;
    }
    if (maxBudget !== null && !Number.isNaN(maxBudget) && visitorBudgetLow > maxBudget) {
      return false;
    }

    if (filters.visitorStatus !== 'All' && visitor.visitorStatus !== filters.visitorStatus) {
      return false;
    }

    if (filters.enquiryType !== 'All' && visitor.enquiryType !== filters.enquiryType) {
      return false;
    }

    if (filters.petStatus !== 'All' && visitor.petStatus !== filters.petStatus) {
      return false;
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    const aKey = `${a.latestVisitDate}T${a.latestVisitTime || '00:00'}`;
    const bKey = `${b.latestVisitDate}T${b.latestVisitTime || '00:00'}`;
    switch (filters.sortBy) {
      case 'date-asc':
        return aKey.localeCompare(bKey);
      case 'budget-desc':
        return (b.budgetMax || b.expectedBudget) - (a.budgetMax || a.expectedBudget);
      case 'budget-asc':
        return (a.budgetMax || a.expectedBudget) - (b.budgetMax || b.expectedBudget);
      case 'name-asc':
        return a.fullName.localeCompare(b.fullName);
      case 'date-desc':
      default:
        return bKey.localeCompare(aKey);
    }
  });
}

export interface MonthlyTrendPoint {
  monthKey: string; // YYYY-MM
  label: string;
  visitors: number;
  completedVisits: number;
}

export interface BudgetBucket {
  label: string;
  count: number;
}

export interface StatusCount {
  status: VisitorStatus;
  count: number;
}

export interface BudgetFitStats {
  withinRent: number;
  belowRent: number;
  unspecified: number;
}

export interface DashboardMetrics {
  totalVisitors: number;
  totalCompletedVisits: number;
  upcomingVisits: number;
  interestedVisitors: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  finalisedDeals: number;
  rentalCount: number;
  purchaseCount: number;
  budgetFitStats: BudgetFitStats;
  monthlyTrends: MonthlyTrendPoint[];
  budgetDistribution: BudgetBucket[];
  statusBreakdown: StatusCount[];
  recentVisitors: VisitorProfile[];
  upcomingFollowUpList: FlattenedFollowUp[];
}

export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-');
  const date = new Date(Number(y), Number(m) - 1, 1);
  if (Number.isNaN(date.getTime())) return monthKey;
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export function computeDashboardMetrics(
  visitors: VisitorProfile[],
  referenceDate = getTodayIsoDate(),
  currency: CurrencySymbol = '₹',
  expectedMonthlyRent = 0
): DashboardMetrics {
  let totalCompletedVisits = 0;
  let upcomingVisits = 0;
  let interestedVisitors = 0;
  let finalisedDeals = 0;
  let rentalCount = 0;
  let purchaseCount = 0;
  let withinRent = 0;
  let belowRent = 0;
  let unspecified = 0;

  const statusMap = new Map<VisitorStatus, number>();
  for (const st of VISITOR_STATUSES) statusMap.set(st, 0);

  const monthVisitorSets = new Map<string, Set<string>>();
  const monthVisitCounts = new Map<string, number>();

  for (const visitor of visitors) {
    if (
      visitor.visitorStatus === 'Interested' ||
      visitor.visitorStatus === 'Negotiating'
    ) {
      interestedVisitors += 1;
    }
    if (visitor.visitorStatus === 'Finalised') {
      finalisedDeals += 1;
    }
    if (visitor.enquiryType === 'Rent') rentalCount += 1;
    else purchaseCount += 1;

    const maxBudget = visitor.budgetMax || visitor.expectedBudget || visitor.budgetMin || 0;
    if (maxBudget <= 0) {
      unspecified += 1;
    } else if (expectedMonthlyRent <= 0 || maxBudget >= expectedMonthlyRent) {
      withinRent += 1;
    } else {
      belowRent += 1;
    }

    statusMap.set(visitor.visitorStatus, (statusMap.get(visitor.visitorStatus) ?? 0) + 1);

    for (const visit of visitor.visits) {
      if (visit.visitedStatus === 'Yes') {
        totalCompletedVisits += 1;
      } else if (visit.visitedStatus === 'Scheduled' && visit.visitDate >= referenceDate) {
        upcomingVisits += 1;
      }

      if (visit.visitDate && visit.visitDate.length >= 7) {
        const monthKey = visit.visitDate.slice(0, 7);
        if (!monthVisitorSets.has(monthKey)) {
          monthVisitorSets.set(monthKey, new Set());
        }
        monthVisitorSets.get(monthKey)!.add(visitor.id);
        if (visit.visitedStatus === 'Yes') {
          monthVisitCounts.set(monthKey, (monthVisitCounts.get(monthKey) ?? 0) + 1);
        }
      }
    }
  }

  const followUpCats = categorizeFollowUps(visitors, referenceDate);
  const pendingFollowUps =
    followUpCats.today.length + followUpCats.upcoming.length + followUpCats.overdue.length;
  const overdueFollowUps = followUpCats.overdue.length;

  const sortedMonths = Array.from(monthVisitorSets.keys()).sort().slice(-6);
  const monthlyTrends: MonthlyTrendPoint[] = sortedMonths.map((monthKey) => ({
    monthKey,
    label: formatMonthLabel(monthKey),
    visitors: monthVisitorSets.get(monthKey)?.size ?? 0,
    completedVisits: monthVisitCounts.get(monthKey) ?? 0,
  }));

  const budgetDistribution = computeBudgetBuckets(visitors, currency);

  const statusBreakdown: StatusCount[] = VISITOR_STATUSES.map((status) => ({
    status,
    count: statusMap.get(status) ?? 0,
  })).filter((s) => s.count > 0);

  const recentVisitors = [...visitors]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  const upcomingFollowUpList = [
    ...followUpCats.overdue,
    ...followUpCats.today,
    ...followUpCats.upcoming,
  ].slice(0, 5);

  return {
    totalVisitors: visitors.length,
    totalCompletedVisits,
    upcomingVisits,
    interestedVisitors,
    pendingFollowUps,
    overdueFollowUps,
    finalisedDeals,
    rentalCount,
    purchaseCount,
    budgetFitStats: { withinRent, belowRent, unspecified },
    monthlyTrends,
    budgetDistribution,
    statusBreakdown,
    recentVisitors,
    upcomingFollowUpList,
  };
}

export function computeBudgetBuckets(
  visitors: VisitorProfile[],
  currency: CurrencySymbol = '₹'
): BudgetBucket[] {
  if (visitors.length === 0) return [];
  const withBudget = visitors.filter((v) => v.expectedBudget > 0);
  if (withBudget.length === 0) return [];

  const rentBudgets = withBudget
    .filter((v) => v.budgetType === 'Monthly rent')
    .map((v) => v.expectedBudget);
  const purchaseBudgets = withBudget
    .filter((v) => v.budgetType === 'Total purchase')
    .map((v) => v.expectedBudget);

  const buildBucketsForGroup = (
    values: number[],
    suffix: string,
    prefixLabel: string
  ): BudgetBucket[] => {
    if (values.length === 0) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const minFmt = formatCompactCurrency(min, currency);
    const maxFmt = formatCompactCurrency(max, currency);
    if (min === max || values.length === 1 || minFmt === maxFmt) {
      return [
        {
          label: `${prefixLabel}${minFmt}${suffix}`,
          count: values.length,
        },
      ];
    }
    const mid = Math.round((min + max) / 2);
    const midFmt = formatCompactCurrency(mid, currency);
    const nextFmt = formatCompactCurrency(mid + 1, currency);
    if (minFmt === midFmt && nextFmt === maxFmt) {
      return [
        {
          label: `${prefixLabel}${minFmt}–${maxFmt}${suffix}`,
          count: values.length,
        },
      ];
    }
    const lowCount = values.filter((v) => v <= mid).length;
    const highCount = values.length - lowCount;
    const result: BudgetBucket[] = [];
    if (lowCount > 0) {
      result.push({
        label:
          minFmt === midFmt
            ? `${prefixLabel}${minFmt}${suffix}`
            : `${prefixLabel}${minFmt}–${midFmt}${suffix}`,
        count: lowCount,
      });
    }
    if (highCount > 0) {
      result.push({
        label:
          nextFmt === maxFmt
            ? `${prefixLabel}${maxFmt}${suffix}`
            : `${prefixLabel}${nextFmt}–${maxFmt}${suffix}`,
        count: highCount,
      });
    }
    return result;
  };

  if (rentBudgets.length > 0 && purchaseBudgets.length > 0) {
    return [
      ...buildBucketsForGroup(rentBudgets, '/mo', 'Rent '),
      ...buildBucketsForGroup(purchaseBudgets, '', 'Buy '),
    ];
  }

  const budgets = withBudget.map((v) => v.expectedBudget);
  const suffix = rentBudgets.length === withBudget.length ? '/mo' : '';
  const max = Math.max(...budgets);
  const min = Math.min(...budgets);

  if (max === min) {
    return [{ label: `${formatCompactCurrency(min, currency)}${suffix}`, count: budgets.length }];
  }

  const step = Math.ceil((max - min) / 4) || 1;
  const b1 = min + step;
  const b2 = min + step * 2;
  const b3 = min + step * 3;

  const counts = [0, 0, 0, 0];
  for (const val of budgets) {
    if (val <= b1) counts[0] += 1;
    else if (val <= b2) counts[1] += 1;
    else if (val <= b3) counts[2] += 1;
    else counts[3] += 1;
  }

  return [
    { label: `${formatCompactCurrency(min, currency)}–${formatCompactCurrency(b1, currency)}${suffix}`, count: counts[0] },
    { label: `${formatCompactCurrency(b1 + 1, currency)}–${formatCompactCurrency(b2, currency)}${suffix}`, count: counts[1] },
    { label: `${formatCompactCurrency(b2 + 1, currency)}–${formatCompactCurrency(b3, currency)}${suffix}`, count: counts[2] },
    { label: `${formatCompactCurrency(b3 + 1, currency)}+${suffix}`, count: counts[3] },
  ];
}

export interface ReportsMetrics {
  filteredVisitorCount: number;
  monthlyCounts: MonthlyTrendPoint[];
  rentalEnquiries: number;
  purchaseEnquiries: number;
  interestedVisitors: number;
  finalisedDeals: number;
  conversionRatePct: number;
  budgetFitStats: BudgetFitStats;
  petStats: {
    hasPets: number;
    noPets: number;
    notSpecified: number;
  };
  visitStats: {
    visited: number;
    notVisited: number;
    scheduled: number;
    noShow: number;
  };
  budgetDistribution: BudgetBucket[];
}

export function computeReportsMetrics(
  visitors: VisitorProfile[],
  dateFrom = '',
  dateTo = '',
  currency: CurrencySymbol = '₹',
  expectedMonthlyRent = 0
): ReportsMetrics {
  const scoped = visitors.filter((v) => {
    if (dateFrom && v.latestVisitDate < dateFrom) return false;
    if (dateTo && v.latestVisitDate > dateTo) return false;
    return true;
  });

  let rentalEnquiries = 0;
  let purchaseEnquiries = 0;
  let interestedVisitors = 0;
  let finalisedDeals = 0;
  let withinRent = 0;
  let belowRent = 0;
  let unspecified = 0;
  let hasPets = 0;
  let noPets = 0;
  let notSpecified = 0;
  let visited = 0;
  let notVisited = 0;
  let scheduled = 0;
  let noShow = 0;

  const monthMap = new Map<string, { visitors: number; completedVisits: number }>();

  for (const v of scoped) {
    if (v.enquiryType === 'Rent') rentalEnquiries += 1;
    else purchaseEnquiries += 1;

    const maxBudget = v.budgetMax || v.expectedBudget || v.budgetMin || 0;
    if (maxBudget <= 0) {
      unspecified += 1;
    } else if (expectedMonthlyRent <= 0 || maxBudget >= expectedMonthlyRent) {
      withinRent += 1;
    } else {
      belowRent += 1;
    }

    if (v.visitorStatus === 'Interested' || v.visitorStatus === 'Negotiating') {
      interestedVisitors += 1;
    }
    if (v.visitorStatus === 'Finalised') {
      finalisedDeals += 1;
    }

    if (v.petStatus === 'Has pets') hasPets += 1;
    else if (v.petStatus === 'No pets') noPets += 1;
    else notSpecified += 1;

    const badge = resolveVisitBadgeState(v.latestVisitOutcome, v.visitorStatus);
    if (badge.label === 'Visited') visited += 1;
    else if (badge.label === 'Scheduled') scheduled += 1;
    else if (badge.label === 'No-show') noShow += 1;
    else notVisited += 1;

    if (v.latestVisitDate && v.latestVisitDate.length >= 7) {
      const mKey = v.latestVisitDate.slice(0, 7);
      const curr = monthMap.get(mKey) ?? { visitors: 0, completedVisits: 0 };
      curr.visitors += 1;
      if (v.latestVisitOutcome === 'Yes') curr.completedVisits += 1;
      monthMap.set(mKey, curr);
    }
  }

  const monthlyCounts: MonthlyTrendPoint[] = Array.from(monthMap.keys())
    .sort()
    .map((monthKey) => ({
      monthKey,
      label: formatMonthLabel(monthKey),
      visitors: monthMap.get(monthKey)!.visitors,
      completedVisits: monthMap.get(monthKey)!.completedVisits,
    }));

  const conversionRatePct =
    scoped.length > 0 ? Math.round((finalisedDeals / scoped.length) * 1000) / 10 : 0;

  return {
    filteredVisitorCount: scoped.length,
    monthlyCounts,
    rentalEnquiries,
    purchaseEnquiries,
    interestedVisitors,
    finalisedDeals,
    conversionRatePct,
    budgetFitStats: { withinRent, belowRent, unspecified },
    petStats: { hasPets, noPets, notSpecified },
    visitStats: { visited, notVisited, scheduled, noShow },
    budgetDistribution: computeBudgetBuckets(scoped, currency),
  };
}

export function formatCurrency(amount: number, currency: CurrencySymbol = '₹'): string {
  const locale = currency === '₹' ? 'en-IN' : 'en-US';
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(amount || 0);
  return currency === 'AED' ? `AED ${formatted}` : `${currency}${formatted}`;
}

export function formatCompactCurrency(amount: number, currency: CurrencySymbol = '₹'): string {
  const prefix = currency === 'AED' ? 'AED ' : currency;
  if (currency === '₹') {
    if (amount >= 10_000_000) {
      return `${prefix}${(amount / 10_000_000).toFixed(1).replace(/\.0$/, '')}Cr`;
    }
    if (amount >= 100_000) {
      return `${prefix}${(amount / 100_000).toFixed(1).replace(/\.0$/, '')}L`;
    }
    if (amount >= 1_000) {
      return `${prefix}${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
    }
    return `${prefix}${amount}`;
  }
  if (amount >= 1_000_000) {
    return `${prefix}${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (amount >= 100_000) {
    return `${prefix}${Math.round(amount / 1_000)}k`;
  }
  if (amount >= 1_000) {
    return `${prefix}${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return `${prefix}${amount}`;
}

export function formatPhoneForWhatsApp(phone: string): string {
  return normalizePhone(phone);
}

function escapeCsvCell(value: string | number | boolean | undefined): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportVisitorsToCsv(visitors: VisitorProfile[]): string {
  const headers = [
    'Visitor ID',
    'Full Name',
    'Contact Number',
    'Latest Visit Date',
    'Latest Visit Time',
    'Visited Outcome',
    'Visitor Status',
    'Rent Said to Visitor',
    'Budget Min',
    'Budget Max',
    'Expected Move-in Date',
    'People Staying',
    'Pet Status',
    'Total Visits Count',
    'Pending Follow-ups',
    'Description',
    'Additional Requirements',
    'Created At',
  ];

  const rows = visitors.map((v) => {
    const pendingCount = v.followUps.filter((f) => f.status === 'Pending').length;
    return [
      v.id,
      v.fullName,
      v.contactNumber,
      v.latestVisitDate,
      v.latestVisitTime,
      resolveVisitBadgeState(v.latestVisitOutcome, v.visitorStatus).label,
      v.visitorStatus,
      v.quotedRent ?? 0,
      v.budgetMin ?? 0,
      v.budgetMax ?? v.expectedBudget,
      v.moveInTimeline,
      v.latestPeopleCount,
      v.petStatus,
      v.visits.length,
      pendingCount,
      v.description,
      v.additionalRequirements,
      v.createdAt,
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  return [headers.map(escapeCsvCell).join(','), ...rows].join('\n');
}

export function createBackupPayload(
  apartment: ApartmentInfo,
  visitors: VisitorProfile[]
): CrmBackupPayload {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    appName: 'Apartment Visitor CRM',
    apartment,
    visitors,
  };
}

export function parseAndValidateBackup(jsonString: string): CrmBackupPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Invalid JSON file. Please select a valid Apartment Visitor CRM backup.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Backup file has an invalid structure.');
  }

  const obj = parsed as Record<string, unknown>;
  if (!obj.apartment || typeof obj.apartment !== 'object') {
    throw new Error('Backup file is missing apartment information.');
  }
  if (!Array.isArray(obj.visitors)) {
    throw new Error('Backup file is missing visitor records.');
  }

  for (const v of obj.visitors) {
    if (!v || typeof v !== 'object') {
      throw new Error('Backup contains an invalid visitor entry.');
    }
    const vis = v as Record<string, unknown>;
    if (typeof vis.id !== 'string' || typeof vis.fullName !== 'string' || typeof vis.contactNumber !== 'string') {
      throw new Error('Backup contains a visitor entry missing required fields.');
    }
    if (!Array.isArray(vis.visits) || !Array.isArray(vis.followUps) || !Array.isArray(vis.comments)) {
      throw new Error(`Visitor "${vis.fullName}" is missing history arrays.`);
    }
  }

  return parsed as CrmBackupPayload;
}
