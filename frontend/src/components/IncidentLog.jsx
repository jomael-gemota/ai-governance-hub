import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import api from '../api/axios';
import { SeverityBadge } from './StatusBadge';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function AddIncidentForm({ projectId, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: '', description: '', severity: 'medium', date: '' });

  const mutation = useMutation({
    mutationFn: (data) => api.post(`/projects/${projectId}/incidents`, data),
    onSuccess: () => {
      qc.invalidateQueries(['project', projectId]);
      qc.invalidateQueries(['stats']);
      toast.success('Incident logged');
      onClose();
    },
    onError: () => toast.error('Failed to log incident'),
  });

  const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3 mb-4">
      <h4 className="text-white font-medium text-sm">Log New Incident</h4>
      <input
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder="Incident title *"
        className={inputCls}
      />
      <textarea
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder="Description of what happened..."
        rows={3}
        className={inputCls}
      />
      <div className="grid grid-cols-2 gap-3">
        <select
          value={form.severity}
          onChange={(e) => setForm({ ...form, severity: e.target.value })}
          className={inputCls}
        >
          {['low', 'medium', 'high', 'critical'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          className={inputCls}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => mutation.mutate({ ...form, date: form.date || undefined })}
          disabled={!form.title || mutation.isPending}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium py-2 rounded-lg transition"
        >
          {mutation.isPending ? 'Logging...' : 'Log Incident'}
        </button>
        <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition">
          Cancel
        </button>
      </div>
    </div>
  );
}

function IncidentItem({ incident, projectId, canEdit }) {
  const [expanded, setExpanded] = useState(false);
  const qc = useQueryClient();

  const resolveMutation = useMutation({
    mutationFn: (data) => api.patch(`/projects/${projectId}/incidents/${incident._id}`, data),
    onSuccess: () => {
      qc.invalidateQueries(['project', projectId]);
      toast.success('Incident updated');
    },
    onError: () => toast.error('Failed to update incident'),
  });

  return (
    <div className={`border rounded-xl p-4 transition ${incident.resolved ? 'border-slate-800 bg-slate-900/30' : 'border-red-900/40 bg-red-950/10'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium text-sm ${incident.resolved ? 'text-slate-400' : 'text-white'}`}>
              {incident.title}
            </span>
            <SeverityBadge severity={incident.severity} />
            {incident.resolved && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle className="w-3 h-3" />
                Resolved
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs mt-0.5">
            {incident.date ? format(new Date(incident.date), 'MMM d, yyyy') : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canEdit && !incident.resolved && (
            <button
              onClick={() => resolveMutation.mutate({ resolved: true })}
              disabled={resolveMutation.isPending}
              className="text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-800 hover:border-emerald-600 px-2.5 py-1 rounded-lg transition"
            >
              Mark Resolved
            </button>
          )}
          {incident.description && (
            <button onClick={() => setExpanded(!expanded)} className="text-slate-500 hover:text-slate-300 transition">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
      {expanded && incident.description && (
        <p className="text-slate-400 text-sm mt-3 pt-3 border-t border-slate-800">{incident.description}</p>
      )}
    </div>
  );
}

export default function IncidentLog({ project }) {
  const { isCreator, isAuditor } = useAuth();
  const canEdit = isCreator || (isAuditor && project.auditStatus === 'in-review');
  const [showForm, setShowForm] = useState(false);

  const openIncidents = project.incidents?.filter((i) => !i.resolved) || [];
  const resolvedIncidents = project.incidents?.filter((i) => i.resolved) || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h3 className="text-white font-semibold">Incidents</h3>
          {openIncidents.length > 0 && (
            <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs px-2 py-0.5 rounded-full">
              {openIncidents.length} open
            </span>
          )}
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition"
          >
            <Plus className="w-4 h-4" />
            Log Incident
          </button>
        )}
      </div>

      {showForm && <AddIncidentForm projectId={project._id} onClose={() => setShowForm(false)} />}

      {project.incidents?.length === 0 ? (
        <p className="text-slate-500 text-sm">No incidents recorded.</p>
      ) : (
        <div className="space-y-2">
          {openIncidents.map((i) => (
            <IncidentItem key={i._id} incident={i} projectId={project._id} canEdit={canEdit} />
          ))}
          {resolvedIncidents.length > 0 && (
            <>
              {openIncidents.length > 0 && <div className="border-t border-slate-800 my-3" />}
              {resolvedIncidents.map((i) => (
                <IncidentItem key={i._id} incident={i} projectId={project._id} canEdit={canEdit} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
