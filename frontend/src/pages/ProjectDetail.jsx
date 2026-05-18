import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit2, Trash2, Calendar, DollarSign,
  User, Building, Mail, Code2, FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../api/axios';
import { StatusBadge, RiskBadge } from '../components/StatusBadge';
import IncidentLog from '../components/IncidentLog';
import MilestoneTracker from '../components/MilestoneTracker';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function DetailItem({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0 text-slate-500">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm text-slate-200 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAuditor } = useAuth();

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

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this project? This cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        {isAuditor && (
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

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-white">{project.name}</h1>
          <div className="flex gap-2 shrink-0">
            <StatusBadge status={project.status} />
            <RiskBadge risk={project.riskLevel} />
          </div>
        </div>

        {project.description && (
          <p className="text-slate-400 text-sm mb-4 leading-relaxed">{project.description}</p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <DetailItem icon={User} label="Project Owner" value={project.owner?.name} />
          <DetailItem icon={Building} label="Department" value={project.owner?.department} />
          <DetailItem icon={Mail} label="Contact" value={project.owner?.email} />
          {project.budget > 0 && (
            <DetailItem icon={DollarSign} label="Budget" value={`$${project.budget.toLocaleString()}`} />
          )}
          {project.startDate && (
            <DetailItem icon={Calendar} label="Start Date" value={format(new Date(project.startDate), 'MMM d, yyyy')} />
          )}
          {project.targetEndDate && (
            <DetailItem icon={Calendar} label="Target End" value={format(new Date(project.targetEndDate), 'MMM d, yyyy')} />
          )}
          {project.createdBy && (
            <DetailItem icon={User} label="Registered By" value={project.createdBy.name} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Tech Stack */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Code2 className="w-4 h-4 text-indigo-400" />
            <h3 className="text-white font-semibold">Tech Stack</h3>
          </div>
          {project.techStack?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {project.techStack.map((tech) => (
                <span key={tech} className="bg-indigo-600/10 border border-indigo-600/20 text-indigo-300 text-xs px-2.5 py-1 rounded-lg">
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
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-slate-400" />
              <h3 className="text-white font-semibold">Notes</h3>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">{project.notes}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Milestones */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <MilestoneTracker project={project} />
        </div>

        {/* Incidents */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <IncidentLog project={project} />
        </div>
      </div>
    </div>
  );
}
