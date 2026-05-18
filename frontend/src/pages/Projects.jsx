import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Filter, PlusCircle, FolderOpen, LayoutGrid, List, ChevronRight, AlertTriangle, User } from 'lucide-react';
import api from '../api/axios';
import ProjectCard from '../components/ProjectCard';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, RiskBadge } from '../components/StatusBadge';

const STATUSES = ['', 'planning', 'active', 'on-hold', 'completed', 'failed'];
const RISKS = ['', 'low', 'medium', 'high', 'critical'];

function ProjectListRow({ project }) {
  const unresolvedIncidents = project.incidents?.filter((i) => !i.resolved).length || 0;
  const completedMilestones = project.milestones?.filter((m) => m.completed).length || 0;
  const totalMilestones = project.milestones?.length || 0;

  return (
    <Link
      to={`/projects/${project._id}`}
      className="group flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 hover:border-indigo-600/40 hover:bg-slate-900/80 transition"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-white truncate group-hover:text-indigo-400 transition">
            {project.name}
          </p>
          <StatusBadge status={project.status} />
          <RiskBadge risk={project.riskLevel} />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            {project.owner?.name || 'No owner'}
          </span>
          {project.owner?.department && <span>{project.owner.department}</span>}
          {totalMilestones > 0 && <span>{completedMilestones}/{totalMilestones} milestones</span>}
          {unresolvedIncidents > 0 && (
            <span className="inline-flex items-center gap-1 text-red-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              {unresolvedIncidents} open incident{unresolvedIncidents > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition shrink-0" />
    </Link>
  );
}

export default function Projects() {
  const { isCreator } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [page, setPage] = useState(1);
  const [view, setView] = useState(() => localStorage.getItem('projects-view-mode') || 'grid');

  useEffect(() => {
    localStorage.setItem('projects-view-mode', view);
  }, [view]);

  const queryKey = ['projects', { search, status, riskLevel, page }];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      api
        .get('/projects', { params: { search: search || undefined, status: status || undefined, riskLevel: riskLevel || undefined, page, limit: 12 } })
        .then((r) => r.data),
    keepPreviousData: true,
  });

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-slate-400 text-sm mt-1">
            {data?.total != null ? `${data.total} AI initiative${data.total !== 1 ? 's' : ''} tracked` : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setView('grid')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition ${
                view === 'grid'
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              aria-label="Grid view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Grid
            </button>
            <button
              onClick={() => setView('list')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition ${
                view === 'list'
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              aria-label="List view"
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
          </div>

          {isCreator && (
            <Link
              to="/projects/new"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-600/30 text-sm font-medium px-4 py-2 rounded-lg transition shadow-sm"
              style={{ color: '#ffffff' }}
            >
              <PlusCircle className="w-4 h-4" />
              New Project
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={handleSearch}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All statuses</option>
            {STATUSES.filter(Boolean).map((s) => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </select>
          <select
            value={riskLevel}
            onChange={(e) => { setRiskLevel(e.target.value); setPage(1); }}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All risks</option>
            {RISKS.filter(Boolean).map((r) => (
              <option key={r} value={r} className="capitalize">{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data?.projects?.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <FolderOpen className="w-12 h-12 text-slate-700 mb-3" />
          <p className="text-slate-400 font-medium">No projects found</p>
          <p className="text-slate-500 text-sm mt-1">
            {isCreator ? 'Create your first AI project to get started.' : 'No projects match your filters.'}
          </p>
        </div>
      ) : (
        <>
          {view === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {data?.projects?.map((project) => (
                <ProjectCard key={project._id} project={project} />
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {data?.projects?.map((project) => (
                <ProjectListRow key={project._id} project={project} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {data?.pages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg text-sm bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-slate-400">
                {page} / {data.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={page === data.pages}
                className="px-4 py-2 rounded-lg text-sm bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
