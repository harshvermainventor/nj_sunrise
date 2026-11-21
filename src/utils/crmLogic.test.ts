import test from 'node:test';
import assert from 'node:assert/strict';
import {
  categorizeFollowUps,
  computeDashboardMetrics,
  computeReportsMetrics,
  createBackupPayload,
  createDefaultApartmentInfo,
  createVisitorFromRegistration,
  exportVisitorsToCsv,
  filterAndSortVisitors,
  findDuplicateVisitorByPhone,
  formatBudgetRange,
  formatCurrency,
  formatIsoDateDisplay,
  formatPeopleStayingLabel,
  formatTime12h,
  isValidTenDigitPhone,
  mergeNewVisitIntoVisitor,
  normalizePhone,
  parseAndValidateBackup,
  phonesMatch,
  resolveVisitBadgeState,
  sanitizeTenDigitPhoneInput,
} from './crmLogic';
import { RegistrationFormInput, VisitorFilters } from '../types/crm';

function makeFormInput(overrides: Partial<RegistrationFormInput> = {}): RegistrationFormInput {
  return {
    fullName: 'Priya Sharma',
    contactNumber: '9876543210',
    visitDate: '2026-11-21',
    visitTime: '14:30',
    peopleCount: '2',
    visitedStatus: 'Yes',
    enquiryType: 'Rent',
    quotedRent: 25000,
    budgetMin: 20000,
    budgetMax: 24000,
    expectedBudget: 24000,
    budgetType: 'Monthly rent',
    moveInTimeline: '2026-12-01',
    petStatus: 'Has pets',
    visitorStatus: 'Interested',
    visitorDescription: 'Couple working remotely, looking for bright balcony.',
    initialComments: 'Loved the kitchen and morning light.',
    followUpComments: 'Send lease terms tomorrow.',
    additionalRequirements: '1 parking space',
    followUpRequired: true,
    nextFollowUpDate: '2026-11-22',
    preferredFollowUpTime: '11:00',
    followUpMethod: 'WhatsApp',
    ...overrides,
  };
}

test('default apartment uses Rupees (₹), formats Indian currency, and handles peopleStaying text', () => {
  const apt = createDefaultApartmentInfo();
  assert.equal(apt.currency, '₹');
  assert.equal(apt.expectedMonthlyRent, 25000);
  assert.equal(formatCurrency(25000, '₹'), '₹25,000');
  assert.equal(formatCurrency(125000, '₹'), '₹1,25,000');
  assert.equal(formatBudgetRange({ budgetMin: 20000, budgetMax: 24000 }, '₹'), '₹20,000 – ₹24,000/mo');
  assert.equal(formatPeopleStayingLabel(''), '');
  assert.equal(formatPeopleStayingLabel('3'), '3 people staying');
  assert.equal(formatPeopleStayingLabel('Couple + 1 kid'), 'Staying: Couple + 1 kid');
  assert.equal(formatIsoDateDisplay('2026-11-21'), '21 Nov 2026');
  assert.equal(formatIsoDateDisplay(''), '');
  assert.equal(formatTime12h('14:30'), '02:30 PM');
  assert.equal(formatTime12h('00:05'), '12:05 AM');
  assert.equal(formatTime12h('12:00'), '12:00 PM');
  assert.equal(formatTime12h(''), '');
});

test('phone normalization, 10-digit validation, and duplicate detection match across formatting', () => {
  assert.equal(normalizePhone('+91 (987) 654-3210'), '919876543210');
  assert.equal(sanitizeTenDigitPhoneInput('98765-43210-99'), '9876543210');
  assert.equal(isValidTenDigitPhone('9876543210'), true);
  assert.equal(isValidTenDigitPhone('987654321'), false);
  assert.equal(isValidTenDigitPhone('919876543210'), false);
  assert.equal(phonesMatch('+91 98765 43210', '9876543210'), true);
  assert.equal(phonesMatch('9876543210', '9876500000'), false);

  const v1 = createVisitorFromRegistration(makeFormInput());
  assert.equal(v1.latestVisitTime, ''); // Date is enough when visitedStatus === 'Yes'
  const dup = findDuplicateVisitorByPhone([v1], '98765-43210');
  assert.ok(dup);
  assert.equal(dup.id, v1.id);
  assert.equal(findDuplicateVisitorByPhone([v1], '98765-43210', v1.id), null);
});

