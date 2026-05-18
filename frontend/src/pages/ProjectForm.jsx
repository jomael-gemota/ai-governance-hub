import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Plus, ArrowLeft } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const FIELD = (label, name, type = 'text', placeholder = '') => ({ label, name, type, placeholder });

export default function ProjectForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    name: '', description: '', notes: '',
    status: 'planning', riskLevel: 'low', budget: '',
    startDate: '', targetEndDate: '',
    'owner.name': '', 'owner.department': '', 'owner.email': '',
  });
  const [techInput, setTechInput] = useState('');
  const [techStack, setTechStack] = useState([]);

  const { data: project } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get(`/projects/${id}`).then((r) => r.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name || '',
        description: project.description || '',
        notes: project.notes || '',
        status: project.status || 'planning',
        riskLevel: project.riskLevel || 'low',
        budget: project.budget || '',
        startDate: project.startDate ? project.startDate.slice(0, 10) : '',
        targetEndDate: project.targetEndDate ? project.targetEndDate.slice(0, 10) : '',
        'owner.name': project.owner?.name || '',
        'owner.department': project.owner?.department || '',
        'owner.email': project.owner?.email || '',
      });
      setTechStack(project.techStack || []);
    }
  }, [project]);

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit ? api.put(`/projects/${id}`, data) : api.post('/projects', data),
    onSuccess: (res) => {
      qc.invalidateQueries(['projects']);
      qc.invalidateQueries(['stats']);
      toast.success(isEdit ? 'Project updated' : 'Project created');
      navigate(`/projects/${res.data._id}`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Something went wrong');
    },
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const addTech = () => {
    const t = techInput.trim();
    if (t && !techStack.includes(t)) setTechStack([...techStack, t]);
    setTechInput('');
  };

  const removeTech = (t) => setTechStack(techStack.filter((x) => x !== t));

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      name: form.name,
      description: form.description,
      notes: form.notes,
      status: form.status,
      riskLevel: form.riskLevel,
      budget: form.budget ? Number(form.budget) : 0,
      startDate: form.startDate || undefined,
      targetEndDate: form.targetEndDate || undefined,
      owner: {
        name: form['owner.name'],
        department: form['owner.department'],
        email: form['owner.email'],
      },
      techStack,
    });
  };

  const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm";
  const labelCls = "block text-sm font-medium text-slate-300 mb-1.5";

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 text-sm transition">
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h1 className="text-2xl font-bold text-white mb-6">
        {isEdit ? 'Edit Project' : 'New AI Project'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wide text-slate-400">Basic Info</h2>

          <div>
            <label className={labelCls}>Project Name *</label>
            <input name="name" value={form.name} onChange={handleChange} required className={inputCls} placeholder="e.g. Customer Churn Prediction" />
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3} className={inputCls} placeholder="Brief description of the AI initiative..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Status</label>
              <select name="status" value={form.status} onChange={handleChange} className={inputCls}>
                {['planning', 'active', 'on-hold', 'completed', 'failed'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Risk Level</label>
              <select name="riskLevel" value={form.riskLevel} onChange={handleChange} className={inputCls}>
                {['low', 'medium', 'high', 'critical'].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Start Date</label>
              <input type="date" name="startDate" value={form.startDate} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Target End Date</label>
              <input type="date" name="targetEndDate" value={form.targetEndDate} onChange={handleChange} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Budget (USD)</label>
            <input type="number" name="budget" value={form.budget} onChange={handleChange} min="0" className={inputCls} placeholder="0" />
          </div>
        </section>

        {/* Owner */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-slate-400 font-semibold text-sm uppercase tracking-wide">Project Owner</h2>
          <div>
            <label className={labelCls}>Owner Name *</label>
            <input name="owner.name" value={form['owner.name']} onChange={handleChange} required className={inputCls} placeholder="John Doe" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Department</label>
              <input name="owner.department" value={form['owner.department']} onChange={handleChange} className={inputCls} placeholder="Engineering" />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" name="owner.email" value={form['owner.email']} onChange={handleChange} className={inputCls} placeholder="john@company.com" />
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-slate-400 font-semibold text-sm uppercase tracking-wide">Tech Stack</h2>
          <div className="flex gap-2">
            <input
              value={techInput}
              onChange={(e) => setTechInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTech(); } }}
              placeholder="e.g. Python, LangChain, GPT-4..."
              className={`${inputCls} flex-1`}
            />
            <button type="button" onClick={addTech} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition flex items-center gap-1">
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
          {techStack.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {techStack.map((t) => (
                <span key={t} className="flex items-center gap-1 bg-slate-800 border border-slate-700 text-slate-300 text-xs px-2.5 py-1 rounded-lg">
                  {t}
                  <button type="button" onClick={() => removeTech(t)} className="text-slate-500 hover:text-red-400 transition ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Notes */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-slate-400 font-semibold text-sm uppercase tracking-wide mb-4">Notes</h2>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={4} className={inputCls} placeholder="Any additional notes, context, or observations..." />
        </section>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition"
          >
            {mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Project'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
