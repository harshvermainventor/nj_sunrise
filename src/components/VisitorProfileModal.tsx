import React, { useState } from 'react';
import {
  CalendarPlus,
  Edit3,
  MessageCircle,
  MessageSquarePlus,
  Phone,
  Trash2,
  X,
} from 'lucide-react';
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
  formatBudgetRange,
  formatCurrency,
  formatPeopleStayingLabel,
  formatPhoneForWhatsApp,
  getTodayIsoDate,
} from '../utils/crmLogic';
import { CalendarDatePicker } from './CalendarDatePicker';
import { PetStatusBadge, VisitStatusBadge, VisitorStageText } from './StatusBadges';
import { TimePicker } from './TimePicker';

interface VisitorProfileModalProps {
  visitor: VisitorProfile;
  currency: CurrencySymbol;
  onClose: () => void;
  onUpdateProfile: (visitorId: string, updates: Partial<VisitorProfile>) => void;
  onAddVisit: (visitorId: string, input: RegistrationFormInput) => void;
  onAddComment: (visitorId: string, text: string) => void;
  onAddFollowUp: (
    visitorId: string,
    scheduledDate: string,
    preferredTime: string,
    method: FollowUpMethod,
    notes: string
  ) => void;
  onDeleteVisitor: (visitorId: string) => void;
}

