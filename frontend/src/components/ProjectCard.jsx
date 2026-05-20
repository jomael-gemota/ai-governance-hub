import { Link } from 'react-router-dom';
import { AlertTriangle, Calendar, User, ChevronRight, Trash2 } from 'lucide-react';
import { StatusBadge, RiskBadge } from './StatusBadge';
import { format } from 'date-fns';

export default function ProjectCard({ project, isAdmin, onDelete }) {
  const unresolvedIncidents = project.incidents?.filter((i) => !i.resolved).length || 0;
  const completedMilestones = project.milestones?.filter((m) => m.completed).length || 0;
  const totalMilestones = project.milestones?.length || 0;

  return (
    <div className="relative group bg-slate-900 border border-slate-800 rounded-xl hover:border-indigo-500/50 hover:bg-slate-900/80 transition">
      <Link to={`/projects/${project._id}`} className="block p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="text-white font-semibold text-base truncate group-hover:text-indigo-400 transition">
              {project.name}
            </h3>
            <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1">
              <User className="w-3 h-3" />
              {project.owner?.name}
              {project.owner?.department && ` · ${project.owner.department}`}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 shrink-0 mt-1 transition" />
        </div>

        {project.description && (
          <p className="text-slate-400 text-sm line-clamp-2 mb-3">{project.description}</p>
        )}

        <div className="flex flex-wrap gap-1.5 mb-3">
          <StatusBadge status={project.status} />
          <RiskBadge risk={project.riskLevel} />
          {unresolvedIncidents > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-medium">
              <AlertTriangle className="w-3 h-3" />
              {unresolvedIncidents} open incident{unresolvedIncidents > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {project.techStack?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {project.techStack.slice(0, 4).map((tech) => (
              <span key={tech} className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded">
                {tech}
              </span>
            ))}
            {project.techStack.length > 4 && (
              <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded">
                +{project.techStack.length - 4}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-3 border-t border-slate-800">
          {project.startDate ? (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(project.startDate), 'MMM d, yyyy')}
            </span>
          ) : <span />}
          {totalMilestones > 0 && (
            <span>{completedMilestones}/{totalMilestones} milestones</span>
          )}
        </div>
      </Link>

      {/* Admin-only delete button — top-right corner */}
      {isAdmin && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(project); }}
          className="absolute top-3 right-8 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
          title="Delete project"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
