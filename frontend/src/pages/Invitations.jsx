import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Send, Trash2, RefreshCw, CheckCircle, Clock, AlertCircle, UserPlus, ShieldCheck, ShieldOff } from 'lucide-react';
import { format } from 'date-fns';
import api from '../api/axios';
import toast from 'react-hot-toast';

const ALLOWED_DOMAINS = ['outdoorequipped.com', 'channelprecision.com'];

function RoleBadge({ role }) {
  const styles = role === 'auditor'
    ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium capitalize ${styles}`}>
      {role === 'auditor' ? <ShieldCheck className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
      {role}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: { cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30', icon: Clock },
    accepted: { cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: CheckCircle },
    revoked: { cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30', icon: ShieldOff },
  };
  const { cls, icon: Icon } = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium capitalize ${cls}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}

export default function Invitations() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ email: '', role: 'creator' });

  const { data, isLoading } = useQuery({
    queryKey: ['invitations'],
    queryFn: () => api.get('/invitations').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/invitations', payload).then((r) => r.data),
    onSuccess: (invite) => {
      qc.invalidateQueries(['invitations']);
      setForm({ email: '', role: 'creator' });
      if (invite.emailSent) {
        toast.success('Invitation sent!');
      } else {
        toast.success('Invitation created. Email delivery is disabled — share the sign-in link manually.', { duration: 6000 });
      }
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to send invitation'),
  });

  const resendMutation = useMutation({
    mutationFn: (id) => api.post(`/invitations/${id}/resend`).then((r) => r.data),
    onSuccess: (invite) => {
      qc.invalidateQueries(['invitations']);
      toast.success(invite.emailSent ? 'Email resent' : 'Recorded — email delivery is disabled.');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to resend'),
  });

  const revokeMutation = useMutation({
    mutationFn: (id) => api.delete(`/invitations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(['invitations']);
      toast.success('Invitation revoked');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to revoke'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const email = form.email.trim().toLowerCase();
    const domain = email.split('@')[1];
    if (!ALLOWED_DOMAINS.includes(domain)) {
      toast.error(`Email must end in @${ALLOWED_DOMAINS.join(' or @')}`);
      return;
    }
    createMutation.mutate({ email, role: form.role });
  };

  const invitations = data?.invitations || [];
  const smtpConfigured = data?.smtpConfigured;

  const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Invitations</h1>
        <p className="text-slate-400 text-sm mt-1">
          Invite teammates to the AI Governance Hub. They will sign in with their Google account.
        </p>
      </div>

      {!smtpConfigured && (
        <div className="mb-4 flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-200">Email delivery is not configured</p>
            <p className="text-xs text-amber-100/70 mt-1 leading-relaxed">
              Invitations will still be created in the system, but no email will be sent. Configure SMTP variables in <code className="bg-slate-800 px-1 py-0.5 rounded">backend/.env</code> to enable email delivery.
            </p>
          </div>
        </div>
      )}

      {/* Create form */}
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Mail className="w-4 h-4 text-indigo-400" />
          Send New Invitation
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3">
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder={`name@${ALLOWED_DOMAINS[0]}`}
            className={inputCls}
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className={inputCls}
          >
            <option value="creator">Creator</option>
            <option value="auditor">Auditor</option>
          </select>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-medium px-5 py-2.5 rounded-lg transition text-sm"
          >
            <Send className="w-4 h-4" />
            {createMutation.isPending ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Only{' '}
          {ALLOWED_DOMAINS.map((d, i) => (
            <span key={d}>
              <span className="text-slate-300">@{d}</span>
              {i < ALLOWED_DOMAINS.length - 1 && ' and '}
            </span>
          ))}{' '}
          emails can be invited.{' '}
          <span className="text-indigo-400">Creator</span>: can register and edit projects.{' '}
          <span className="text-indigo-400 ml-1">Auditor</span>: full access including invitations.
        </p>
      </form>

      {/* List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-white font-semibold">All Invitations</h2>
          <span className="text-xs text-slate-500">{invitations.length} total</span>
        </div>

        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : invitations.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No invitations yet. Send your first one above.
          </div>
        ) : (
          <ul className="divide-y divide-slate-800">
            {invitations.map((inv) => (
              <li key={inv._id} className="px-5 py-4 flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-medium truncate">{inv.email}</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Invited by {inv.invitedByName || inv.invitedBy?.name || 'Unknown'} · {format(new Date(inv.createdAt), 'MMM d, yyyy h:mm a')}
                    {inv.status === 'accepted' && inv.acceptedAt && (
                      <span className="text-emerald-400 ml-1">· Accepted {format(new Date(inv.acceptedAt), 'MMM d')}</span>
                    )}
                  </p>
                </div>
                <RoleBadge role={inv.role} />
                <StatusBadge status={inv.status} />
                <div className="flex items-center gap-1">
                  {inv.status === 'pending' && (
                    <>
                      <button
                        onClick={() => resendMutation.mutate(inv._id)}
                        disabled={resendMutation.isPending}
                        className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition"
                        title="Resend email"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Revoke invitation for ${inv.email}?`)) {
                            revokeMutation.mutate(inv._id);
                          }
                        }}
                        disabled={revokeMutation.isPending}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                        title="Revoke"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
