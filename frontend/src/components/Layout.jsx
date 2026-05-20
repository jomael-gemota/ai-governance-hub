import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  FolderKanban,
  LogOut,
  User,
  Mail,
  Sun,
  Moon,
  BookOpen,
  ClipboardList,
  Crown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';

const navItems = [
  { to: '/policy', label: 'AI Use Policy', icon: BookOpen, exact: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban, exact: true },
];

export default function Layout({ children }) {
  const { user, logout, isAuditor, isAdmin } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Signed out');
  };

  return (
    <div className="h-screen overflow-hidden flex bg-slate-950">
      {/* Sidebar */}
      <aside className="w-64 h-screen shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`p-1.5 rounded-lg ${
                resolvedTheme === 'light'
                  ? 'bg-indigo-600/20 border border-indigo-600/30'
                  : 'bg-indigo-600'
              }`}
            >
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight tracking-tight">AI Governance</p>
              <p className="text-xs text-slate-400 leading-tight font-medium">Hub</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}

          {isAuditor && (
            <>
              <NavLink
                to="/audit-queue"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`
                }
              >
                <ClipboardList className="w-4 h-4" />
                Audit Queue
              </NavLink>
              <NavLink
                to="/invitations"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`
                }
              >
                <Mail className="w-4 h-4" />
                Invitations
              </NavLink>
            </>
          )}
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-start gap-1.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            {resolvedTheme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
          </button>
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover border border-slate-700"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-600/30 flex items-center justify-center">
                <User className="w-4 h-4 text-indigo-400" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm text-white font-medium truncate">{user?.name}</p>
              {isAdmin ? (
                <p className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  Administrator
                </p>
              ) : (
                <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 h-screen overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
