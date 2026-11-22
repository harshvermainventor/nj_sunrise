import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Globe,
  MapPin,
  Phone,
  Send,
  User,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { ApartmentInfo, CurrencySymbol, RegistrationFormInput, VisitorProfile } from '../types/crm';
import { formatCurrency, getTodayIsoDate } from '../utils/crmLogic';
import { CalendarDatePicker } from './CalendarDatePicker';
import { TimePicker } from './TimePicker';

interface PublicPortalViewProps {
  apartment: ApartmentInfo;
  visitors: VisitorProfile[];
  currency: CurrencySymbol;
  onRegisterNew: (input: RegistrationFormInput) => void;
  onReturnToAdmin: () => void;
}

export const PublicPortalView: React.FC<PublicPortalViewProps> = ({
  apartment,
  currency,
  onRegisterNew,
  onReturnToAdmin,
}) => {
  const [fullName, setFullName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [peopleCount, setPeopleCount] = useState('2');
  const [visitDate, setVisitDate] = useState(getTodayIsoDate());
  const [visitTime, setVisitTime] = useState('11:00');
  const [budgetMin, setBudgetMin] = useState<number>(apartment.expectedMonthlyRent);
  const [budgetMax, setBudgetMax] = useState<number>(apartment.expectedMonthlyRent + 3000);
  const [moveInTimeline, setMoveInTimeline] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    const cleanPhone = contactNumber.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    const input: RegistrationFormInput = {
      fullName: fullName.trim(),
      contactNumber: cleanPhone,
      visitDate: visitDate || getTodayIsoDate(),
      visitTime,
      peopleCount,
      visitedStatus: 'Scheduled',
      enquiryType: 'Rent',
      quotedRent: apartment.expectedMonthlyRent,
      budgetMin,
      budgetMax,
      expectedBudget: budgetMax,
      budgetType: 'Monthly rent',
      moveInTimeline: moveInTimeline || 'Immediate',
      petStatus: 'Not specified',
      visitorStatus: 'New enquiry',
      visitorDescription: 'Online public portal enquiry',
      initialComments: message.trim() ? `Public web enquiry: ${message.trim()}` : 'Submitted via public internet rental listing portal.',
      followUpComments: '',
      additionalRequirements: '',
      followUpRequired: true,
      nextFollowUpDate: visitDate || getTodayIsoDate(),
      preferredFollowUpTime: visitTime || '11:00',
      followUpMethod: 'WhatsApp',
    };

    onRegisterNew(input);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      {/* Top Internet Announcement Banner */}
      <div className="bg-blue-600 text-white px-4 py-2 text-xs font-medium text-center flex items-center justify-center gap-2 shadow-sm">
        <Globe className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
        <span>Public Internet Rental Listing & Tenant Portal · Live across the web</span>
        <button
          type="button"
          onClick={onReturnToAdmin}
          className="ml-4 underline hover:text-blue-100 text-[11px] font-semibold"
        >
          Return to CRM Dashboard
        </button>
      </div>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Header Hero Card */}
        <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Verified Property Listing
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                Apartment {apartment.apartmentNumber}
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                Floor {apartment.floor} · {apartment.bedrooms} Bedrooms {apartment.sizeSqFt ? `· ${apartment.sizeSqFt}` : ''}
              </p>
            </div>

            <div className="text-left sm:text-right bg-zinc-50 dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <span className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Expected Monthly Rent
              </span>
              <span className="font-mono-num text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                {formatCurrency(apartment.expectedMonthlyRent, currency)}
                <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">/mo</span>
              </span>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    apartment.availabilityStatus === 'Available'
                      ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  ● {apartment.availabilityStatus}
                </span>
              </div>
            </div>
          </div>

          {apartment.notes && (
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              <strong className="text-zinc-950 dark:text-zinc-50 block mb-1">Property Highlights & Amenities:</strong>
              {apartment.notes}
            </div>
          )}
        </div>

        {/* Enquiry Form Card */}
        <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] p-6 sm:p-8 shadow-xl">
          {submitted ? (
            <div className="py-12 text-center space-y-4">
              <div className="h-16 w-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
              </div>
              <h2 className="font-display text-xl font-bold text-zinc-950 dark:text-zinc-50">
                Enquiry Successfully Sent!
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                Thank you, <strong>{fullName}</strong>. Your viewing request for Apartment {apartment.apartmentNumber} has been instantly delivered to the landlord/property manager. They will contact you shortly on <strong>{contactNumber}</strong>.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setFullName('');
                  setContactNumber('');
                  setMessage('');
                }}
                className="mt-4 px-5 py-2.5 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Submit Another Enquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="font-display text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  Book a Viewing or Enquire Online
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Fill in your details below to schedule a visit or request leasing information for Apartment {apartment.apartmentNumber}.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs font-medium text-red-800 dark:text-red-200">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="pub-name" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Your Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" aria-hidden="true" />
                    <input
                      id="pub-name"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 pl-10 pr-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="pub-phone" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Mobile Number (10 digits) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" aria-hidden="true" />
                    <input
                      id="pub-phone"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      required
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="e.g. 9876543210"
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 pl-10 pr-3.5 py-2.5 text-sm font-mono-num text-zinc-900 dark:text-zinc-100 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="pub-date" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Preferred Visit Date
                  </label>
                  <CalendarDatePicker
                    id="pub-date"
                    value={visitDate}
                    onChange={setVisitDate}
                    ariaLabel="Preferred visit date"
                  />
                </div>

                <div>
                  <label htmlFor="pub-time" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Preferred Visit Time
                  </label>
                  <TimePicker
                    id="pub-time"
                    value={visitTime}
                    onChange={setVisitTime}
                    ariaLabel="Preferred visit time"
                  />
                </div>

                <div>
                  <label htmlFor="pub-people" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    People Staying
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" aria-hidden="true" />
                    <input
                      id="pub-people"
                      type="text"
                      value={peopleCount}
                      onChange={(e) => setPeopleCount(e.target.value)}
                      placeholder="e.g. 2 Adults"
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 pl-10 pr-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="pub-movein" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Expected Move-in Timeline
                  </label>
                  <input
                    id="pub-movein"
                    type="text"
                    value={moveInTimeline}
                    onChange={(e) => setMoveInTimeline(e.target.value)}
                    placeholder="e.g. Next month / Immediate"
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="pub-msg" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Message / Special Questions for Landlord
                </label>
                <textarea
                  id="pub-msg"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. Interested in viewing this weekend. Do you have covered parking?"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-3 text-sm text-zinc-900 dark:text-zinc-100 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span>Submit Public Enquiry</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-zinc-400 dark:text-zinc-500 border-t border-zinc-200 dark:border-zinc-800">
        Apartment Visitor CRM & Public Tenant Portal · Powered by Offline-First PWA
      </footer>
    </div>
  );
};
