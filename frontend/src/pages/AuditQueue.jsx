import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, ClipboardList, User, Building2, ChevronRight, FolderOpen,
  FlaskConical, Flag,
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../api/axios';
import { AuditBadge, RiskBadge, StatusBadge } from '../components/StatusBadge';

export default function AuditQueue() {
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['audit-queue'],
    queryFn: () => api.get('/projects/audit-queue/list').then((r) => r.data),
    staleTime: 15_000,
  });

  const pending          = projects.filter((p) => p.auditStatus === 'pending');
  const inReview         = projects.filter((p) => p.auditStatus === 'in-review');
  const trialRun         = projects.filter((p) => p.auditStatus === 'trial-run');
  const trialCompleted   = projects.filter((p) => p.auditStatus === 'trial-completed');

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">Audit Queue</h1>
        </div>
        <p className="text-slate-400 text-sm">
          Projects awaiting or currently under audit review.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <FolderOpen className="w-12 h-12 text-slate-700 mb-3" />
          <p className="text-slate-400 font-medium">No projects awaiting audit</p>
          <p className="text-slate-500 text-sm mt-1">All caught up — check back later.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {trialCompleted.length > 0 && (
            <Section
              title="Final Review Needed"
              count={trialCompleted.length}
              color="text-teal-400"
              icon={Flag}
              description="Trial run complete — submit a final verdict to officially approve or deny."
              projects={trialCompleted}
            />
          )}
          {inReview.length > 0 && (
            <Section
              title="In Review"
              count={inReview.length}
              color="text-blue-400"
              projects={inReview}
            />
          )}
          {pending.length > 0 && (
            <Section
              title="Pending Claim"
              count={pending.length}
              color="text-yellow-400"
              projects={pending}
            />
          )}
          {trialRun.length > 0 && (
            <Section
              title="Trial Run In Progress"
              count={trialRun.length}
              color="text-violet-400"
              icon={FlaskConical}
              description="Approval is locked until the trial period ends."
              projects={trialRun}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, count, color, icon: Icon, description, projects }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className={`w-4 h-4 ${color}`} />}
        <h2 className={`text-sm font-semibold uppercase tracking-wide ${color}`}>
          {title} <span className="ml-1 text-slate-500 normal-case font-normal">({count})</span>
        </h2>
      </div>
      {description && (
        <p className="text-xs text-slate-500 mb-3 ml-6">{description}</p>
      )}
      {!description && <div className="mb-3" />}
      <div className="space-y-2">
        {projects.map((project) => (
          <QueueRow key={project._id} project={project} />
        ))}
      </div>
    </div>
  );
}

function QueueRow({ project }) {
  const submittedAt = project.auditSubmittedAt
    ? format(new Date(project.auditSubmittedAt), 'MMM d, yyyy')
    : null;

  const isTrialStatus = project.auditStatus === 'trial-run' || project.auditStatus === 'trial-completed';
  const trialEndsAt = project.trialEndsAt ? new Date(project.trialEndsAt) : null;
  const trialStartedAt = project.trialStartedAt ? new Date(project.trialStartedAt) : null;
  const now = new Date();
  const daysRemaining = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt - now) / 86400000)) : null;
  const progressPct = (trialStartedAt && trialEndsAt)
    ? Math.min(100, Math.round(((now - trialStartedAt) / (trialEndsAt - trialStartedAt)) * 100))
    : 0;

  const hoverBorder = project.auditStatus === 'trial-completed'
    ? 'hover:border-teal-600/40'
    : project.auditStatus === 'trial-run'
    ? 'hover:border-violet-600/40'
    : 'hover:border-indigo-600/40';

  return (
    <Link
      to={`/projects/${project._id}`}
      className={`group flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 ${hoverBorder} hover:bg-slate-900/80 transition`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <p className="text-sm font-semibold text-white truncate group-hover:text-indigo-400 transition">
            {project.name}
          </p>
          <StatusBadge status={project.status} />
          <RiskBadge risk={project.riskLevel} />
          <AuditBadge status={project.auditStatus} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1">
            <User className="w-3.5 h-3.5 shrink-0" />
            {project.owner?.name || 'No owner'}
          </span>
          {project.owner?.department && (
            <span className="inline-flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              {project.owner.department}
            </span>
          )}
          {submittedAt && !isTrialStatus && (
            <span>Submitted {submittedAt}</span>
          )}
          {project.auditStatus === 'in-review' && project.currentAuditor && (
            <span className="text-blue-400">
              Reviewing: <span className="font-medium">{project.currentAuditor.name}</span>
            </span>
          )}
          {project.auditStatus === 'trial-run' && trialEndsAt && (
            <span className="inline-flex items-center gap-1 text-violet-400">
              <FlaskConical className="w-3 h-3" />
              {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining · ends {format(trialEndsAt, 'MMM d, yyyy')}
            </span>
          )}
          {project.auditStatus === 'trial-completed' && trialEndsAt && (
            <span className="inline-flex items-center gap-1 text-teal-400">
              <Flag className="w-3 h-3" />
              Trial ended {format(trialEndsAt, 'MMM d, yyyy')} · awaiting final verdict
            </span>
          )}
          {project.audits?.length > 0 && (
            <span className="text-slate-500">{project.audits.length} prior audit{project.audits.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        {/* Mini progress bar for trial-run rows */}
        {project.auditStatus === 'trial-run' && trialStartedAt && trialEndsAt && (
          <div className="mt-2 w-full bg-slate-800 rounded-full h-1">
            <div
              className="h-1 rounded-full bg-violet-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition shrink-0" />
    </Link>
  );
}
