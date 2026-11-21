export const DEFAULT_APARTMENT_ID = 'apt-primary';

export type VisitedAnswer = 'Yes' | 'No' | 'Scheduled' | 'No-show';

export type EnquiryType = 'Rent' | 'Purchase';

export type BudgetType = 'Monthly rent' | 'Total purchase';

export type PetStatus = 'Has pets' | 'No pets' | 'Not specified';

export type VisitorStatus =
  | 'New enquiry'
  | 'Visit scheduled'
  | 'Visited'
  | 'Interested'
  | 'Follow-up required'
  | 'Negotiating'
  | 'Finalised'
  | 'Not interested'
  | 'No-show';

export type FollowUpMethod = 'Phone call' | 'WhatsApp' | 'SMS' | 'Email' | 'In-person';

export type ApartmentAvailability =
  | 'Available'
  | 'Under Negotiation'
  | 'Rented'
  | 'Sold'
  | 'Maintenance';

export type CurrencySymbol = '$' | '₹' | '£' | '€' | 'AED';

export interface ApartmentInfo {
  id: string;
  apartmentNumber: string;
  floor: string;
  bedrooms: number;
  sizeSqFt?: string;
  expectedMonthlyRent: number;
  expectedSalePrice: number;
  availabilityStatus: ApartmentAvailability;
  currency: CurrencySymbol;
  notes: string;
  updatedAt: string;
}

export interface VisitRecord {
  id: string;
  apartmentId: string;
  visitDate: string; // YYYY-MM-DD
  visitTime: string; // HH:mm (optional when visitedStatus === 'Yes')
  peopleCount: string | number;
  visitedStatus: VisitedAnswer;
  enquiryType: EnquiryType;
  quotedRent?: number;
  budgetMin?: number;
  budgetMax?: number;
  expectedBudget: number;
  budgetType: BudgetType;
  moveInTimeline: string;
  visitorStatus: VisitorStatus;
  visitorDescription: string;
  initialComments: string;
  followUpComments: string;
  additionalRequirements: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommentEntry {
  id: string;
  text: string;
  type: 'Note' | 'Follow-up' | 'Visit';
  createdAt: string;
}

export interface FollowUpEntry {
  id: string;
  visitorId: string;
  visitId?: string;
  apartmentId: string;
  required: boolean;
  scheduledDate: string; // YYYY-MM-DD
  preferredTime: string; // HH:mm
  method: FollowUpMethod;
  notes: string;
  status: 'Pending' | 'Completed';
  completedAt?: string;
  notifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VisitorProfile {
  id: string;
  apartmentId: string;
  fullName: string;
  contactNumber: string;
  normalizedPhone: string;
  petStatus: PetStatus;
  enquiryType: EnquiryType;
  quotedRent?: number;
  budgetMin?: number;
  budgetMax?: number;
  expectedBudget: number;
  budgetType: BudgetType;
  moveInTimeline: string;
  visitorStatus: VisitorStatus;
  latestVisitOutcome: VisitedAnswer;
  latestVisitDate: string;
  latestVisitTime: string;
  latestPeopleCount: string | number;
  description: string;
  additionalRequirements: string;
  visits: VisitRecord[];
  comments: CommentEntry[];
  followUps: FollowUpEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface RegistrationFormInput {
  fullName: string;
  contactNumber: string;
  visitDate: string;
  visitTime: string;
  peopleCount: string;
  visitedStatus: VisitedAnswer;
  enquiryType: EnquiryType;
  quotedRent: number;
  budgetMin: number;
  budgetMax: number;
  expectedBudget: number;
  budgetType: BudgetType;
  moveInTimeline: string;
  petStatus: PetStatus;
  visitorStatus: VisitorStatus;
  visitorDescription: string;
  initialComments: string;
  followUpComments: string;
  additionalRequirements: string;
  followUpRequired: boolean;
  nextFollowUpDate: string;
  preferredFollowUpTime: string;
  followUpMethod: FollowUpMethod;
}

export interface VisitorFilters {
  search: string;
  visitDateFrom: string;
  visitDateTo: string;
  budgetMin: string;
  budgetMax: string;
  visitorStatus: VisitorStatus | 'All';
  enquiryType: EnquiryType | 'All';
  petStatus: PetStatus | 'All';
  sortBy: 'date-desc' | 'date-asc' | 'budget-desc' | 'budget-asc' | 'name-asc';
}

export interface CrmBackupPayload {
  schemaVersion: number;
  exportedAt: string;
  appName: 'Apartment Visitor CRM';
  apartment: ApartmentInfo;
  visitors: VisitorProfile[];
}

export type AppView =
  | 'dashboard'
  | 'register'
  | 'directory'
  | 'followups'
  | 'reports'
  | 'settings';
