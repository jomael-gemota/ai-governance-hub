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
