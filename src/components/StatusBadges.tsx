import React from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  HelpCircle,
  PawPrint,
  XCircle,
} from 'lucide-react';
import { PetStatus, VisitedAnswer, VisitorStatus } from '../types/crm';
import { resolveVisitBadgeState } from '../utils/crmLogic';

interface VisitStatusBadgeProps {
  visitedStatus: VisitedAnswer;
  visitorStatus?: VisitorStatus;
  compact?: boolean;
}

export const VisitStatusBadge: React.FC<VisitStatusBadgeProps> = ({
  visitedStatus,
  visitorStatus,
  compact = false,
}) => {
  const { label, tone } = resolveVisitBadgeState(visitedStatus, visitorStatus);

  const toneClasses =
    tone === 'green'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/70'
      : tone === 'blue'
      ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/70'
      : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/70';

  const Icon =
    tone === 'green'
      ? CheckCircle2
      : tone === 'blue'
      ? Clock
      : label === 'No-show'
      ? AlertCircle
      : XCircle;

  return (
    <span
      data-testid="visit-status-badge"
      data-tone={tone}
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium whitespace-nowrap shrink-0 ${
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      } ${toneClasses}`}
    >
      <Icon className={compact ? 'h-3 w-3 shrink-0' : 'h-3.5 w-3.5 shrink-0'} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};

interface PetStatusBadgeProps {
  petStatus: PetStatus;
  compact?: boolean;
}

export const PetStatusBadge: React.FC<PetStatusBadgeProps> = ({
  petStatus,
  compact = false,
}) => {
  const toneClasses =
    petStatus === 'Has pets'
      ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/70'
      : petStatus === 'No pets'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/70'
      : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700';

  const Icon =
    petStatus === 'Has pets'
      ? PawPrint
      : petStatus === 'No pets'
      ? Check
      : HelpCircle;

  return (
    <span
      data-testid="pet-status-badge"
      data-pet-status={petStatus}
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium whitespace-nowrap shrink-0 ${
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      } ${toneClasses}`}
    >
      <Icon className={compact ? 'h-3 w-3 shrink-0' : 'h-3.5 w-3.5 shrink-0'} aria-hidden="true" />
      <span>{petStatus}</span>
    </span>
  );
};

export const VisitorStageText: React.FC<{ status: VisitorStatus }> = ({ status }) => {
  const colorClass =
    status === 'Finalised'
      ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
      : status === 'Interested' || status === 'Negotiating'
      ? 'text-blue-700 dark:text-blue-400 font-medium'
      : status === 'Not interested' || status === 'No-show'
      ? 'text-red-700 dark:text-red-400 font-medium'
      : 'text-slate-600 dark:text-slate-300 font-medium';

  return <span className={`text-xs whitespace-nowrap ${colorClass}`}>{status}</span>;
};
