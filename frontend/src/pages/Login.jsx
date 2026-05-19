import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { GoogleLogin } from '@react-oauth/google';
import { ShieldCheck, MailX, ShieldAlert } from 'lucide-react';

const ALLOWED_DOMAINS = ['outdoorequipped.com', 'channelprecision.com'];

export default function Login() {
  const { loginWithGoogle } = useAuth();
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const isDark = resolvedTheme === 'dark';

  const handleGoogleSuccess = async (response) => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle(response.credential);
      navigate('/projects');
    } catch (err) {
      const data = err.response?.data;
      setError({
        code: data?.code || 'GENERIC',
        message: data?.message || 'Google sign-in failed. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError({ code: 'GENERIC', message: 'Google sign-in was cancelled or failed.' });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: isDark ? '#0d1117' : '#f8fafc' }}
    >
      {/* Ambient background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full opacity-40"
          style={{
            background: isDark
              ? 'radial-gradient(ellipse, #4f46e540 0%, transparent 70%)'
              : 'radial-gradient(ellipse, #e0e7ff 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="absolute bottom-[-5%] right-[10%] w-[400px] h-[400px] rounded-full opacity-30"
          style={{
            background: isDark
              ? 'radial-gradient(ellipse, #7c3aed30 0%, transparent 70%)'
              : 'radial-gradient(ellipse, #dbeafe 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              boxShadow: isDark
                ? '0 8px 32px rgba(79, 70, 229, 0.45)'
                : '0 8px 24px rgba(79, 70, 229, 0.3)',
            }}
          >
            <ShieldCheck className="w-8 h-8 text-white" strokeWidth={2} />
          </div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}
          >
            AI Governance Hub
          </h1>
          <p
            className="mt-1.5 text-sm"
            style={{ color: isDark ? '#64748b' : '#94a3b8' }}
          >
            Internal AI project tracking platform
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
            boxShadow: isDark
              ? '0 4px 32px rgba(0,0,0,0.4)'
              : '0 4px 24px rgba(0,0,0,0.06)',
            backdropFilter: isDark ? 'blur(12px)' : 'none',
          }}
        >
          <div className="space-y-6">
            {/* Header text */}
            <div className="text-center space-y-1">
              <p
                className="text-sm font-semibold"
                style={{ color: isDark ? '#e2e8f0' : '#334155' }}
              >
                Sign in with your work account
              </p>
              <p className="text-xs" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
                Access restricted to invited{' '}
                {ALLOWED_DOMAINS.map((d, i) => (
                  <span key={d}>
                    <span style={{ color: isDark ? '#818cf8' : '#4f46e5' }} className="font-medium">
                      @{d}
                    </span>
                    {i < ALLOWED_DOMAINS.length - 1 && ' & '}
                  </span>
                ))}{' '}
                accounts
              </p>
            </div>

            {/* Divider */}
            <div
              className="flex items-center gap-3"
              style={{ color: isDark ? '#334155' : '#cbd5e1' }}
            >
              <div className="flex-1 h-px" style={{ background: 'currentColor' }} />
              <span className="text-xs font-medium" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
                Continue with
              </span>
              <div className="flex-1 h-px" style={{ background: 'currentColor' }} />
            </div>

            {/* Google Button */}
            <div className={`flex justify-center transition-opacity ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme={isDark ? 'filled_black' : 'outline'}
                shape="pill"
                size="large"
                width="288"
                text="signin_with"
                logo_alignment="left"
              />
            </div>

            {loading && (
              <p className="text-center text-xs" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                Verifying your account…
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div
              className="mt-6 rounded-xl p-4 flex gap-3"
              style={{
                background:
                  error.code === 'NOT_INVITED'
                    ? isDark ? 'rgba(245,158,11,0.08)' : '#fffbeb'
                    : isDark ? 'rgba(239,68,68,0.08)' : '#fef2f2',
                border:
                  error.code === 'NOT_INVITED'
                    ? isDark ? '1px solid rgba(245,158,11,0.2)' : '1px solid #fde68a'
                    : isDark ? '1px solid rgba(239,68,68,0.2)' : '1px solid #fecaca',
              }}
            >
              <div className="shrink-0 mt-0.5">
                {error.code === 'NOT_INVITED' ? (
                  <MailX className="w-4 h-4 text-amber-500" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                )}
              </div>
              <div className="min-w-0">
                <p
                  className="text-xs font-semibold"
                  style={{
                    color: error.code === 'NOT_INVITED'
                      ? isDark ? '#fbbf24' : '#92400e'
                      : isDark ? '#f87171' : '#991b1b',
                  }}
                >
                  {error.code === 'NOT_INVITED'
                    ? 'Invitation required'
                    : error.code === 'DOMAIN_NOT_ALLOWED'
                    ? 'Access denied'
                    : 'Sign-in failed'}
                </p>
                <p
                  className="text-xs mt-0.5 leading-relaxed"
                  style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                >
                  {error.message}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p
          className="text-center text-xs mt-6"
          style={{ color: isDark ? '#334155' : '#94a3b8' }}
        >
          Need access?{' '}
          <span style={{ color: isDark ? '#475569' : '#64748b' }}>
            Ask an auditor on your team to send you an invitation.
          </span>
        </p>
      </div>
    </div>
  );
}
