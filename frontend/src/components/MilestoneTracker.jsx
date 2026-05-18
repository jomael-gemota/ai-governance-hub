import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Circle, Flag, Plus } from 'lucide-react';
import { format } from 'date-fns';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function AddMilestoneForm({ projectId, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: '', dueDate: '' });

  const mutation = useMutation({
    mutationFn: (data) => api.post(`/projects/${projectId}/milestones`, data),
    onSuccess: () => {
      qc.invalidateQueries(['project', projectId]);
      toast.success('Milestone added');
      onClose();
    },
    onError: () => toast.error('Failed to add milestone'),
  });

  const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3 mb-4">
      <h4 className="text-white font-medium text-sm">Add Milestone</h4>
      <input
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder="Milestone title *"
        className={inputCls}
      />
      <input
        type="date"
        value={form.dueDate}
        onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
        className={inputCls}
      />
      <div className="flex gap-2">
        <button
          onClick={() => mutation.mutate({ ...form, dueDate: form.dueDate || undefined })}
          disabled={!form.title || mutation.isPending}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium py-2 rounded-lg transition"
        >
          {mutation.isPending ? 'Adding...' : 'Add Milestone'}
        </button>
        <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function MilestoneTracker({ project }) {
  const { isAuditor } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: ({ milestoneId, completed }) =>
      api.patch(`/projects/${project._id}/milestones/${milestoneId}`, { completed }),
    onSuccess: () => qc.invalidateQueries(['project', project._id]),
    onError: () => toast.error('Failed to update milestone'),
  });

  const milestones = project.milestones || [];
  const completed = milestones.filter((m) => m.completed).length;
  const pct = milestones.length > 0 ? Math.round((completed / milestones.length) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-indigo-400" />
          <h3 className="text-white font-semibold">Milestones</h3>
          {milestones.length > 0 && (
            <span className="text-slate-500 text-xs">{completed}/{milestones.length} complete</span>
          )}
        </div>
        {isAuditor && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        )}
      </div>

      {milestones.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>Progress</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {showForm && <AddMilestoneForm projectId={project._id} onClose={() => setShowForm(false)} />}

      {milestones.length === 0 ? (
        <p className="text-slate-500 text-sm">No milestones defined yet.</p>
      ) : (
        <div className="space-y-1.5">
          {milestones.map((m) => (
            <div
              key={m._id}
              className={`flex items-center gap-3 p-3 rounded-lg transition ${m.completed ? 'opacity-60' : ''}`}
            >
              <button
                onClick={() => isAuditor && toggleMutation.mutate({ milestoneId: m._id, completed: !m.completed })}
                disabled={!isAuditor || toggleMutation.isPending}
                className={`shrink-0 transition ${isAuditor ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
              >
                {m.completed
                  ? <CheckCircle className="w-5 h-5 text-emerald-400" />
                  : <Circle className="w-5 h-5 text-slate-600" />
                }
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${m.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                  {m.title}
                </p>
                {m.dueDate && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Due {format(new Date(m.dueDate), 'MMM d, yyyy')}
                    {m.completedAt && ` · Completed ${format(new Date(m.completedAt), 'MMM d')}`}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
