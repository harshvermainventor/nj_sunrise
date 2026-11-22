import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CurrencySymbol,
  FollowUpMethod,
  PetStatus,
  RegistrationFormInput,
  VisitedAnswer,
  VisitorProfile,
  VisitorStatus,
} from '../types/crm';
import {
  PET_STATUSES,
  VISITOR_STATUSES,
  findDuplicateVisitorByPhone,
  formatBudgetRange,
  formatCurrency,
  formatIsoDateDisplay,
  formatPeopleStayingLabel,
  formatTime12h,
  getTodayIsoDate,
  isValidTenDigitPhone,
  sanitizeTenDigitPhoneInput,
} from '../utils/crmLogic';
import { CalendarDatePicker } from './CalendarDatePicker';
import { PetStatusBadge, VisitStatusBadge } from './StatusBadges';
import { TimePicker } from './TimePicker';
import {
  clearRegistrationDraft,
  loadRegistrationDraft,
  saveRegistrationDraft,
} from '../utils/storage';

interface RegisterVisitorViewProps {
  visitors: VisitorProfile[];
  currency: CurrencySymbol;
  onRegisterNew: (input: RegistrationFormInput) => void;
  onMergeExisting: (existingVisitorId: string, input: RegistrationFormInput) => void;
  onOpenVisitorProfile: (visitor: VisitorProfile) => void;
}

const STEPS = [
  { id: 0, shortLabel: 'Basic Info', fullLabel: '01. Basic Information' },
  { id: 1, shortLabel: 'Rent & Budget', fullLabel: '02. Rent, Budget & Move-in' },
  { id: 2, shortLabel: 'Status', fullLabel: '03. Visitor Status' },
  { id: 3, shortLabel: 'Notes', fullLabel: '04. Notes & Descriptions' },
  { id: 4, shortLabel: 'Follow-up', fullLabel: '05. Follow-up & Save' },
] as const;

function createInitialForm(): RegistrationFormInput {
  const today = getTodayIsoDate();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = getTodayIsoDate(tomorrowDate);

  return {
    fullName: '',
    contactNumber: '',
    visitDate: today,
    visitTime: '11:00',
    peopleCount: '',
    visitedStatus: 'Scheduled',
    enquiryType: 'Rent',
    quotedRent: 0,
    budgetMin: 0,
    budgetMax: 0,
    expectedBudget: 0,
    budgetType: 'Monthly rent',
    moveInTimeline: '',
    petStatus: 'Not specified',
    visitorStatus: 'New enquiry',
    visitorDescription: '',
    initialComments: '',
    followUpComments: '',
    additionalRequirements: '',
    followUpRequired: false,
    nextFollowUpDate: tomorrow,
    preferredFollowUpTime: '10:30',
    followUpMethod: 'Phone call',
  };
}

