import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit2, Trash2, Calendar, DollarSign,
  User, Building, Mail, Code2, FileText, Image as ImageIcon,
  CircleHelp, Lightbulb, XCircle, Workflow, Clock3, Target, Wrench,
  Route, Users, Database, BadgeCheck, Timer, Eye, FileSearch, X,
  ShieldCheck, ShieldX, ShieldAlert, ClipboardList, CheckCircle2,
  XCircle as XCircleIcon, MinusCircle, Send, Gavel, ChevronDown, ChevronUp, AlertTriangle, Plus,
  FlaskConical, Flag,
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../api/axios';
import { StatusBadge, RiskBadge } from '../components/StatusBadge';
import IncidentLog from '../components/IncidentLog';
import MilestoneTracker from '../components/MilestoneTracker';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function SummaryItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-1.5 text-xs bg-slate-800/80 border border-slate-700 rounded-md px-2.5 py-1.5 min-w-0">
      <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      <span className="text-slate-500 whitespace-nowrap">{label}:</span>
      <span className="text-slate-200 truncate">{value || 'Not set'}</span>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-indigo-400" />
      <h3 className="text-white font-semibold">{title}</h3>
    </div>
  );
}

function DeleteProjectModal({ open, onCancel, onConfirm, loading }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-red-500/15 text-red-400">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-white">Delete this project?</h4>
            <p className="text-sm text-slate-400 mt-1">
              This action cannot be undone. All project information, files, milestones, and incidents will be removed.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white rounded-lg transition"
          >
            {loading ? 'Deleting...' : 'Delete Project'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ContentBlock({ icon: Icon, label, value }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-2.5">
      <p className="text-slate-500 text-[11px] uppercase tracking-wide mb-1 inline-flex items-center gap-1.5">
        {Icon ? <Icon className="w-3.5 h-3.5 text-indigo-400" /> : null}
        {label}
      </p>
      <p className="text-slate-200 text-xs leading-relaxed whitespace-pre-wrap break-words">
        {value || 'Not provided'}
      </p>
    </div>
  );
}

function PreviewModal({ open, item, onClose }) {
  if (!open || !item) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 backdrop-blur-[1px] p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <p className="text-sm text-slate-200 truncate">{item.name}</p>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="bg-slate-900/60 h-[70vh] flex items-center justify-center">
          {item.type === 'image' ? (
            <img src={item.url} alt={item.name} className="max-h-full max-w-full object-contain" />
          ) : (
            <iframe src={item.url} title={item.name} className="w-full h-full" />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Audit helpers ────────────────────────────────────────────────────────────

const AUDIT_STATUS_META = {
  'not-submitted':   { label: 'Not Submitted',       color: 'text-slate-400',  bg: 'bg-slate-800/60 border-slate-700',        icon: ShieldAlert },
  pending:           { label: 'Pending Review',       color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30',    icon: ClipboardList },
  'in-review':       { label: 'In Review',            color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/30',        icon: ShieldAlert },
  'trial-run':       { label: 'Trial Run',            color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/30',    icon: FlaskConical },
  'trial-completed': { label: 'Trial Completed',      color: 'text-teal-400',   bg: 'bg-teal-500/10 border-teal-500/30',        icon: Flag },
  approved:          { label: 'Approved',             color: 'text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/30',  icon: ShieldCheck },
  denied:            { label: 'Denied',               color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30',          icon: ShieldX },
  'needs-review':    { label: 'Needs Review',         color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30',    icon: ShieldAlert },
};

function AuditStatusBadge({ status }) {
  const meta = AUDIT_STATUS_META[status] || AUDIT_STATUS_META['not-submitted'];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${meta.bg} ${meta.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {meta.label}
    </span>
  );
}

const CHECKLIST_ITEMS = [
  { key: 'dataPrivacy',    label: 'Data Privacy & Handling' },
  { key: 'security',       label: 'Security & Access Controls' },
  { key: 'biasFairness',   label: 'Bias / Fairness Evaluation' },
  { key: 'accuracy',       label: 'Accuracy & Validation' },
  { key: 'compliance',     label: 'Legal / Regulatory Compliance' },
  { key: 'explainability', label: 'Explainability & Transparency' },
];

function ChecklistIcon({ value }) {
  if (value === 'pass') return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (value === 'fail') return <XCircleIcon className="w-4 h-4 text-red-400" />;
  return <MinusCircle className="w-4 h-4 text-slate-500" />;
}

function VerdictModal({ open, onClose, onSubmit, loading }) {
  const [verdict, setVerdict]               = useState('trial-run');
  const [findings, setFindings]             = useState('');
  const [conditions, setConditions]         = useState('');
  const [nextReview, setNextReview]         = useState('');
  const [trialDurationDays, setTrialDays]   = useState(30);
  const [checklist, setChecklist]           = useState(
    Object.fromEntries(CHECKLIST_ITEMS.map(({ key }) => [key, 'na']))
  );

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!findings.trim()) { toast.error('Findings are required.'); return; }
    onSubmit({ verdict, findings, conditions, nextReviewDate: nextReview || undefined, checklist, trialDurationDays });
  };

  const cycleCheck = (key) => {
    const order = ['na', 'pass', 'fail'];
    setChecklist((prev) => {
      const next = order[(order.indexOf(prev[key]) + 1) % order.length];
      return { ...prev, [key]: next };
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-5">
          <Gavel className="w-5 h-5 text-indigo-400" />
          <h4 className="text-lg font-semibold text-white">Submit Audit Verdict</h4>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Verdict */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">Verdict *</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: 'trial-run',    label: 'Initiate Trial Run', color: 'border-violet-600/50 text-violet-400 bg-violet-500/10' },
                { v: 'needs-review', label: 'Conditional',        color: 'border-orange-600/50 text-orange-400 bg-orange-500/10' },
                { v: 'denied',       label: 'Deny',               color: 'border-red-600/50 text-red-400 bg-red-500/10' },
              ].map(({ v, label, color }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVerdict(v)}
                  className={`py-2 rounded-lg border text-xs font-semibold transition ${
                    verdict === v ? color : 'border-slate-700 text-slate-400 bg-slate-800/50 hover:bg-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {verdict === 'trial-run' && (
              <p className="mt-2 text-[11px] text-violet-300/70 leading-relaxed">
                The project will enter a mandatory observation period. Final approval cannot be granted until the trial ends and a second review is completed.
              </p>
            )}
          </div>

          {/* Trial duration (only for trial-run) */}
          {verdict === 'trial-run' && (
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">Trial Duration *</label>
              <div className="grid grid-cols-2 gap-2">
                {[30, 60].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setTrialDays(days)}
                    className={`py-2.5 rounded-lg border text-sm font-semibold transition ${
                      trialDurationDays === days
                        ? 'border-violet-600/50 text-violet-300 bg-violet-500/15'
                        : 'border-slate-700 text-slate-400 bg-slate-800/50 hover:bg-slate-800'
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Checklist */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">
              Audit Checklist <span className="normal-case text-slate-600">(click to cycle: N/A → Pass → Fail)</span>
            </label>
            <div className="space-y-1.5">
              {CHECKLIST_ITEMS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => cycleCheck(key)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-lg text-xs text-slate-300 hover:bg-slate-800 transition text-left"
                >
                  <ChecklistIcon value={checklist[key]} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Findings */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wide mb-1.5 block">
              {verdict === 'trial-run' ? 'Observations / Rationale for Trial *' : 'Findings / Reasoning *'}
            </label>
            <textarea
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              rows={4}
              placeholder={
                verdict === 'trial-run'
                  ? 'Describe why a trial run is needed and what should be observed during the period...'
                  : 'Describe what you found during the audit...'
              }
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Conditions (only for needs-review) */}
          {verdict === 'needs-review' && (
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-1.5 block">Conditions to Address</label>
              <textarea
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
                rows={3}
                placeholder="List specific items the creator must fix before re-submission..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 text-sm disabled:opacity-60 text-white rounded-lg transition ${
                verdict === 'trial-run'
                  ? 'bg-violet-600 hover:bg-violet-500'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              {loading ? 'Submitting...' : verdict === 'trial-run' ? 'Start Trial Run' : 'Submit Verdict'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FinalVerdictModal({ open, onClose, onSubmit, loading, trialDurationDays }) {
  const [verdict, setVerdict]       = useState('approved');
  const [findings, setFindings]     = useState('');
  const [nextReview, setNextReview] = useState('');
  const [checklist, setChecklist]   = useState(
    Object.fromEntries(CHECKLIST_ITEMS.map(({ key }) => [key, 'na']))
  );

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!findings.trim()) { toast.error('Findings are required.'); return; }
    onSubmit({ verdict, findings, nextReviewDate: nextReview || undefined, checklist });
  };

  const cycleCheck = (key) => {
    const order = ['na', 'pass', 'fail'];
    setChecklist((prev) => {
      const next = order[(order.indexOf(prev[key]) + 1) % order.length];
      return { ...prev, [key]: next };
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-teal-700/40 rounded-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-1">
          <Flag className="w-5 h-5 text-teal-400" />
          <h4 className="text-lg font-semibold text-white">Submit Final Verdict</h4>
        </div>
        <p className="text-xs text-teal-300/70 mb-5">
          The {trialDurationDays}-day trial run has completed. This is the final, official approval decision.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Final verdict: only approve or deny */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">Final Decision *</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: 'approved', label: 'Officially Approve', color: 'border-emerald-600/50 text-emerald-400 bg-emerald-500/10' },
                { v: 'denied',   label: 'Deny',               color: 'border-red-600/50 text-red-400 bg-red-500/10' },
              ].map(({ v, label, color }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVerdict(v)}
                  className={`py-2.5 rounded-lg border text-xs font-semibold transition ${
                    verdict === v ? color : 'border-slate-700 text-slate-400 bg-slate-800/50 hover:bg-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Checklist */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">
              Final Checklist <span className="normal-case text-slate-600">(click to cycle: N/A → Pass → Fail)</span>
            </label>
            <div className="space-y-1.5">
              {CHECKLIST_ITEMS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => cycleCheck(key)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-lg text-xs text-slate-300 hover:bg-slate-800 transition text-left"
                >
                  <ChecklistIcon value={checklist[key]} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Findings */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wide mb-1.5 block">Final Findings *</label>
            <textarea
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              rows={4}
              placeholder="Summarize observations from the trial period and justify your final decision..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>

          {/* Next review date (only for approved) */}
          {verdict === 'approved' && (
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-1.5 block">Next Review Date (optional)</label>
              <input
                type="date"
                value={nextReview}
                onChange={(e) => setNextReview(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 text-sm disabled:opacity-60 text-white rounded-lg transition ${
                verdict === 'approved' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
              }`}
            >
              {loading ? 'Submitting...' : verdict === 'approved' ? 'Officially Approve' : 'Deny Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AuditHistoryEntry({ entry, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const verdictMeta = {
    approved:        { label: 'Approved',         color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
    denied:          { label: 'Denied',           color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30' },
    'needs-review':  { label: 'Needs Review',     color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/30' },
    'trial-run':     { label: 'Trial Run Started',color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/30' },
  }[entry.verdict] || {};

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800/60 hover:bg-slate-800 transition text-left"
      >
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${verdictMeta.bg} ${verdictMeta.color}`}>
          {verdictMeta.label}
        </span>
        <span className="text-xs text-slate-300 flex-1">
          by <span className="text-white font-medium">{entry.auditor?.name || 'Unknown'}</span>
          {' · '}{entry.auditedAt ? format(new Date(entry.auditedAt), 'MMM d, yyyy') : ''}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="px-4 py-3 space-y-3 bg-slate-900/50">
          {/* Trial run duration badge */}
          {entry.verdict === 'trial-run' && entry.trialDurationDays && (
            <div className="flex items-center gap-2 text-xs text-violet-300">
              <FlaskConical className="w-3.5 h-3.5" />
              <span>{entry.trialDurationDays}-day trial run initiated</span>
            </div>
          )}
          {/* Checklist */}
          {entry.checklist && (
            <div className="grid grid-cols-2 gap-1.5">
              {CHECKLIST_ITEMS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-1.5 text-xs text-slate-400">
                  <ChecklistIcon value={entry.checklist[key] || 'na'} />
                  {label}
                </div>
              ))}
            </div>
          )}
          {entry.findings && (
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">
                {entry.verdict === 'trial-run' ? 'Observations / Rationale' : 'Findings'}
              </p>
              <p className="text-xs text-slate-300 whitespace-pre-wrap">{entry.findings}</p>
            </div>
          )}
          {entry.conditions && (
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">Conditions to Address</p>
              <p className="text-xs text-orange-300 whitespace-pre-wrap">{entry.conditions}</p>
            </div>
          )}
          {entry.nextReviewDate && (
            <p className="text-xs text-slate-400">
              Next review: <span className="text-slate-200">{format(new Date(entry.nextReviewDate), 'MMM d, yyyy')}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function TrialRunBanner({ project }) {
  const { trialStartedAt, trialEndsAt, trialDurationDays, auditStatus } = project;
  if (!trialStartedAt || !trialEndsAt) return null;

  const now = new Date();
  const start = new Date(trialStartedAt);
  const end = new Date(trialEndsAt);
  const totalMs = end - start;
  const elapsedMs = Math.min(now - start, totalMs);
  const progressPct = Math.min(100, Math.round((elapsedMs / totalMs) * 100));
  const daysRemaining = Math.max(0, Math.ceil((end - now) / 86400000));
  const isComplete = auditStatus === 'trial-completed';

  return (
    <div className={`rounded-lg border px-4 py-3 mb-4 ${
      isComplete
        ? 'bg-teal-500/10 border-teal-500/30'
        : 'bg-violet-500/10 border-violet-500/30'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <FlaskConical className={`w-4 h-4 shrink-0 ${isComplete ? 'text-teal-400' : 'text-violet-400'}`} />
        <p className={`text-xs font-semibold ${isComplete ? 'text-teal-300' : 'text-violet-300'}`}>
          {isComplete ? `${trialDurationDays}-Day Trial Run Completed` : `${trialDurationDays}-Day Trial Run In Progress`}
        </p>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2">
        <div
          className={`h-1.5 rounded-full transition-all ${isComplete ? 'bg-teal-400' : 'bg-violet-500'}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>Started {format(start, 'MMM d, yyyy')}</span>
        {isComplete
          ? <span className="text-teal-400 font-medium">Ready for final review</span>
          : <span className="text-violet-300">{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining</span>
        }
        <span>Ends {format(end, 'MMM d, yyyy')}</span>
      </div>
    </div>
  );
}

function AuditSection({ project, isCreator, isAuditor, onProjectUpdate }) {
  const qc = useQueryClient();
  const [showVerdictModal, setShowVerdictModal]           = useState(false);
  const [showFinalVerdictModal, setShowFinalVerdictModal] = useState(false);
  const { auditStatus, audits = [], currentAuditor } = project;

  const invalidate = () => {
    qc.invalidateQueries(['project', project._id]);
    if (onProjectUpdate) onProjectUpdate();
  };

  const submitMutation = useMutation({
    mutationFn: () => api.post(`/projects/${project._id}/audit/submit`),
    onSuccess: () => { toast.success('Submitted for audit'); invalidate(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to submit'),
  });

  const claimMutation = useMutation({
    mutationFn: () => api.post(`/projects/${project._id}/audit/claim`),
    onSuccess: () => { toast.success('Project claimed for review'); invalidate(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to claim'),
  });

  const verdictMutation = useMutation({
    mutationFn: (data) => api.post(`/projects/${project._id}/audit/verdict`, data),
    onSuccess: () => { toast.success('Verdict submitted'); setShowVerdictModal(false); invalidate(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to submit verdict'),
  });

  const finalVerdictMutation = useMutation({
    mutationFn: (data) => api.post(`/projects/${project._id}/audit/final-verdict`, data),
    onSuccess: () => { toast.success('Final verdict submitted'); setShowFinalVerdictModal(false); invalidate(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to submit final verdict'),
  });

  const canSubmit       = isCreator && ['not-submitted', 'denied', 'needs-review'].includes(auditStatus);
  const canClaim        = isAuditor && auditStatus === 'pending';
  const canVerdict      = isAuditor && auditStatus === 'in-review';
  const canFinalVerdict = isAuditor && auditStatus === 'trial-completed';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <h3 className="text-white font-semibold">Audit</h3>
        </div>
        <AuditStatusBadge status={auditStatus} />
      </div>

      {/* Trial run progress banner */}
      {(auditStatus === 'trial-run' || auditStatus === 'trial-completed') && (
        <TrialRunBanner project={project} />
      )}

      {/* Current auditor banner */}
      {auditStatus === 'in-review' && currentAuditor && (
        <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 mb-4">
          {currentAuditor.picture
            ? <img src={currentAuditor.picture} alt="" className="w-5 h-5 rounded-full" />
            : <User className="w-4 h-4 text-blue-400" />}
          <p className="text-xs text-blue-300">
            Currently being reviewed by <span className="font-semibold text-blue-200">{currentAuditor.name}</span>
          </p>
        </div>
      )}

      {/* Creator actions */}
      {canSubmit && (
        <div className="mb-4">
          <p className="text-xs text-slate-400 mb-2">
            {auditStatus === 'not-submitted'
              ? 'Submit this project for an auditor to review.'
              : 'Address the auditor\'s feedback then re-submit for another review.'}
          </p>
          <button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm rounded-lg transition"
          >
            <Send className="w-4 h-4" />
            {submitMutation.isPending ? 'Submitting…' : 'Submit for Audit'}
          </button>
        </div>
      )}

      {/* Auditor actions */}
      {canClaim && (
        <div className="mb-4">
          <p className="text-xs text-slate-400 mb-2">Claim this project to begin your review.</p>
          <button
            onClick={() => claimMutation.mutate()}
            disabled={claimMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm rounded-lg transition"
          >
            <ClipboardList className="w-4 h-4" />
            {claimMutation.isPending ? 'Claiming…' : 'Claim for Review'}
          </button>
        </div>
      )}

      {canVerdict && (
        <div className="mb-4">
          <p className="text-xs text-slate-400 mb-2">You have claimed this project. Submit your verdict when ready.</p>
          <button
            onClick={() => setShowVerdictModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition"
          >
            <Gavel className="w-4 h-4" />
            Submit Verdict
          </button>
        </div>
      )}

      {/* Final verdict action — only available after trial-completed */}
      {canFinalVerdict && (
        <div className="mb-4">
          <p className="text-xs text-slate-400 mb-2">
            The trial period has ended. Review the observations and issue the official approval decision.
          </p>
          <button
            onClick={() => setShowFinalVerdictModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm rounded-lg transition"
          >
            <Flag className="w-4 h-4" />
            Submit Final Verdict
          </button>
        </div>
      )}

      {/* Informational notice while trial is still running */}
      {isAuditor && auditStatus === 'trial-run' && (
        <div className="mb-4 flex items-start gap-2 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2">
          <FlaskConical className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
          <p className="text-xs text-violet-300">
            Approval is locked until the trial run completes. You will be notified when it is ready for final review.
          </p>
        </div>
      )}

      {/* Audit history */}
      {audits.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Audit History ({audits.length})</p>
          <div className="space-y-2">
            {audits.map((entry, i) => (
              <AuditHistoryEntry key={entry._id || i} entry={entry} defaultOpen={i === 0} />
            ))}
          </div>
        </div>
      )}

      {audits.length === 0 && !canSubmit && !canClaim && !canVerdict && !canFinalVerdict && auditStatus !== 'trial-run' && (
        <p className="text-sm text-slate-500">No audit history yet.</p>
      )}

      <VerdictModal
        open={showVerdictModal}
        onClose={() => setShowVerdictModal(false)}
        onSubmit={(data) => verdictMutation.mutate(data)}
        loading={verdictMutation.isPending}
      />
      <FinalVerdictModal
        open={showFinalVerdictModal}
        onClose={() => setShowFinalVerdictModal(false)}
        onSubmit={(data) => finalVerdictMutation.mutate(data)}
        loading={finalVerdictMutation.isPending}
        trialDurationDays={project.trialDurationDays}
      />
    </div>
  );
}

// ─── Risk Assessment ──────────────────────────────────────────────────────────

const EFFECT_META = {
  minimal:      { label: 'Minimal',      color: 'border-emerald-600/40 text-emerald-400 bg-emerald-500/10' },
  moderate:     { label: 'Moderate',     color: 'border-yellow-600/40 text-yellow-400 bg-yellow-500/10' },
  severe:       { label: 'Severe',       color: 'border-orange-600/40 text-orange-400 bg-orange-500/10' },
  catastrophic: { label: 'Catastrophic', color: 'border-red-600/40 text-red-400 bg-red-500/10' },
};

function RiskAssessmentSection({ project, isCreator, isAuditor }) {
  const qc = useQueryClient();
  const risks = project.risks || [];
  const canEdit = isCreator || (isAuditor && project.auditStatus === 'in-review');
  const [draft, setDraft] = useState({ description: '', effect: 'minimal' });

  const addMutation = useMutation({
    mutationFn: (data) => api.post(`/projects/${project._id}/risks`, data),
    onSuccess: () => {
      qc.invalidateQueries(['project', project._id]);
      setDraft({ description: '', effect: 'minimal' });
      toast.success('Risk added');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add risk'),
  });

  const removeMutation = useMutation({
    mutationFn: (riskId) => api.delete(`/projects/${project._id}/risks/${riskId}`),
    onSuccess: () => {
      qc.invalidateQueries(['project', project._id]);
      toast.success('Risk removed');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to remove risk'),
  });

  const handleAdd = () => {
    if (!draft.description.trim()) return;
    addMutation.mutate({ description: draft.description.trim(), effect: draft.effect });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <SectionHeader icon={AlertTriangle} title="Risk Assessment" />

      {/* Auditor add form */}
      {canEdit && (
        <div className="mb-4 space-y-3 bg-slate-800/50 border border-slate-700 rounded-lg p-3">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide">Add a Risk Entry</p>
          <textarea
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd(); } }}
            rows={2}
            placeholder="Describe a potential risk observed during review..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(EFFECT_META).map(([value, { label, color }]) => (
              <button
                key={value}
                type="button"
                onClick={() => setDraft({ ...draft, effect: value })}
                className={`py-1.5 rounded-lg border text-xs font-semibold transition ${
                  draft.effect === value ? color : 'border-slate-700 text-slate-400 bg-slate-800/50 hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={addMutation.isPending || !draft.description.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition"
          >
            <Plus className="w-3.5 h-3.5" />
            {addMutation.isPending ? 'Adding…' : 'Add Risk'}
          </button>
        </div>
      )}

      {/* Risk list */}
      {risks.length > 0 ? (
        <div className="space-y-3">
          {risks.map((risk, idx) => {
            const meta = EFFECT_META[risk.effect] || EFFECT_META.minimal;
            return (
              <div key={risk._id || idx} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 flex items-start gap-3">
                <div className={`mt-0.5 p-1.5 rounded-md border ${meta.color} shrink-0`}>
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 leading-relaxed break-words">{risk.description}</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wide">Effect:</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${meta.color}`}>
                      {meta.label}
                    </span>
                  </div>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => removeMutation.mutate(risk._id)}
                    disabled={removeMutation.isPending}
                    className="text-slate-500 hover:text-red-400 transition shrink-0 mt-0.5"
                    title="Remove risk"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-slate-500 text-sm">No risks declared for this project.</p>
      )}
    </div>
  );
}

// ─── ProjectDetail ─────────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isCreator, isAuditor } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get(`/projects/${id}`).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/projects/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(['projects']);
      qc.invalidateQueries(['stats']);
      toast.success('Project deleted');
      navigate('/projects');
    },
    onError: () => toast.error('Failed to delete project'),
  });

  const handleDelete = () => setShowDeleteModal(true);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-center text-slate-400">Project not found.</div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        {isCreator && (
          <div className="flex gap-2">
            <Link
              to={`/projects/${id}/edit`}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm rounded-lg transition"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-sm rounded-lg transition"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_630px] gap-6 items-start">

        {/* ── LEFT COLUMN: main content ── */}
        <div className="flex flex-col gap-4">

          {/* Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h1 className="text-2xl font-bold text-white">{project.name}</h1>
              <div className="flex gap-2 shrink-0">
                <StatusBadge status={project.status} />
                <RiskBadge risk={project.riskLevel} />
              </div>
            </div>

            {project.description && <p className="text-slate-400 text-sm mb-3 leading-relaxed">{project.description}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
              <SummaryItem icon={User} label="Project Owner" value={project.owner?.name} />
              <SummaryItem icon={Building} label="Department" value={project.owner?.department} />
              <SummaryItem icon={Mail} label="Contact" value={project.owner?.email} />
              <SummaryItem icon={DollarSign} label="Budget" value={project.budget > 0 ? `$${project.budget.toLocaleString()}` : ''} />
              <SummaryItem icon={Calendar} label="Start Date" value={project.startDate ? format(new Date(project.startDate), 'MMM d, yyyy') : ''} />
              <SummaryItem icon={Calendar} label="Target End" value={project.targetEndDate ? format(new Date(project.targetEndDate), 'MMM d, yyyy') : ''} />
              <SummaryItem icon={User} label="Registered By" value={project.createdBy?.name} />
            </div>
          </div>

          {/* Tech Stack */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <SectionHeader icon={Code2} title="Tech Stack" />
            {project.techStack?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {project.techStack.map((tech) => (
                  <span key={tech} className="bg-indigo-600/10 border border-indigo-600/20 text-indigo-400 text-xs px-2.5 py-1 rounded-lg">
                    {tech}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No tech stack specified.</p>
            )}
          </div>

          {/* Notes */}
          {project.notes && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <SectionHeader icon={FileText} title="Notes" />
              <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap break-words">{project.notes}</p>
            </div>
          )}

          {/* Problem */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <SectionHeader icon={CircleHelp} title="Identify the Problem" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ContentBlock
                icon={Workflow}
                label="What is the manual process today? What is currently being done?"
                value={project.problemDefinition?.currentProcess}
              />
              <ContentBlock
                icon={Clock3}
                label="How long does this manual process currently take?"
                value={project.problemDefinition?.currentTiming}
              />
              <div className="md:col-span-2">
                <ContentBlock
                  icon={Target}
                  label="What does the ideal outcome look like?"
                  value={project.problemDefinition?.idealOutcome}
                />
              </div>
            </div>
          </div>

          {/* Solution */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <SectionHeader icon={Lightbulb} title="Propose a Solution" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <ContentBlock
                  icon={Wrench}
                  label="What tool or approach do you want to use (backend and frontend)?"
                  value={project.proposedSolution?.implementationApproach}
                />
              </div>
              <div className="md:col-span-2">
                <ContentBlock
                  icon={Route}
                  label="What specific task or workflow will this affect?"
                  value={project.proposedSolution?.impactedWorkflow}
                />
              </div>
              <ContentBlock
                icon={Users}
                label="Who on the team or other department will use it?"
                value={project.proposedSolution?.targetUsers}
              />
              <ContentBlock
                icon={Database}
                label="What data sources will the tool access?"
                value={project.proposedSolution?.dataSources}
              />
              <ContentBlock
                icon={BadgeCheck}
                label="How will the accuracy of the results be verified?"
                value={project.proposedSolution?.validationMethod}
              />
              <ContentBlock
                icon={Timer}
                label="How much time will be saved with this new tool?"
                value={project.proposedSolution?.estimatedTimeSavings}
              />
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN: audit, media, docs, milestones, incidents ── */}
        <div className="flex flex-col gap-4 sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-track]:bg-transparent">

          {/* Audit */}
          <AuditSection
            project={project}
            isCreator={isCreator}
            isAuditor={isAuditor}
          />

          {/* Risk Assessment */}
          <RiskAssessmentSection project={project} isCreator={isCreator} isAuditor={isAuditor} />

          {/* Milestones */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <MilestoneTracker project={project} />
          </div>

          {/* Incidents */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <IncidentLog project={project} />
          </div>

          {/* Documentation */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <SectionHeader icon={FileText} title="Documentation" />
            {project.documents?.length ? (
              <ul className="space-y-2">
                {project.documents.map((item, idx) => (
                  <li key={`${item.url}-${idx}`} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                    <span className="text-sm text-slate-200 truncate inline-flex items-center gap-2">
                      <FileSearch className="w-4 h-4 text-indigo-400 shrink-0" />
                      {item.originalName}
                    </span>
                    <button
                      onClick={() => setPreviewItem({ type: 'pdf', url: item.url, name: item.originalName })}
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 transition shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-sm">No documentation uploaded.</p>
            )}
          </div>

          {/* Media or Screenshots */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <SectionHeader icon={ImageIcon} title="Media or Screenshots" />
            {project.media?.length ? (
              <div className="grid grid-cols-2 gap-3">
                {project.media.map((item, idx) => (
                  <button
                    key={`${item.url}-${idx}`}
                    onClick={() => setPreviewItem({ type: 'image', url: item.url, name: item.originalName })}
                    className="group relative aspect-video rounded-lg overflow-hidden border border-slate-700 bg-slate-800"
                  >
                    <img src={item.url} alt={item.originalName} className="w-full h-full object-cover group-hover:scale-105 transition duration-200" />
                    <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/45 transition flex items-center justify-center">
                      <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No screenshots uploaded.</p>
            )}
          </div>

        </div>
      </div>
      <DeleteProjectModal
        open={showDeleteModal}
        loading={deleteMutation.isPending}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={() => {
          deleteMutation.mutate();
          setShowDeleteModal(false);
        }}
      />
      <PreviewModal open={Boolean(previewItem)} item={previewItem} onClose={() => setPreviewItem(null)} />
    </div>
  );
}