test('mergeNewVisitIntoVisitor preserves historical visits without overwriting', () => {
  const initial = createVisitorFromRegistration(
    makeFormInput({
      visitDate: '2026-11-10',
      visitTime: '10:00',
      initialComments: 'First tour with agent.',
      quotedRent: 25000,
      budgetMin: 20000,
      budgetMax: 23000,
      visitorStatus: 'Visited',
      visitedStatus: 'Yes',
    }),
    'apt-primary',
    '2026-11-10T10:00:00.000Z'
  );

  const merged = mergeNewVisitIntoVisitor(
    initial,
    makeFormInput({
      visitDate: '2026-11-21',
      visitTime: '16:00',
      initialComments: 'Second viewing with partner.',
      quotedRent: 25000,
      budgetMin: 22000,
      budgetMax: 25000,
      visitorStatus: 'Negotiating',
      visitedStatus: 'Yes',
      petStatus: 'Has pets',
    }),
    '2026-11-21T16:00:00.000Z'
  );

  assert.equal(merged.visits.length, 2);
  assert.equal(merged.visits[0].visitDate, '2026-11-21');
  assert.equal(merged.visits[0].expectedBudget, 25000);
  assert.equal(merged.visits[1].visitDate, '2026-11-10');
  assert.equal(merged.visits[1].expectedBudget, 23000);
  assert.equal(merged.visits[1].initialComments, 'First tour with agent.');
  assert.equal(merged.expectedBudget, 25000);
  assert.equal(merged.visitorStatus, 'Negotiating');
});

test('visit status and pet status remain strictly independent', () => {
  assert.deepEqual(resolveVisitBadgeState('Yes', 'Interested'), { label: 'Visited', tone: 'green' });
  assert.deepEqual(resolveVisitBadgeState('No', 'New enquiry'), { label: 'Not visited', tone: 'red' });
  assert.deepEqual(resolveVisitBadgeState('Scheduled', 'Visit scheduled'), { label: 'Scheduled', tone: 'blue' });
  assert.deepEqual(resolveVisitBadgeState('No', 'No-show'), { label: 'No-show', tone: 'red' });

  const visitor = createVisitorFromRegistration(
    makeFormInput({ visitedStatus: 'Scheduled', visitorStatus: 'Visit scheduled', petStatus: 'Has pets' })
  );
  assert.equal(visitor.petStatus, 'Has pets');
  assert.equal(visitor.latestVisitOutcome, 'Scheduled');
  assert.equal(visitor.latestVisitTime, '14:30');
});

test('categorizeFollowUps separates Today, Upcoming, Overdue, and Completed', () => {
  const vToday = createVisitorFromRegistration(
    makeFormInput({ fullName: 'A', nextFollowUpDate: '2026-11-21', followUpRequired: true })
  );
  const vOverdue = createVisitorFromRegistration(
    makeFormInput({ fullName: 'B', contactNumber: '5550002222', nextFollowUpDate: '2026-11-19', followUpRequired: true })
  );
  const vUpcoming = createVisitorFromRegistration(
    makeFormInput({ fullName: 'C', contactNumber: '5550003333', nextFollowUpDate: '2026-11-25', followUpRequired: true })
  );
  vUpcoming.followUps.push({
    id: 'f-done',
    visitorId: vUpcoming.id,
    apartmentId: 'apt-primary',
    required: true,
    scheduledDate: '2026-11-18',
    preferredTime: '09:00',
    method: 'Phone call',
    notes: 'Called earlier',
    status: 'Completed',
    completedAt: '2026-11-18T09:15:00.000Z',
    createdAt: '2026-11-17T09:00:00.000Z',
    updatedAt: '2026-11-18T09:15:00.000Z',
  });

  const cats = categorizeFollowUps([vToday, vOverdue, vUpcoming], '2026-11-21');
  assert.equal(cats.today.length, 1);
  assert.equal(cats.today[0].visitor.fullName, 'A');
  assert.equal(cats.overdue.length, 1);
  assert.equal(cats.overdue[0].visitor.fullName, 'B');
  assert.equal(cats.upcoming.length, 1);
  assert.equal(cats.upcoming[0].visitor.fullName, 'C');
  assert.equal(cats.completed.length, 1);
});