export const RegisterVisitorView: React.FC<RegisterVisitorViewProps> = ({
  visitors,
  currency,
  onRegisterNew,
  onMergeExisting,
  onOpenVisitorProfile,
}) => {
  const [initialDraft] = useState(() => loadRegistrationDraft(createInitialForm()));
  const [form, setForm] = useState<RegistrationFormInput>(() => initialDraft.form);
  const [currentStep, setCurrentStep] = useState<number>(() => initialDraft.step);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [pendingDuplicate, setPendingDuplicate] = useState<VisitorProfile | null>(null);

  const topRef = useRef<HTMLDivElement | null>(null);
  const isInitialMount = useRef(true);

  // Auto-save in-progress registration draft to device storage cache
  useEffect(() => {
    const hasDraftContent =
      currentStep > 0 ||
      form.fullName.trim() !== '' ||
      form.contactNumber !== '' ||
      String(form.peopleCount).trim() !== '' ||
      form.quotedRent > 0 ||
      form.budgetMin > 0 ||
      form.budgetMax > 0 ||
      form.moveInTimeline !== '' ||
      form.visitorDescription.trim() !== '' ||
      form.initialComments.trim() !== '' ||
      form.followUpComments.trim() !== '' ||
      form.additionalRequirements.trim() !== '' ||
      form.followUpRequired;

    if (hasDraftContent) {
      saveRegistrationDraft(form, currentStep);
    } else {
      clearRegistrationDraft();
    }
  }, [form, currentStep]);

  // Scroll automatically to top whenever moving between categories
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentStep]);

  const liveMatch = useMemo(() => {
    if (!isValidTenDigitPhone(form.contactNumber)) return null;
    return findDuplicateVisitorByPhone(visitors, form.contactNumber);
  }, [visitors, form.contactNumber]);

  const updateField = <K extends keyof RegistrationFormInput>(
    key: K,
    value: RegistrationFormInput[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrorMsg(null);
    setSuccessMsg(null);
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handlePhoneChange = (rawValue: string) => {
    const digitsOnly = sanitizeTenDigitPhoneInput(rawValue);
    updateField('contactNumber', digitsOnly);
  };

  const handleVisitedChange = (nextVisited: VisitedAnswer) => {
    setForm((prev) => {
      let nextStatus = prev.visitorStatus;
      if (
        nextVisited === 'Yes' &&
        (prev.visitorStatus === 'New enquiry' || prev.visitorStatus === 'Visit scheduled')
      ) {
        nextStatus = 'Visited';
      } else if (nextVisited === 'Scheduled' && prev.visitorStatus === 'New enquiry') {
        nextStatus = 'Visit scheduled';
      }
      const nextDate = prev.visitDate || getTodayIsoDate();
      return {
        ...prev,
        visitedStatus: nextVisited,
        visitorStatus: nextStatus,
        visitDate: nextDate,
        visitTime: nextVisited === 'Yes' ? '' : prev.visitTime || '11:00',
      };
    });
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.visitDate;
      return next;
    });
  };

  const validateStep = (stepIndex: number): boolean => {
    const errs: Record<string, string> = {};

    if (stepIndex === 0) {
      if (!form.fullName.trim()) {
        errs.fullName = 'Please enter the visitor full name.';
      }
      if (!isValidTenDigitPhone(form.contactNumber)) {
        errs.contactNumber = 'Please enter an exact 10-digit mobile number.';
      }
      if (
        (form.visitedStatus === 'Scheduled' || form.visitedStatus === 'Yes') &&
        !form.visitDate
      ) {
        errs.visitDate =
          form.visitedStatus === 'Scheduled'
            ? 'Please select the planned visit date.'
            : 'Please select the visit date.';
      }
    }

    if (stepIndex === 1) {
      if (form.budgetMin > 0 && form.budgetMax > 0 && form.budgetMin > form.budgetMax) {
        errs.budgetMax = 'Maximum budget must be greater than or equal to minimum budget.';
      }
    }

    if (stepIndex === 4) {
      if (form.followUpRequired && !form.nextFollowUpDate) {
        errs.nextFollowUpDate = 'Please select a next follow-up date.';
      }
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setErrorMsg(Object.values(errs)[0]);
      return false;
    }

    setFieldErrors({});
    setErrorMsg(null);
    return true;
  };

  const goToStep = (targetStep: number) => {
    if (targetStep === currentStep) return;
    if (targetStep > currentStep) {
      // Validate current step before moving forward
      for (let i = currentStep; i < targetStep; i += 1) {
        if (!validateStep(i)) {
          setCurrentStep(i);
          return;
        }
      }
      setDirection(1);
    } else {
      setErrorMsg(null);
      setFieldErrors({});
      setDirection(-1);
    }
    setCurrentStep(targetStep);
  };

  const handleNextStep = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < STEPS.length - 1) {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    }
  };

  const handlePrevStep = () => {
    setErrorMsg(null);
    setFieldErrors({});
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    }
  };

  const handleFinalSubmit = () => {
    if (!validateStep(0)) {
      setDirection(-1);
      setCurrentStep(0);
      return;
    }
    if (!validateStep(4)) {
      setCurrentStep(4);
      return;
    }

    const preparedInput: RegistrationFormInput = {
      ...form,
      fullName: form.fullName.trim(),
      contactNumber: sanitizeTenDigitPhoneInput(form.contactNumber),
      visitDate: form.visitDate || getTodayIsoDate(),
    };

    const duplicate = findDuplicateVisitorByPhone(visitors, preparedInput.contactNumber);
    if (duplicate) {
      setPendingDuplicate(duplicate);
      return;
    }

    onRegisterNew(preparedInput);
    clearRegistrationDraft();
    setSuccessMsg(`Saved ${preparedInput.fullName} to your visitor directory.`);
    setForm(createInitialForm());
    setCurrentStep(0);
    setFieldErrors({});
    setErrorMsg(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Pressing Enter in Steps 1–4 moves horizontally to the next category instead of submitting early
    if (currentStep < STEPS.length - 1) {
      handleNextStep();
      return;
    }
    handleFinalSubmit();
  };

  const confirmMergeIntoExisting = () => {
    if (!pendingDuplicate) return;
    const preparedInput: RegistrationFormInput = {
      ...form,
      fullName: form.fullName.trim(),
      contactNumber: sanitizeTenDigitPhoneInput(form.contactNumber),
      visitDate: form.visitDate || getTodayIsoDate(),
    };
    onMergeExisting(pendingDuplicate.id, preparedInput);
    clearRegistrationDraft();
    setSuccessMsg(
      `Added new visit to ${pendingDuplicate.fullName}'s profile. Previous visits preserved.`
    );
    setPendingDuplicate(null);
    setForm(createInitialForm());
    setCurrentStep(0);
  };

  const confirmCreateSeparate = () => {
    const preparedInput: RegistrationFormInput = {
      ...form,
      fullName: form.fullName.trim(),
      contactNumber: sanitizeTenDigitPhoneInput(form.contactNumber),
      visitDate: form.visitDate || getTodayIsoDate(),
    };
    onRegisterNew(preparedInput);
    clearRegistrationDraft();
    setSuccessMsg(`Created a separate visitor profile for ${preparedInput.fullName}.`);
    setPendingDuplicate(null);
    setForm(createInitialForm());
    setCurrentStep(0);
  };

  const inputClass =
    'w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-blue-600 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20';
  const labelClass = 'block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5';

  const progressPct = Math.round(((currentStep + 1) / STEPS.length) * 100);

  return (
    <div ref={topRef} className="max-w-4xl mx-auto space-y-4 scroll-mt-20">
      {successMsg && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Integrated Horizontal Wizard Card */}
      <form
        onSubmit={handleFormSubmit}
        noValidate
        className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] overflow-x-clip"
      >
        {/* Slim Integrated Stepper Header */}
        <div className="px-4 pt-3.5 pb-3 sm:px-6 sm:pt-4 border-b border-zinc-100 dark:border-zinc-800 space-y-3">
          <nav aria-label="Registration categories" className="grid grid-cols-5 gap-1.5">
            {STEPS.map((step, index) => {
              const isActive = currentStep === index;
              const isCompleted = index < currentStep;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => goToStep(index)}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={step.fullLabel}
                  className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-medium transition-colors min-h-[40px] whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold'
                      : isCompleted
                      ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-mono-num shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {isCompleted ? <Check className="h-3 w-3" aria-hidden="true" /> : index + 1}
                  </span>
                  <span className="hidden sm:inline truncate">{step.shortLabel}</span>
                </button>
              );
            })}
          </nav>

          {/* Thin Progress Track */}
          <div className="h-1 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <div
              style={{ width: `${progressPct}%` }}
              className="h-full rounded-full bg-blue-600 transition-all duration-200"
            />
          </div>

          {/* Single Clean Step Title */}
          <div className="flex items-start justify-between gap-3 pt-0.5">
            <div>
              <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-zinc-50">
                {STEPS[currentStep].fullLabel}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {currentStep === 0 && 'Visitor identity, 10-digit mobile number, people staying, and visit schedule'}
                {currentStep === 1 && 'Monthly rent quoted, visitor budget range in ₹, move-in date, and pet status'}
                {currentStep === 2 && 'Select the visitor’s current stage in your pipeline'}
                {currentStep === 3 && 'Visitor background, viewing impressions, and special requests'}
                {currentStep === 4 && 'Follow-up reminder schedule and final summary'}
              </p>
            </div>
            <span className="font-mono-num text-xs font-medium text-zinc-500 dark:text-zinc-400 shrink-0 pt-0.5">
              {currentStep + 1} / {STEPS.length}
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {errorMsg && (
            <div
              role="alert"
              className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-200 dark:border-red-800/70 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-xs font-medium text-red-800 dark:text-red-200"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: direction * 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -18 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* STEP 1: Basic Information */}
              {currentStep === 0 && (
                <div className="space-y-3.5">
                  {liveMatch && (
                    <div className="rounded-xl border border-blue-200 dark:border-blue-800/70 bg-blue-50 dark:bg-blue-950/40 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 dark:text-blue-200">
                          <UserCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>Returning visitor recognised: {liveMatch.fullName}</span>
                        </div>
                        <p className="text-xs text-blue-800 dark:text-blue-300">
                          {liveMatch.visits.length} prior visit{liveMatch.visits.length === 1 ? '' : 's'} ·
                          Saving will prompt to add this visit without overwriting history.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenVisitorProfile(liveMatch)}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-700 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 whitespace-nowrap shrink-0"
                      >
                        View Profile
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                    <div>
                      <label htmlFor="reg-full-name" className={labelClass}>
                        Full name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="reg-full-name"
                        type="text"
                        value={form.fullName}
                        onChange={(e) => updateField('fullName', e.target.value)}
                        placeholder="e.g. Priya Sharma"
                        className={`${inputClass} ${
                          fieldErrors.fullName ? 'border-red-500 dark:border-red-500' : ''
                        }`}
                      />
                      {fieldErrors.fullName && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                          {fieldErrors.fullName}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="reg-contact-number" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Contact number (10 digits) <span className="text-red-500">*</span>
                        </label>
                        <span
                          className={`font-mono-num text-[11px] ${
                            form.contactNumber.length === 10
                              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                              : 'text-zinc-400 dark:text-zinc-500'
                          }`}
                        >
                          {form.contactNumber.length}/10 digits
                        </span>
                      </div>
                      <input
                        id="reg-contact-number"
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={form.contactNumber}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className={`${inputClass} font-mono-num ${
                          fieldErrors.contactNumber ? 'border-red-500 dark:border-red-500' : ''
                        }`}
                      />
                      {fieldErrors.contactNumber && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                          {fieldErrors.contactNumber}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="reg-people-staying" className={labelClass}>
                        Number of people staying
                      </label>
                      <input
                        id="reg-people-staying"
                        type="text"
                        value={form.peopleCount}
                        onChange={(e) => updateField('peopleCount', e.target.value)}
                        placeholder="e.g. 2"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <span className={labelClass}>Whether they actually visited / planned</span>
                      <div className="grid grid-cols-3 gap-2">
                        {(
                          [
                            { val: 'Yes', label: 'Yes' },
                            { val: 'Scheduled', label: 'Planned' },
                            { val: 'No', label: 'No' },
                          ] as { val: VisitedAnswer; label: string }[]
                        ).map((opt) => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => handleVisitedChange(opt.val)}
                            className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-colors min-h-[42px] ${
                              form.visitedStatus === opt.val
                                ? opt.val === 'Yes'
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : opt.val === 'No'
                                  ? 'bg-red-600 text-white border-red-600'
                                  : 'bg-blue-600 text-white border-blue-600'
                                : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {form.visitedStatus === 'Yes' && (
                      <div>
                        <label htmlFor="reg-visit-date" className={labelClass}>
                          Visit date <span className="text-red-500">*</span>
                        </label>
                        <CalendarDatePicker
                          id="reg-visit-date"
                          value={form.visitDate}
                          onChange={(val) => updateField('visitDate', val)}
                          hasError={Boolean(fieldErrors.visitDate)}
                          ariaLabel="Visit date"
                        />
                        {fieldErrors.visitDate && (
                          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                            {fieldErrors.visitDate}
                          </p>
                        )}
                      </div>
                    )}

                    {form.visitedStatus === 'Scheduled' && (
                      <>
                        <div>
                          <label htmlFor="reg-visit-date" className={labelClass}>
                            Planned visit date <span className="text-red-500">*</span>
                          </label>
                          <CalendarDatePicker
                            id="reg-visit-date"
                            value={form.visitDate}
                            onChange={(val) => updateField('visitDate', val)}
                            hasError={Boolean(fieldErrors.visitDate)}
                            ariaLabel="Planned visit date"
                          />
                          {fieldErrors.visitDate && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {fieldErrors.visitDate}
                            </p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="reg-visit-time" className={labelClass}>
                            Planned visit time
                          </label>
                          <TimePicker
                            id="reg-visit-time"
                            value={form.visitTime}
                            onChange={(val) => updateField('visitTime', val)}
                            ariaLabel="Planned visit time"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2: Rent, Budget Range & Move-in */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="reg-quoted-rent" className={labelClass}>
                        Rent said to them ({currency}/month)
                      </label>
                      <input
                        id="reg-quoted-rent"
                        type="number"
                        min={0}
                        step="any"
                        value={form.quotedRent || ''}
                        onChange={(e) => updateField('quotedRent', Math.max(0, Number(e.target.value) || 0))}
                        placeholder="e.g. 25000"
                        className={`${inputClass} font-mono-num`}
                      />
                    </div>

                    <div>
                      <label htmlFor="reg-move-in-date" className={labelClass}>
                        Expected move-in date
                      </label>
                      <CalendarDatePicker
                        id="reg-move-in-date"
                        value={form.moveInTimeline}
                        onChange={(val) => updateField('moveInTimeline', val)}
                        placeholder="Choose move-in date"
                        allowClear
                        ariaLabel="Expected move-in date"
                      />
                    </div>

                    <div>
                      <label htmlFor="reg-budget-min" className={labelClass}>
                        Visitor budget range — Minimum ({currency}/month)
                      </label>
                      <input
                        id="reg-budget-min"
                        type="number"
                        min={0}
                        step="any"
                        value={form.budgetMin || ''}
                        onChange={(e) => {
                          const nextMin = Math.max(0, Number(e.target.value) || 0);
                          updateField('budgetMin', nextMin);
                        }}
                        placeholder="e.g. 20000"
                        className={`${inputClass} font-mono-num`}
                      />
                    </div>

                    <div>
                      <label htmlFor="reg-budget-max" className={labelClass}>
                        Visitor budget range — Maximum ({currency}/month)
                      </label>
                      <input
                        id="reg-budget-max"
                        type="number"
                        min={0}
                        step="any"
                        value={form.budgetMax || ''}
                        onChange={(e) => {
                          const nextMax = Math.max(0, Number(e.target.value) || 0);
                          updateField('budgetMax', nextMax);
                        }}
                        placeholder="e.g. 24000"
                        className={`${inputClass} font-mono-num ${
                          fieldErrors.budgetMax ? 'border-red-500 dark:border-red-500' : ''
                        }`}
                      />
                      {fieldErrors.budgetMax && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                          {fieldErrors.budgetMax}
                        </p>
                      )}
                    </div>
                  </div>

                  {(form.quotedRent > 0 || form.budgetMin > 0 || form.budgetMax > 0) && (
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-xs text-zinc-600 dark:text-zinc-300 flex flex-wrap gap-3">
                      {form.quotedRent > 0 && (
                        <span>
                          Rent said:{' '}
                          <strong className="font-mono-num text-zinc-950 dark:text-zinc-50">
                            {formatCurrency(form.quotedRent, currency)}/mo
                          </strong>
                        </span>
                      )}
                      {(form.budgetMin > 0 || form.budgetMax > 0) && (
                        <span>
                          Budget range:{' '}
                          <strong className="font-mono-num text-zinc-950 dark:text-zinc-50">
                            {formatBudgetRange(
                              { budgetMin: form.budgetMin, budgetMax: form.budgetMax },
                              currency
                            )}
                          </strong>
                        </span>
                      )}
                    </div>
                  )}

                  <div>
                    <span className={labelClass}>Pet status (independent indicator)</span>
                    <div className="grid grid-cols-3 gap-2">
                      {PET_STATUSES.map((pet) => (
                        <button
                          key={pet}
                          type="button"
                          onClick={() => updateField('petStatus', pet as PetStatus)}
                          className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-colors min-h-[42px] ${
                            form.petStatus === pet
                              ? pet === 'Has pets'
                                ? 'bg-red-600 text-white border-red-600'
                                : pet === 'No pets'
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                              : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          {pet}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Visitor Status */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="reg-visitor-status" className={labelClass}>
                      Select pipeline status
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {VISITOR_STATUSES.map((status) => {
                        const active = form.visitorStatus === status;
                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => updateField('visitorStatus', status)}
                            className={`py-3 px-3.5 rounded-xl border text-xs font-semibold text-left transition-colors min-h-[44px] ${
                              active
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                            }`}
                          >
                            {status}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <select
                    id="reg-visitor-status"
                    aria-label="Pipeline status"
                    value={form.visitorStatus}
                    onChange={(e) => updateField('visitorStatus', e.target.value as VisitorStatus)}
                    className="sr-only"
                  >
                    {VISITOR_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* STEP 4: Notes & Descriptions */}
              {currentStep === 3 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="reg-description" className={labelClass}>
                      Description of the visitors
                    </label>
                    <textarea
                      id="reg-description"
                      rows={3}
                      value={form.visitorDescription}
                      onChange={(e) => updateField('visitorDescription', e.target.value)}
                      placeholder="e.g. Young family of 3 relocating for work"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-initial-comments" className={labelClass}>
                      Initial comments
                    </label>
                    <textarea
                      id="reg-initial-comments"
                      rows={3}
                      value={form.initialComments}
                      onChange={(e) => updateField('initialComments', e.target.value)}
                      placeholder="e.g. Liked the natural light and quiet floor"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-followup-comments" className={labelClass}>
                      Follow-up comments
                    </label>
                    <textarea
                      id="reg-followup-comments"
                      rows={2}
                      value={form.followUpComments}
                      onChange={(e) => updateField('followUpComments', e.target.value)}
                      placeholder="e.g. Wants to confirm parking dimensions"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-additional-reqs" className={labelClass}>
                      Additional requirements
                    </label>
                    <textarea
                      id="reg-additional-reqs"
                      rows={2}
                      value={form.additionalRequirements}
                      onChange={(e) => updateField('additionalRequirements', e.target.value)}
                      placeholder="e.g. Needs covered bike storage or furnished option"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              {/* STEP 5: Follow-up & Save */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-3.5">
                    <div>
                      <span className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                        Follow-up required?
                      </span>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Schedule a reminder in your Follow-ups queue
                      </p>
                    </div>
                    <div className="inline-flex rounded-xl border border-zinc-200 dark:border-zinc-700 p-0.5 bg-white dark:bg-zinc-950 self-start">
                      <button
                        type="button"
                        onClick={() => updateField('followUpRequired', true)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          form.followUpRequired
                            ? 'bg-blue-600 text-white'
                            : 'text-zinc-600 dark:text-zinc-300'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField('followUpRequired', false)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          !form.followUpRequired
                            ? 'bg-zinc-900 dark:bg-zinc-200 text-white dark:text-zinc-900'
                            : 'text-zinc-600 dark:text-zinc-300'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {form.followUpRequired && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="reg-followup-date" className={labelClass}>
                          Next follow-up date
                        </label>
                        <CalendarDatePicker
                          id="reg-followup-date"
                          value={form.nextFollowUpDate}
                          onChange={(val) => updateField('nextFollowUpDate', val)}
                          hasError={Boolean(fieldErrors.nextFollowUpDate)}
                          ariaLabel="Next follow-up date"
                        />
                      </div>

                      <div>
                        <label htmlFor="reg-followup-time" className={labelClass}>
                          Preferred follow-up time
                        </label>
                        <TimePicker
                          id="reg-followup-time"
                          value={form.preferredFollowUpTime}
                          onChange={(val) => updateField('preferredFollowUpTime', val)}
                          ariaLabel="Preferred follow-up time"
                        />
                      </div>

                      <div>
                        <label htmlFor="reg-followup-method" className={labelClass}>
                          Follow-up method
                        </label>
                        <select
                          id="reg-followup-method"
                          value={form.followUpMethod}
                          onChange={(e) =>
                            updateField('followUpMethod', e.target.value as FollowUpMethod)
                          }
                          className={inputClass}
                        >
                          <option value="Phone call">Phone call</option>
                          <option value="WhatsApp">WhatsApp</option>
                          <option value="SMS">SMS</option>
                          <option value="Email">Email</option>
                          <option value="In-person">In-person</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Concise Summary Preview before Saving */}
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-4 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-zinc-950 dark:text-zinc-50">
                        Summary: {form.fullName || 'Unnamed Visitor'}
                      </span>
                      <div className="flex items-center gap-2">
                        <VisitStatusBadge
                          visitedStatus={form.visitedStatus}
                          visitorStatus={form.visitorStatus}
                          compact
                        />
                        <PetStatusBadge petStatus={form.petStatus} compact />
                      </div>
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 flex flex-wrap gap-2">
                      <span className="font-mono-num">{form.contactNumber || 'No number'}</span>
                      {formatPeopleStayingLabel(form.peopleCount) && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{formatPeopleStayingLabel(form.peopleCount)}</span>
                        </>
                      )}
                      {form.quotedRent > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Rent said: {formatCurrency(form.quotedRent, currency)}/mo</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span>
                        Budget:{' '}
                        {formatBudgetRange(
                          { budgetMin: form.budgetMin, budgetMax: form.budgetMax },
                          currency
                        )}
                      </span>
                      {form.moveInTimeline && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Move-in: {formatIsoDateDisplay(form.moveInTimeline)}</span>
                        </>
                      )}
                      {form.visitedStatus === 'Scheduled' && form.visitTime && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Time: {formatTime12h(form.visitTime)}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span>Status: {form.visitorStatus}</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Horizontal Stepper Footer Navigation */}
          <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {currentStep > 0 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-h-[42px]"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    clearRegistrationDraft();
                    setForm(createInitialForm());
                    setErrorMsg(null);
                    setFieldErrors({});
                    setSuccessMsg(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-h-[42px]"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentStep < STEPS.length - 1 ? (
                <button
                  key="btn-next-step"
                  type="button"
                  onClick={handleNextStep}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 text-xs sm:text-sm font-semibold text-white hover:bg-blue-700 transition-colors min-h-[42px]"
                >
                  <span>Next: {STEPS[currentStep + 1].shortLabel}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  key="btn-save-visitor"
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-xs sm:text-sm font-semibold text-white hover:bg-blue-700 transition-colors min-h-[42px]"
                >
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  Save Visitor Record
                </button>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* Duplicate Contact Confirmation Modal */}
      {pendingDuplicate && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dup-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] p-6 shadow-2xl space-y-4">
            <h3
              id="dup-modal-title"
              className="font-display text-lg font-semibold text-zinc-950 dark:text-zinc-50"
            >
              Existing Visitor Found
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              A visitor with phone number{' '}
              <span className="font-mono-num font-semibold">{pendingDuplicate.contactNumber}</span>{' '}
              is already registered:
            </p>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-3.5 space-y-2">
              <div className="font-semibold text-sm text-zinc-950 dark:text-zinc-50">
                {pendingDuplicate.fullName}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {pendingDuplicate.visits.length} prior visit
                {pendingDuplicate.visits.length === 1 ? '' : 's'} · Latest:{' '}
                {pendingDuplicate.latestVisitDate}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <VisitStatusBadge
                  visitedStatus={pendingDuplicate.latestVisitOutcome}
                  visitorStatus={pendingDuplicate.visitorStatus}
                  compact
                />
                <PetStatusBadge petStatus={pendingDuplicate.petStatus} compact />
              </div>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Adding this visit to the existing profile preserves all previous visit details and
              comments in their timeline.
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={confirmMergeIntoExisting}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Add Visit to {pendingDuplicate.fullName}'s Profile
              </button>
              <button
                type="button"
                onClick={confirmCreateSeparate}
                className="w-full py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Create Separate Profile Anyway
              </button>
              <button
                type="button"
                onClick={() => setPendingDuplicate(null)}
                className="w-full py-2 px-4 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
