import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Plus, ArrowLeft, Upload, FileText, Image as ImageIcon } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function ProjectForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();

  const [form, setForm] = useState({
    name: '', description: '', notes: '',
    status: 'planning', riskLevel: 'low', budget: '',
    startDate: '', targetEndDate: '',
    ownerDepartment: '',
    currentProcess: '',
    currentTiming: '',
    idealOutcome: '',
    implementationApproach: '',
    impactedWorkflow: '',
    targetUsers: '',
    dataSources: '',
    validationMethod: '',
    estimatedTimeSavings: '',
  });
  const [techInput, setTechInput] = useState('');
  const [techStack, setTechStack] = useState([]);
  const [existingMedia, setExistingMedia] = useState([]);
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [newMedia, setNewMedia] = useState([]);
  const [newDocuments, setNewDocuments] = useState([]);

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
        ownerDepartment: project.owner?.department || '',
        currentProcess: project.problemDefinition?.currentProcess || '',
        currentTiming: project.problemDefinition?.currentTiming || '',
        idealOutcome: project.problemDefinition?.idealOutcome || '',
        implementationApproach: project.proposedSolution?.implementationApproach || '',
        impactedWorkflow: project.proposedSolution?.impactedWorkflow || '',
        targetUsers: project.proposedSolution?.targetUsers || '',
        dataSources: project.proposedSolution?.dataSources || '',
        validationMethod: project.proposedSolution?.validationMethod || '',
        estimatedTimeSavings: project.proposedSolution?.estimatedTimeSavings || '',
      });
      setTechStack(project.techStack || []);
      setExistingMedia(project.media || []);
      setExistingDocuments(project.documents || []);
    }
  }, [project]);

  const mutation = useMutation({
    mutationFn: (data) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        formData.append(key, value);
      });
      newMedia.forEach((file) => formData.append('media', file));
      newDocuments.forEach((file) => formData.append('documents', file));
      return isEdit ? api.put(`/projects/${id}`, formData) : api.post('/projects', formData);
    },
    onSuccess: (res) => {
      qc.invalidateQueries(['projects']);
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

  const handleMediaChange = (e) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length !== files.length) {
      toast.error('Only image files are allowed for screenshots.');
    }
    const maxAdd = 5 - existingMedia.length - newMedia.length;
    if (maxAdd <= 0) {
      toast.error('Maximum of 5 screenshots reached.');
      return;
    }
    setNewMedia((prev) => [...prev, ...imageFiles.slice(0, maxAdd)]);
    e.target.value = '';
  };

  const handleDocumentsChange = (e) => {
    const files = Array.from(e.target.files || []);
    const pdfFiles = files.filter((f) => f.type === 'application/pdf');
    if (pdfFiles.length !== files.length) {
      toast.error('Only PDF files are allowed for documentation.');
    }
    const maxAdd = 3 - existingDocuments.length - newDocuments.length;
    if (maxAdd <= 0) {
      toast.error('Maximum of 3 documentation files reached.');
      return;
    }
    setNewDocuments((prev) => [...prev, ...pdfFiles.slice(0, maxAdd)]);
    e.target.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!user?.name || !user?.email) {
      toast.error('Unable to read your profile details. Please sign in again.');
      return;
    }
    mutation.mutate({
      name: form.name,
      description: form.description,
      notes: form.notes,
      status: form.status,
      riskLevel: form.riskLevel,
      budget: form.budget ? Number(form.budget) : 0,
      startDate: form.startDate || undefined,
      targetEndDate: form.targetEndDate || undefined,
      ownerDepartment: form.ownerDepartment || '',
      techStack: JSON.stringify(techStack),
      problemDefinition: JSON.stringify({
        currentProcess: form.currentProcess,
        currentTiming: form.currentTiming,
        idealOutcome: form.idealOutcome,
      }),
      proposedSolution: JSON.stringify({
        implementationApproach: form.implementationApproach,
        impactedWorkflow: form.impactedWorkflow,
        targetUsers: form.targetUsers,
        dataSources: form.dataSources,
        validationMethod: form.validationMethod,
        estimatedTimeSavings: form.estimatedTimeSavings,
      }),
      existingMedia: JSON.stringify(existingMedia),
      existingDocuments: JSON.stringify(existingDocuments),
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
        {/* Project Owner */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-slate-400 font-semibold text-sm uppercase tracking-wide">Project Owner</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Owner Name</label>
              <input value={user?.name || ''} readOnly className={`${inputCls} bg-slate-900 text-slate-400`} />
            </div>
            <div>
              <label className={labelCls}>Owner Email</label>
              <input value={user?.email || ''} readOnly className={`${inputCls} bg-slate-900 text-slate-400`} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Department *</label>
            <input
              name="ownerDepartment"
              value={form.ownerDepartment}
              onChange={handleChange}
              required
              className={inputCls}
              placeholder="e.g. Product, Operations, Finance"
            />
          </div>
        </section>

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

        {/* Identify the Problem */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-slate-400 font-semibold text-sm uppercase tracking-wide">Identify the Problem</h2>
          <div>
            <label className={labelCls}>What manual process is being used today?</label>
            <textarea
              name="currentProcess"
              value={form.currentProcess}
              onChange={handleChange}
              rows={3}
              className={inputCls}
              placeholder="Describe how this work is currently done without automation."
            />
          </div>
          <div>
            <label className={labelCls}>How long does the manual process take today?</label>
            <textarea
              name="currentTiming"
              value={form.currentTiming}
              onChange={handleChange}
              rows={2}
              className={inputCls}
              placeholder="Example: 6 hours per week for one analyst."
            />
          </div>
          <div>
            <label className={labelCls}>What does the ideal outcome look like?</label>
            <textarea
              name="idealOutcome"
              value={form.idealOutcome}
              onChange={handleChange}
              rows={3}
              className={inputCls}
              placeholder="Describe the target future state and success criteria."
            />
          </div>
        </section>

        {/* Propose a Solution */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-slate-400 font-semibold text-sm uppercase tracking-wide">Propose a Solution</h2>
          <div>
            <label className={labelCls}>What tool or approach do you plan to use? (frontend + backend)</label>
            <textarea
              name="implementationApproach"
              value={form.implementationApproach}
              onChange={handleChange}
              rows={3}
              className={inputCls}
              placeholder="Example: React frontend + Node API + Python model service."
            />
          </div>
          <div>
            <label className={labelCls}>What task or workflow will it improve?</label>
            <textarea
              name="impactedWorkflow"
              value={form.impactedWorkflow}
              onChange={handleChange}
              rows={2}
              className={inputCls}
              placeholder="Which business process will change?"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Who will use this tool?</label>
              <textarea
                name="targetUsers"
                value={form.targetUsers}
                onChange={handleChange}
                rows={2}
                className={inputCls}
                placeholder="Teams, departments, or roles."
              />
            </div>
            <div>
              <label className={labelCls}>What data sources will it access?</label>
              <textarea
                name="dataSources"
                value={form.dataSources}
                onChange={handleChange}
                rows={2}
                className={inputCls}
                placeholder="Systems, files, APIs, databases."
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>How will accuracy be verified?</label>
              <textarea
                name="validationMethod"
                value={form.validationMethod}
                onChange={handleChange}
                rows={2}
                className={inputCls}
                placeholder="Human QA, benchmark tests, acceptance criteria."
              />
            </div>
            <div>
              <label className={labelCls}>How much time will this save?</label>
              <textarea
                name="estimatedTimeSavings"
                value={form.estimatedTimeSavings}
                onChange={handleChange}
                rows={2}
                className={inputCls}
                placeholder="Example: reduce from 6 hours to 1 hour weekly."
              />
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

        {/* Media or Screenshots */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-slate-400 font-semibold text-sm uppercase tracking-wide">Media or Screenshots</h2>
          <p className="text-xs text-slate-500">Upload snapshots of your software (max 5 screenshots).</p>
          <label className="flex items-center justify-center gap-2 border border-dashed border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-300 hover:border-indigo-500 hover:text-indigo-300 transition cursor-pointer">
            <Upload className="w-4 h-4" />
            Upload Images
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleMediaChange} />
          </label>
          <div className="space-y-2">
            {existingMedia.map((item, idx) => (
              <div key={`${item.url}-${idx}`} className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2">
                <a href={item.url} target="_blank" rel="noreferrer" className="text-sm text-indigo-300 hover:underline truncate">
                  {item.originalName}
                </a>
                <button type="button" onClick={() => setExistingMedia((prev) => prev.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {newMedia.map((file, idx) => (
              <div key={`${file.name}-${idx}`} className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2">
                <span className="text-sm text-slate-300 truncate flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-slate-400" />
                  {file.name}
                </span>
                <button type="button" onClick={() => setNewMedia((prev) => prev.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Documentation */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-slate-400 font-semibold text-sm uppercase tracking-wide">Documentation</h2>
          <p className="text-xs text-slate-500">Upload PDF documentation (max 3 documents).</p>
          <label className="flex items-center justify-center gap-2 border border-dashed border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-300 hover:border-indigo-500 hover:text-indigo-300 transition cursor-pointer">
            <Upload className="w-4 h-4" />
            Upload PDFs
            <input type="file" accept="application/pdf" multiple className="hidden" onChange={handleDocumentsChange} />
          </label>
          <div className="space-y-2">
            {existingDocuments.map((item, idx) => (
              <div key={`${item.url}-${idx}`} className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2">
                <a href={item.url} target="_blank" rel="noreferrer" className="text-sm text-indigo-300 hover:underline truncate flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  {item.originalName}
                </a>
                <button type="button" onClick={() => setExistingDocuments((prev) => prev.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {newDocuments.map((file, idx) => (
              <div key={`${file.name}-${idx}`} className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2">
                <span className="text-sm text-slate-300 truncate flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  {file.name}
                </span>
                <button type="button" onClick={() => setNewDocuments((prev) => prev.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
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