export const VisitorProfileModal: React.FC<VisitorProfileModalProps> = ({
  visitor,
  currency,
  onClose,
  onUpdateProfile,
  onAddVisit,
  onAddComment,
  onAddFollowUp,
  onDeleteVisitor,
}) => {
  const [mode, setMode] = useState<'view' | 'edit' | 'add-visit'>('view');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Edit profile state (Visit Status & Pet Status remain strictly separate)
  const [editFullName, setEditFullName] = useState(visitor.fullName);
  const [editPhone, setEditPhone] = useState(visitor.contactNumber);
  const [editQuotedRent, setEditQuotedRent] = useState(visitor.quotedRent || 0);
  const [editBudgetMin, setEditBudgetMin] = useState(visitor.budgetMin || 0);
  const [editBudgetMax, setEditBudgetMax] = useState(
    visitor.budgetMax || visitor.expectedBudget || 0
  );
  const [editTimeline, setEditTimeline] = useState(visitor.moveInTimeline);
  const [editPetStatus, setEditPetStatus] = useState<PetStatus>(visitor.petStatus);
  const [editVisitedOutcome, setEditVisitedOutcome] = useState<VisitedAnswer>(
    visitor.latestVisitOutcome
  );
  const [editVisitorStatus, setEditVisitorStatus] = useState<VisitorStatus>(
    visitor.visitorStatus
  );
  const [editDescription, setEditDescription] = useState(visitor.description);
  const [editRequirements, setEditRequirements] = useState(visitor.additionalRequirements);

  // Quick comment & follow-up state
  const [newComment, setNewComment] = useState('');
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [fupDate, setFupDate] = useState(getTodayIsoDate());
  const [fupTime, setFupTime] = useState('11:00');
  const [fupMethod, setFupMethod] = useState<FollowUpMethod>('Phone call');
  const [fupNotes, setFupNotes] = useState('');

  // Add new visit state (preserves all previous visits!)
  const [newVisitDate, setNewVisitDate] = useState(getTodayIsoDate());
  const [newVisitTime, setNewVisitTime] = useState('14:00');
  const [newVisitPeople, setNewVisitPeople] = useState(
    visitor.latestPeopleCount !== undefined && visitor.latestPeopleCount !== null
      ? String(visitor.latestPeopleCount)
      : ''
  );
  const [newVisitOutcome, setNewVisitOutcome] = useState<VisitedAnswer>('Yes');
  const [newVisitStatus, setNewVisitStatus] = useState<VisitorStatus>(visitor.visitorStatus);
  const [newVisitQuotedRent, setNewVisitQuotedRent] = useState(visitor.quotedRent || 0);
  const [newVisitBudgetMin, setNewVisitBudgetMin] = useState(visitor.budgetMin || 0);
  const [newVisitBudgetMax, setNewVisitBudgetMax] = useState(
    visitor.budgetMax || visitor.expectedBudget || 0
  );
  const [newVisitComments, setNewVisitComments] = useState('');
  const [newVisitFollowUpComments, setNewVisitFollowUpComments] = useState('');

  const waPhone = formatPhoneForWhatsApp(visitor.contactNumber);

  const [editError, setEditError] = useState<string | null>(null);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    const cleanPhone = editPhone.replace(/\D/g, '');
    if (!editFullName.trim()) {
      setEditError('Please enter a full name.');
      return;
    }
    if (cleanPhone.length !== 10) {
      setEditError('Contact number must be exactly 10 digits.');
      return;
    }
    const minVal = Math.max(0, Number(editBudgetMin) || 0);
    const maxVal = Math.max(0, Number(editBudgetMax) || 0);
    if (minVal > 0 && maxVal > 0 && minVal > maxVal) {
      setEditError('Maximum budget must be greater than or equal to minimum budget.');
      return;
    }
    onUpdateProfile(visitor.id, {
      fullName: editFullName.trim(),
      contactNumber: cleanPhone,
      enquiryType: 'Rent',
      quotedRent: Math.max(0, Number(editQuotedRent) || 0),
      budgetMin: minVal,
      budgetMax: maxVal,
      expectedBudget: maxVal || minVal,
      budgetType: 'Monthly rent',
      moveInTimeline: editTimeline.trim(),
      petStatus: editPetStatus,
      latestVisitOutcome: editVisitedOutcome,
      visitorStatus: editVisitorStatus,
      description: editDescription.trim(),
      additionalRequirements: editRequirements.trim(),
    });
    setMode('view');
  };

  const handleSaveNewVisit = (e: React.FormEvent) => {
    e.preventDefault();
    const minVal = Math.max(0, Number(newVisitBudgetMin) || 0);
    const maxVal = Math.max(0, Number(newVisitBudgetMax) || 0);
    onAddVisit(visitor.id, {
      fullName: visitor.fullName,
      contactNumber: visitor.contactNumber,
      visitDate: newVisitDate,
      visitTime: newVisitOutcome === 'Yes' ? '' : newVisitTime,
      peopleCount: newVisitPeople.trim(),
      visitedStatus: newVisitOutcome,
      enquiryType: 'Rent',
      quotedRent: Math.max(0, Number(newVisitQuotedRent) || 0),
      budgetMin: minVal,
      budgetMax: maxVal,
      expectedBudget: maxVal || minVal,
      budgetType: 'Monthly rent',
      moveInTimeline: visitor.moveInTimeline,
      petStatus: visitor.petStatus,
      visitorStatus: newVisitStatus,
      visitorDescription: visitor.description,
      initialComments: newVisitComments,
      followUpComments: newVisitFollowUpComments,
      additionalRequirements: visitor.additionalRequirements,
      followUpRequired: false,
      nextFollowUpDate: '',
      preferredFollowUpTime: '',
      followUpMethod: 'Phone call',
    });
    setNewVisitComments('');
    setNewVisitFollowUpComments('');
    setMode('view');
  };

  const handleAddCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    onAddComment(visitor.id, newComment.trim());
    setNewComment('');
  };

  const handleAddFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fupDate) return;
    onAddFollowUp(visitor.id, fupDate, fupTime, fupMethod, fupNotes.trim() || 'Follow-up scheduled');
    setFupNotes('');
    setShowFollowUpForm(false);
  };

  const inputClass =
    'w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F17] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:p-4"
    >
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121826] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2
                id="profile-modal-title"
                className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 truncate"
              >
                {visitor.fullName}
              </h2>
              <VisitorStageText status={visitor.visitorStatus} />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono-num text-slate-700 dark:text-slate-300">
                {visitor.contactNumber}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {visitor.visits.length} visit{visitor.visits.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <VisitStatusBadge
                visitedStatus={visitor.latestVisitOutcome}
                visitorStatus={visitor.visitorStatus}
              />
              <PetStatusBadge petStatus={visitor.petStatus} />
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close visitor profile"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 bg-slate-50 dark:bg-[#0B0F17]/60 border-b border-slate-200 dark:border-slate-800">
          <a
            href={`tel:${visitor.contactNumber}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            Call Visitor
          </a>
          {waPhone && (
            <a
              href={`https://wa.me/${waPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950"
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
              WhatsApp
            </a>
          )}
          <button
            type="button"
            onClick={() => setMode(mode === 'add-visit' ? 'view' : 'add-visit')}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === 'add-visit'
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900'
                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
            Add New Visit
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === 'edit'
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900'
                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
            Edit Details
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/70 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Delete
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {confirmDelete && (
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-xs text-red-800 dark:text-red-200">
                Permanently delete <strong>{visitor.fullName}</strong> and all visit records?
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteVisitor(visitor.id);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-xs font-semibold text-white hover:bg-red-700"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          )}

          {mode === 'edit' && (
            <form
              onSubmit={handleSaveEdit}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] p-4 space-y-4"
            >
              <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Edit Visitor Profile
              </h3>
              {editError && (
                <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                  {editError}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-full-name" className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Full Name
                  </label>
                  <input
                    id="edit-full-name"
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="edit-contact-number" className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Contact Number (10 digits)
                  </label>
                  <input
                    id="edit-contact-number"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className={`${inputClass} font-mono-num`}
                  />
                </div>
                <div>
                  <label htmlFor="edit-quoted-rent" className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Rent Said to Visitor ({currency}/month)
                  </label>
                  <input
                    id="edit-quoted-rent"
                    type="number"
                    min={0}
                    value={editQuotedRent || ''}
                    onChange={(e) => setEditQuotedRent(Number(e.target.value) || 0)}
                    className={`${inputClass} font-mono-num`}
                  />
                </div>
                <div>
                  <label htmlFor="edit-timeline" className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Expected Move-in Date
                  </label>
                  <CalendarDatePicker
                    id="edit-timeline"
                    value={editTimeline}
                    onChange={setEditTimeline}
                    placeholder="Choose move-in date"
                    allowClear
                    compact
                    ariaLabel="Expected Move-in Date"
                  />
                </div>
                <div>
                  <label htmlFor="edit-budget-min" className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Budget Range Min ({currency}/month)
                  </label>
                  <input
                    id="edit-budget-min"
                    type="number"
                    min={0}
                    value={editBudgetMin || ''}
                    onChange={(e) => setEditBudgetMin(Number(e.target.value) || 0)}
                    className={`${inputClass} font-mono-num`}
                  />
                </div>
                <div>
                  <label htmlFor="edit-budget-max" className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Budget Range Max ({currency}/month)
                  </label>
                  <input
                    id="edit-budget-max"
                    type="number"
                    min={0}
                    value={editBudgetMax || ''}
                    onChange={(e) => setEditBudgetMax(Number(e.target.value) || 0)}
                    className={`${inputClass} font-mono-num`}
                  />
                </div>
                <div>
                  <label htmlFor="edit-visit-status" className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Visit Status (independent)
                  </label>
                  <select
                    id="edit-visit-status"
                    value={editVisitedOutcome}
                    onChange={(e) => setEditVisitedOutcome(e.target.value as VisitedAnswer)}
                    className={inputClass}
                  >
                    <option value="Yes">Visited</option>
                    <option value="No">Not visited</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="No-show">No-show</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-pet-status" className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Pet Status (independent)
                  </label>
                  <select
                    id="edit-pet-status"
                    value={editPetStatus}
                    onChange={(e) => setEditPetStatus(e.target.value as PetStatus)}
                    className={inputClass}
                  >
                    {PET_STATUSES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="edit-pipeline-status" className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Visitor Pipeline Status
                  </label>
                  <select
                    id="edit-pipeline-status"
                    value={editVisitorStatus}
                    onChange={(e) => setEditVisitorStatus(e.target.value as VisitorStatus)}
                    className={inputClass}
                  >
                    {VISITOR_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Visitor Description
                  </label>
                  <textarea
                    rows={2}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Additional Requirements
                  </label>
                  <textarea
                    rows={2}
                    value={editRequirements}
                    onChange={(e) => setEditRequirements(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMode('view')}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {mode === 'add-visit' && (
            <form
              onSubmit={handleSaveNewVisit}
              className="rounded-xl border border-blue-200 dark:border-blue-800/70 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-4"
            >
              <div>
                <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Log Repeat Visit for {visitor.fullName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Previous visit history will remain preserved.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Visit Date
                  </label>
                  <CalendarDatePicker
                    value={newVisitDate}
                    onChange={setNewVisitDate}
                    compact
                    ariaLabel="New visit date"
                  />
                </div>
                {newVisitOutcome !== 'Yes' && (
                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                      Visit Time
                    </label>
                    <TimePicker
                      value={newVisitTime}
                      onChange={setNewVisitTime}
                      compact
                      ariaLabel="New visit time"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Number of People Staying
                  </label>
                  <input
                    type="text"
                    value={newVisitPeople}
                    onChange={(e) => setNewVisitPeople(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Actually Visited?
                  </label>
                  <select
                    value={newVisitOutcome}
                    onChange={(e) => setNewVisitOutcome(e.target.value as VisitedAnswer)}
                    className={inputClass}
                  >
                    <option value="Yes">Yes (Visited)</option>
                    <option value="No">No (Not visited)</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="No-show">No-show</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Updated Status
                  </label>
                  <select
                    value={newVisitStatus}
                    onChange={(e) => setNewVisitStatus(e.target.value as VisitorStatus)}
                    className={inputClass}
                  >
                    {VISITOR_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Rent Said ({currency})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newVisitQuotedRent || ''}
                    onChange={(e) => setNewVisitQuotedRent(Number(e.target.value) || 0)}
                    className={`${inputClass} font-mono-num`}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Budget Min ({currency})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newVisitBudgetMin || ''}
                    onChange={(e) => setNewVisitBudgetMin(Number(e.target.value) || 0)}
                    className={`${inputClass} font-mono-num`}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Budget Max ({currency})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newVisitBudgetMax || ''}
                    onChange={(e) => setNewVisitBudgetMax(Number(e.target.value) || 0)}
                    className={`${inputClass} font-mono-num`}
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Visit Notes & Initial Comments
                  </label>
                  <textarea
                    rows={2}
                    value={newVisitComments}
                    onChange={(e) => setNewVisitComments(e.target.value)}
                    placeholder="What happened during this visit?"
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Follow-up Notes (optional)
                  </label>
                  <input
                    type="text"
                    value={newVisitFollowUpComments}
                    onChange={(e) => setNewVisitFollowUpComments(e.target.value)}
                    placeholder="Any follow-up action discussed"
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMode('view')}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Save New Visit
                </button>
              </div>
            </form>
          )}

          {/* Summary Grid */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
              <span className="block text-slate-500 dark:text-slate-400">Rent Said</span>
              <span className="mt-1 block font-mono-num font-semibold text-slate-900 dark:text-slate-100">
                {visitor.quotedRent ? `${formatCurrency(visitor.quotedRent, currency)}/mo` : 'Not specified'}
              </span>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
              <span className="block text-slate-500 dark:text-slate-400">Budget Range</span>
              <span className="mt-1 block font-mono-num font-semibold text-slate-900 dark:text-slate-100">
                {formatBudgetRange(
                  {
                    budgetMin: visitor.budgetMin,
                    budgetMax: visitor.budgetMax,
                    expectedBudget: visitor.expectedBudget,
                  },
                  currency
                )}
              </span>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
              <span className="block text-slate-500 dark:text-slate-400">Expected Move-in</span>
              <span className="mt-1 block font-mono-num font-semibold text-slate-900 dark:text-slate-100">
                {visitor.moveInTimeline || 'Not specified'}
              </span>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
              <span className="block text-slate-500 dark:text-slate-400">Latest Visit</span>
              <span className="mt-1 block font-mono-num font-semibold text-slate-900 dark:text-slate-100">
                {visitor.latestVisitDate}
                {visitor.latestVisitTime ? ` · ${visitor.latestVisitTime}` : ''}
              </span>
            </div>
          </section>

          {(visitor.description || visitor.additionalRequirements) && (
            <section className="space-y-2 text-sm">
              {visitor.description && (
                <div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Visitor Description
                  </span>
                  <p className="mt-0.5 text-slate-800 dark:text-slate-200">{visitor.description}</p>
                </div>
              )}
              {visitor.additionalRequirements && (
                <div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Additional Requirements
                  </span>
                  <p className="mt-0.5 text-slate-800 dark:text-slate-200">
                    {visitor.additionalRequirements}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Complete Visit History (Never Overwritten) */}
          <section className="space-y-3">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Complete Visit History ({visitor.visits.length})
            </h3>
            <div className="space-y-3">
              {visitor.visits.map((visit, index) => (
                <div
                  key={visit.id}
                  data-testid="visit-history-item"
                  className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        Visit #{visitor.visits.length - index}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-num text-slate-700 dark:text-slate-300">
                        {visit.visitDate}
                        {visit.visitTime ? ` at ${visit.visitTime}` : ''}
                      </span>
                      {formatPeopleStayingLabel(visit.peopleCount) && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{formatPeopleStayingLabel(visit.peopleCount)}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <VisitStatusBadge
                        visitedStatus={visit.visitedStatus}
                        visitorStatus={visit.visitorStatus}
                        compact
                      />
                      <PetStatusBadge petStatus={visitor.petStatus} compact />
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-2">
                    <span>Status: {visit.visitorStatus}</span>
                    {visit.quotedRent ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-num">
                          Rent said: {formatCurrency(visit.quotedRent, currency)}/mo
                        </span>
                      </>
                    ) : null}
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num">
                      Budget:{' '}
                      {formatBudgetRange(
                        {
                          budgetMin: visit.budgetMin,
                          budgetMax: visit.budgetMax,
                          expectedBudget: visit.expectedBudget,
                        },
                        currency
                      )}
                    </span>
                  </div>
                  {visit.initialComments && (
                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      <strong className="font-medium">Comments:</strong> {visit.initialComments}
                    </p>
                  )}
                  {visit.followUpComments && (
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      <strong className="font-medium">Follow-up note:</strong> {visit.followUpComments}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Follow-ups & Quick Add Follow-up */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Follow-ups ({visitor.followUps.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowFollowUpForm((s) => !s)}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showFollowUpForm ? 'Cancel' : '+ Schedule Follow-up'}
              </button>
            </div>

            {showFollowUpForm && (
              <form
                onSubmit={handleAddFollowUpSubmit}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] p-3.5 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <CalendarDatePicker
                    value={fupDate}
                    onChange={setFupDate}
                    compact
                    ariaLabel="Follow-up date"
                  />
                  <TimePicker
                    value={fupTime}
                    onChange={setFupTime}
                    compact
                    ariaLabel="Preferred follow-up time"
                  />
                  <select
                    value={fupMethod}
                    onChange={(e) => setFupMethod(e.target.value as FollowUpMethod)}
                    className={inputClass}
                  >
                    <option value="Phone call">Phone call</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="SMS">SMS</option>
                    <option value="Email">Email</option>
                    <option value="In-person">In-person</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={fupNotes}
                    onChange={(e) => setFupNotes(e.target.value)}
                    placeholder="Follow-up note..."
                    className={inputClass}
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-medium text-white hover:bg-blue-700 whitespace-nowrap"
                  >
                    Schedule
                  </button>
                </div>
              </form>
            )}

            {visitor.followUps.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No follow-ups logged for this visitor yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800">
                {visitor.followUps.map((f) => (
                  <div key={f.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        <span className="font-mono-num">{f.scheduledDate}</span> at{' '}
                        <span className="font-mono-num">{f.preferredTime}</span> · {f.method}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400">{f.notes}</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        f.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                      }`}
                    >
                      {f.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Comments & Conversation Log */}
          <section className="space-y-3">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Conversation & Comment History ({visitor.comments.length})
            </h3>
            <form onSubmit={handleAddCommentSubmit} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a conversation note or comment..."
                className={inputClass}
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-xs font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white whitespace-nowrap"
              >
                <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
                Add Note
              </button>
            </form>
            {visitor.comments.length > 0 && (
              <div className="space-y-2">
                {visitor.comments.map((cmt) => (
                  <div
                    key={cmt.id}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-slate-400">
                      <span>{cmt.type}</span>
                      <span className="font-mono-num">
                        {new Date(cmt.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200">{cmt.text}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
