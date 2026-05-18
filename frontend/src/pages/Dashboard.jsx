import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { FolderKanban, Activity, CheckCircle, XCircle, PauseCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import api from '../api/axios';
import { SeverityBadge } from '../components/StatusBadge';

const STATUS_COLORS = {
  active: '#10b981',
  planning: '#6366f1',
  completed: '#64748b',
  failed: '#ef4444',
  'on-hold': '#f59e0b',
};

const RISK_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-400 text-sm font-medium">{label}</span>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
        <p className="text-white capitalize">{payload[0].name}</p>
        <p className="text-indigo-400 font-semibold">{payload[0].value} project{payload[0].value !== 1 ? 's' : ''}</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get('/stats').then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Overview of all AI initiatives</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <StatCard icon={FolderKanban} label="Total Projects" value={stats?.total ?? 0} color="bg-indigo-500/20 text-indigo-400" />
        <StatCard icon={Activity} label="Active" value={stats?.active ?? 0} color="bg-emerald-500/20 text-emerald-400" />
        <StatCard icon={FolderKanban} label="Planning" value={stats?.planning ?? 0} color="bg-blue-500/20 text-blue-400" />
        <StatCard icon={PauseCircle} label="On Hold" value={stats?.onHold ?? 0} color="bg-amber-500/20 text-amber-400" />
        <StatCard icon={CheckCircle} label="Completed" value={stats?.completed ?? 0} color="bg-slate-500/20 text-slate-400" />
        <StatCard icon={XCircle} label="Failed" value={stats?.failed ?? 0} color="bg-red-500/20 text-red-400" sub={stats?.highRisk > 0 ? `${stats.highRisk} high/critical risk` : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {/* Status distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Status Distribution</h2>
          {stats?.byStatus?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stats.byStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {stats.byStatus.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-500 text-sm">No data</p>}
          <div className="flex flex-wrap gap-2 mt-2">
            {stats?.byStatus?.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[s.name] || '#64748b' }} />
                <span className="capitalize">{s.name}</span>
                <span className="text-slate-500">({s.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Risk Distribution</h2>
          {stats?.byRisk?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.byRisk} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {stats.byRisk.map((entry) => (
                    <Cell key={entry.name} fill={RISK_COLORS[entry.name] || '#64748b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-500 text-sm">No data</p>}
        </div>

        {/* Top Tech Stack */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Top Technologies</h2>
          {stats?.topTechStack?.length > 0 ? (
            <div className="space-y-2">
              {stats.topTechStack.map((tech, i) => (
                <div key={tech.name} className="flex items-center gap-3">
                  <span className="text-slate-500 text-xs w-4 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-300 text-sm truncate">{tech.name}</span>
                      <span className="text-slate-500 text-xs ml-2 shrink-0">{tech.count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${(tech.count / stats.topTechStack[0].count) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-slate-500 text-sm">No tech stack data yet</p>}
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h2 className="text-white font-semibold">Recent Incidents</h2>
        </div>
        {stats?.recentIncidents?.length > 0 ? (
          <div className="space-y-2">
            {stats.recentIncidents.map((item, i) => (
              <div key={i} className="flex items-center gap-4 py-2.5 border-b border-slate-800 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-medium">{item.incident?.title}</p>
                  <p className="text-slate-400 text-xs">{item.name}</p>
                </div>
                <SeverityBadge severity={item.incident?.severity} />
                <span className="text-slate-500 text-xs shrink-0">
                  {item.incident?.date ? format(new Date(item.incident.date), 'MMM d') : ''}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">No incidents recorded yet.</p>
        )}
      </div>
    </div>
  );
}
