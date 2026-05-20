const STATUS_STYLES = {
  planning: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'on-hold': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  completed: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  failed: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const RISK_STYLES = {
  low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/15 text-red-400 border-red-500/30',
};

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium capitalize ${STATUS_STYLES[status] || 'bg-slate-700 text-slate-300'}`}>
      {status}
    </span>
  );
}

export function RiskBadge({ risk }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium capitalize ${RISK_STYLES[risk] || 'bg-slate-700 text-slate-300'}`}>
      {risk} risk
    </span>
  );
}

export function SeverityBadge({ severity }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium capitalize ${RISK_STYLES[severity] || 'bg-slate-700 text-slate-300'}`}>
      {severity}
    </span>
  );
}

const AUDIT_STYLES = {
  'not-submitted':   'bg-slate-700/40 text-slate-400 border-slate-600/40',
  pending:           'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  'in-review':       'bg-blue-500/10 text-blue-400 border-blue-500/30',
  'trial-run':       'bg-violet-500/10 text-violet-400 border-violet-500/30',
  'trial-completed': 'bg-teal-500/10 text-teal-400 border-teal-500/30',
  approved:          'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  denied:            'bg-red-500/10 text-red-400 border-red-500/30',
  'needs-review':    'bg-orange-500/10 text-orange-400 border-orange-500/30',
};

const AUDIT_LABELS = {
  'not-submitted':   'Unaudited',
  pending:           'Audit Pending',
  'in-review':       'In Review',
  'trial-run':       'Trial Run',
  'trial-completed': 'Trial Completed',
  approved:          'Approved',
  denied:            'Denied',
  'needs-review':    'Needs Review',
};

export function AuditBadge({ status }) {
  const s = status || 'not-submitted';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${AUDIT_STYLES[s] || AUDIT_STYLES['not-submitted']}`}>
      {AUDIT_LABELS[s] || s}
    </span>
  );
}
