import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail, Send, Trash2, RefreshCw, AlertCircle,
  UserPlus, ShieldCheck, Crown, Users, User, XCircle, Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const ALLOWED_DOMAINS = ['outdoorequipped.com', 'channelprecision.com'];

const ROLE_META = {
  admin:   { cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',      icon: Crown,       label: 'Administrator' },
  auditor: { cls: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',   icon: ShieldCheck, label: 'Auditor' },
  creator: { cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: UserPlus,   label: 'Creator' },
};

function RoleBadge({ role }) {
  const meta = ROLE_META[role] || { cls: 'bg-slate-700/60 text-slate-300 border-slate-600', icon: UserPlus, label: role };
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium ${meta.cls}`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

function ConfirmModal({ open, icon: Icon = XCircle, iconCls = 'bg-red-500/15 text-red-400', title, description, confirmLabel, confirmCls = 'bg-red-600 hover:bg-red-500', onCancel, onConfirm, loading }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-[2px] px-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${iconCls}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-white">{title}</h4>
            <p className="text-sm text-slate-400 mt-1">{description}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm disabled:opacity-60 text-white rounded-lg transition ${confirmCls}`}
          >
            {loading ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Invitations() {
  const qc = useQueryClient();
  const { user: currentUser, isAdmin, isAuditor } = useAuth();
  const [form, setForm] = useState({ email: '', role: 'creator' });
  const [confirmRemoveUser, setConfirmRemoveUser] = useState(null);
  const [confirmRevokeInvite, setConfirmRevokeInvite] = useState(null);

  // ── Data fetching ─────────────────────────────────────────────────────────────

  const { data: invData, isLoading: invLoading } = useQuery({
    queryKey: ['invitations'],
    queryFn: () => api.get('/invitations').then((r) => r.data),
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
    enabled: isAuditor,
  });

  const allInvitations = invData?.invitations || [];
  const smtpConfigured = invData?.smtpConfigured;

  // ── Merge users + invitations into one list ───────────────────────────────────
  //
  // Each entry is either:
  //   { kind: 'user',    user, invitation }   — registered account (+ their invite record if found)
  //   { kind: 'pending', invitation }          — invite not yet accepted (no account yet)

  const mergedEntries = useMemo(() => {
    const invByEmail = {};
    for (const inv of allInvitations) {
      invByEmail[inv.email.toLowerCase()] = inv;
    }

    const entries = [];
    const registeredEmails = new Set();

    // 1. Registered users first
    for (const u of users) {
      const email = u.email.toLowerCase();
      registeredEmails.add(email);
      entries.push({
        kind: 'user',
        key: u._id,
        user: u,
        invitation: invByEmail[email] || null,
      });
    }

    // 2. Pending invitations with no account yet
    for (const inv of allInvitations) {
      if (inv.status === 'pending' && !registeredEmails.has(inv.email.toLowerCase())) {
        entries.push({
          kind: 'pending',
          key: `inv-${inv._id}`,
          invitation: inv,
        });
      }
    }

    return entries;
  }, [users, allInvitations]);

  const memberCount  = mergedEntries.filter((e) => e.kind === 'user').length;
  const pendingCount = mergedEntries.filter((e) => e.kind === 'pending').length;

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/invitations', payload).then((r) => r.data),
    onSuccess: (invite) => {
      qc.invalidateQueries(['invitations']);
      qc.invalidateQueries(['users']);
      setForm({ email: '', role: 'creator' });
      toast.success(
        invite.emailSent
          ? 'Invitation sent!'
          : 'Invitation created. Email delivery is disabled — share the sign-in link manually.',
        { duration: invite.emailSent ? 4000 : 6000 }
      );
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
    onSuccess: () => { qc.invalidateQueries(['invitations']); toast.success('Invitation revoked'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to revoke'),
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ id, role }) => api.patch(`/users/${id}/role`, { role }).then((r) => r.data),
    onSuccess: (updated) => {
      qc.invalidateQueries(['users']);
      toast.success(`Role updated to ${ROLE_META[updated.role]?.label || updated.role}`);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to change role'),
  });

  const removeUserMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(['users']);
      qc.invalidateQueries(['invitations']);
      toast.success('User removed');
      setConfirmRemoveUser(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to remove user'),
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

  const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm';
  const isListLoading = invLoading || usersLoading;

  // ── Render ────────────────────────────────────────────────────────────────────

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
              Invitations will still be created in the system, but no email will be sent. Configure SMTP
              variables in <code className="bg-slate-800 px-1 py-0.5 rounded">backend/.env</code> to enable
              email delivery.
            </p>
          </div>
        </div>
      )}

      {/* ── Send invitation form ─────────────────────────────────────────────── */}
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
            <option value="admin">Administrator</option>
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
          <span className="text-indigo-400 ml-1">Auditor</span>: can review and verdict projects.{' '}
          <span className="text-amber-400 ml-1">Administrator</span>: full access to everything.
        </p>
      </form>

      {/* ── Unified Access Management list ──────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            Access Management
          </h2>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {memberCount > 0 && (
              <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
            )}
            {pendingCount > 0 && (
              <span className="text-amber-400/80">{pendingCount} pending invite{pendingCount !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>

        {isListLoading ? (
          <div className="p-10 flex justify-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : mergedEntries.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">
            No members or invitations yet.
          </div>
        ) : (
          <ul className="divide-y divide-slate-800">
            {mergedEntries.map((entry) => {
              if (entry.kind === 'user') {
                const u = entry.user;
                const inv = entry.invitation;
                const isSelf = u._id === currentUser?._id;

                // Build the invitation subtitle line
                let inviteLine = null;
                if (inv) {
                  const invitedByName = inv.invitedByName || inv.invitedBy?.name || 'Unknown';
                  const invitedDate   = format(new Date(inv.createdAt), 'MMM d, yyyy');
                  const joinedDate    = inv.acceptedAt ? format(new Date(inv.acceptedAt), 'MMM d, yyyy') : null;
                  inviteLine = (
                    <span>
                      Invited by <span className="text-slate-400">{invitedByName}</span> on {invitedDate}
                      {joinedDate && (
                        <span className="text-emerald-500 ml-1">· Joined {joinedDate}</span>
                      )}
                    </span>
                  );
                } else {
                  inviteLine = (
                    <span>Member since {format(new Date(u.createdAt), 'MMM d, yyyy')}</span>
                  );
                }

                return (
                  <li key={entry.key} className="px-5 py-4 flex items-center gap-3">
                    {/* Avatar */}
                    <div className="shrink-0">
                      {u.picture ? (
                        <img
                          src={u.picture}
                          alt={u.name}
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-full border border-slate-700 object-cover"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                          <User className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                    </div>

                    {/* Name + email + invitation details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-white text-sm font-medium truncate">{u.name}</p>
                        {isSelf && (
                          <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-1.5 py-0.5 rounded shrink-0">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs truncate">
                        {u.email}
                        {u.lastLoginAt && (
                          <span className="ml-2 text-slate-600">
                            · Last login {format(new Date(u.lastLoginAt), 'MMM d, yyyy')}
                          </span>
                        )}
                      </p>
                      <p className="text-slate-600 text-[11px] mt-0.5">{inviteLine}</p>
                    </div>

                    {/* Role: dropdown for admin (others), static badge for self or non-admin */}
                    {isAdmin && !isSelf ? (
                      <select
                        value={u.role}
                        disabled={changeRoleMutation.isPending}
                        onChange={(e) => changeRoleMutation.mutate({ id: u._id, role: e.target.value })}
                        className={`shrink-0 bg-slate-800 border rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:opacity-60 cursor-pointer ${
                          ROLE_META[u.role]?.cls || 'border-slate-700 text-slate-300'
                        }`}
                      >
                        <option value="creator">Creator</option>
                        <option value="auditor">Auditor</option>
                        <option value="admin">Administrator</option>
                      </select>
                    ) : (
                      <RoleBadge role={u.role} />
                    )}

                    {/* Remove button (admin, not self) */}
                    {isAdmin && !isSelf && (
                      <button
                        onClick={() => setConfirmRemoveUser(u)}
                        className="shrink-0 p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                        title="Remove user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </li>
                );
              }

              // ── Pending invitation row ──────────────────────────────────────
              const inv = entry.invitation;
              const invitedByName = inv.invitedByName || inv.invitedBy?.name || 'Unknown';
              const invitedDate   = format(new Date(inv.createdAt), 'MMM d, yyyy');

              return (
                <li key={entry.key} className="px-5 py-4 flex items-center gap-3 bg-slate-900/50">
                  {/* Envelope avatar */}
                  <div className="shrink-0 w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-amber-400" />
                  </div>

                  {/* Email + invite metadata */}
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-300 text-sm font-medium truncate">{inv.email}</p>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      Invited by <span className="text-slate-500">{invitedByName}</span> on {invitedDate}
                      <span className="ml-2 text-amber-500/70">· Awaiting sign-in</span>
                    </p>
                  </div>

                  {/* Role badge */}
                  <RoleBadge role={inv.role} />

                  {/* Pending badge */}
                  <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-medium">
                    <Clock className="w-3 h-3" />
                    Pending
                  </span>

                  {/* Resend + Revoke (auditors and admins) */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => resendMutation.mutate(inv._id)}
                      disabled={resendMutation.isPending}
                      className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition"
                      title="Resend invitation email"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmRevokeInvite(inv)}
                      disabled={revokeMutation.isPending}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      title="Revoke invitation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Remove registered user */}
      <ConfirmModal
        open={Boolean(confirmRemoveUser)}
        title="Remove this user?"
        description={
          confirmRemoveUser
            ? <><span className="text-white font-medium">{confirmRemoveUser.name}</span>{' '}({confirmRemoveUser.email}) will lose access immediately. This cannot be undone.</>
            : null
        }
        confirmLabel="Remove User"
        loading={removeUserMutation.isPending}
        onCancel={() => setConfirmRemoveUser(null)}
        onConfirm={() => removeUserMutation.mutate(confirmRemoveUser._id)}
      />

      {/* Revoke pending invitation */}
      <ConfirmModal
        open={Boolean(confirmRevokeInvite)}
        title="Revoke this invitation?"
        description={
          confirmRevokeInvite
            ? <>The invitation for <span className="text-white font-medium">{confirmRevokeInvite.email}</span> will be cancelled. They will no longer be able to sign in with this invite.</>
            : null
        }
        confirmLabel="Revoke Invitation"
        loading={revokeMutation.isPending}
        onCancel={() => setConfirmRevokeInvite(null)}
        onConfirm={() => {
          revokeMutation.mutate(confirmRevokeInvite._id);
          setConfirmRevokeInvite(null);
        }}
      />
    </div>
  );
}
