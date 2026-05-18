import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit2, Trash2, Calendar, DollarSign,
  User, Building, Mail, Code2, FileText, Image as ImageIcon,
  CircleHelp, Lightbulb, XCircle, Workflow, Clock3, Target, Wrench,
  Route, Users, Database, BadgeCheck, Timer, Eye, FileSearch, X,
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

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isCreator } = useAuth();
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
    <div className="p-6 max-w-6xl mx-auto">
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

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-4">
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
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-4">
        <SectionHeader icon={Code2} title="Tech Stack" />
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
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-4">
          <SectionHeader icon={FileText} title="Notes" />
          <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap break-words">{project.notes}</p>
        </div>
      )}

      {/* Problem */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-4">
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
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-4">
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

      {/* Attachments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <SectionHeader icon={ImageIcon} title="Media or Screenshots" />
          {project.media?.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 transition shrink-0"
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