test('filterAndSortVisitors filters by search, pet status, budget range, and sorts', () => {
  const v1 = createVisitorFromRegistration(
    makeFormInput({
      fullName: 'Alice Walker',
      contactNumber: '9991112222',
      budgetMin: 18000,
      budgetMax: 21000,
      petStatus: 'No pets',
      visitDate: '2026-11-15',
    })
  );
  const v2 = createVisitorFromRegistration(
    makeFormInput({
      fullName: 'Bob Martin',
      contactNumber: '9993334444',
      budgetMin: 24000,
      budgetMax: 28000,
      petStatus: 'Has pets',
      visitDate: '2026-11-20',
      visitorStatus: 'Finalised',
    })
  );

  const baseFilters: VisitorFilters = {
    search: '',
    visitDateFrom: '',
    visitDateTo: '',
    budgetMin: '',
    budgetMax: '',
    visitorStatus: 'All',
    enquiryType: 'All',
    petStatus: 'All',
    sortBy: 'budget-desc',
  };

  const allSorted = filterAndSortVisitors([v1, v2], baseFilters);
  assert.equal(allSorted[0].fullName, 'Bob Martin');

  const petFiltered = filterAndSortVisitors([v1, v2], { ...baseFilters, petStatus: 'No pets' });
  assert.equal(petFiltered.length, 1);
  assert.equal(petFiltered[0].fullName, 'Alice Walker');

  const budgetFiltered = filterAndSortVisitors([v1, v2], { ...baseFilters, budgetMin: '23000' });
  assert.equal(budgetFiltered.length, 1);
  assert.equal(budgetFiltered[0].fullName, 'Bob Martin');

  const phoneSearch = filterAndSortVisitors([v1, v2], { ...baseFilters, search: '3334444' });
  assert.equal(phoneSearch.length, 1);
  assert.equal(phoneSearch[0].fullName, 'Bob Martin');
});

test('dashboard and reports metrics accurately reflect saved rent records in Rupees', () => {
  const v1 = createVisitorFromRegistration(
    makeFormInput({
      fullName: 'Renter One',
      contactNumber: '1112223333',
      budgetMin: 20000,
      budgetMax: 23000,
      visitedStatus: 'Yes',
      visitorStatus: 'Interested',
      petStatus: 'No pets',
      visitDate: '2026-11-10',
      nextFollowUpDate: '2026-11-19',
    })
  );
  const v2 = createVisitorFromRegistration(
    makeFormInput({
      fullName: 'Renter Two',
      contactNumber: '4445556666',
      budgetMin: 24000,
      budgetMax: 26000,
      visitedStatus: 'Scheduled',
      visitorStatus: 'Finalised',
      petStatus: 'Has pets',
      visitDate: '2026-11-25',
      followUpRequired: false,
    })
  );

  const dash = computeDashboardMetrics([v1, v2], '2026-11-21', '₹', 25000);
  assert.equal(dash.totalVisitors, 2);
  assert.equal(dash.totalCompletedVisits, 1);
  assert.equal(dash.upcomingVisits, 1);
  assert.equal(dash.interestedVisitors, 1);
  assert.equal(dash.finalisedDeals, 1);
  assert.equal(dash.overdueFollowUps, 1);
  assert.equal(dash.pendingFollowUps, 1);
  assert.equal(dash.budgetFitStats.withinRent, 1);
  assert.equal(dash.budgetFitStats.belowRent, 1);

  const v3 = createVisitorFromRegistration(
    makeFormInput({
      fullName: 'Renter Three',
      contactNumber: '7778889999',
      budgetMin: 26000,
      budgetMax: 30000,
    })
  );
  const rep = computeReportsMetrics([v1, v2, v3], '2026-11-01', '2026-11-30', '₹', 25000);
  assert.equal(rep.conversionRatePct, 33.3);
  assert.equal(rep.petStats.hasPets, 2);
  assert.equal(rep.petStats.noPets, 1);
  assert.equal(rep.visitStats.visited, 2);
  assert.equal(rep.visitStats.scheduled, 1);
  assert.equal(rep.budgetFitStats.withinRent, 2);
  assert.equal(rep.budgetFitStats.belowRent, 1);
  assert.ok(rep.budgetDistribution.every((b) => b.label.includes('₹')));
  const labels = rep.budgetDistribution.map((b) => b.label);
  assert.equal(new Set(labels).size, labels.length);
});

test('backup export/restore and CSV export preserve data cleanly', () => {
  const apt = createDefaultApartmentInfo();
  const v1 = createVisitorFromRegistration(makeFormInput({ fullName: 'Jane, Doe' }));
  const backupJson = JSON.stringify(createBackupPayload(apt, [v1]));
  const restored = parseAndValidateBackup(backupJson);
  assert.equal(restored.visitors.length, 1);
  assert.equal(restored.visitors[0].fullName, 'Jane, Doe');
  assert.equal(restored.apartment.apartmentNumber, apt.apartmentNumber);

  const csv = exportVisitorsToCsv([v1]);
  assert.ok(csv.includes('"Jane, Doe"'));
  assert.ok(csv.includes('Rent Said to Visitor'));
  assert.ok(csv.includes('Expected Move-in Date'));
  assert.ok(csv.includes('Has pets'));
  assert.throws(() => parseAndValidateBackup('{bad json'));
});
