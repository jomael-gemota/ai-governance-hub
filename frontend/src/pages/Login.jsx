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

  const handleGoogleSuccess = async (response) => {
    setError(null);
    try {
      await loginWithGoogle(response.credential);
      navigate('/projects');
    } catch (err) {
      const data = err.response?.data;
      setError({
        code: data?.code || 'GENERIC',
        message: data?.message || 'Google sign-in failed. Please try again.',
      });
    }
  };

  const handleGoogleError = () => {
    setError({ code: 'GENERIC', message: 'Google sign-in was cancelled or failed.' });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-600 p-3 rounded-2xl mb-4 shadow-lg shadow-indigo-600/30">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">AI Governance Hub</h1>
          <p className="text-slate-400 mt-1 text-sm">Sign in with your work Google account</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-5">
          <div>
            <p className="text-xs text-slate-500 text-center mb-4">
              Restricted to invited{' '}
              {ALLOWED_DOMAINS.map((d, i) => (
                <span key={d}>
                  <span className="text-slate-300">@{d}</span>
                  {i < ALLOWED_DOMAINS.length - 1 && ' and '}
                </span>
              ))}{' '}
              accounts
            </p>
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme={resolvedTheme === 'dark' ? 'filled_black' : 'outline'}
                shape="rectangular"
                size="large"
                width="368"
                text="signin_with"
                logo_alignment="left"
              />
            </div>
          </div>

          {error && (
            <div
              className={`rounded-lg border p-4 flex gap-3 ${
                error.code === 'NOT_INVITED'
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {error.code === 'NOT_INVITED' ? (
                  <MailX className="w-5 h-5 text-amber-400" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                )}
              </div>
              <div className="min-w-0">
                <p
                  className={`text-sm font-medium ${
                    error.code === 'NOT_INVITED' ? 'text-amber-300' : 'text-red-300'
                  }`}
                >
                  {error.code === 'NOT_INVITED'
                    ? 'Invitation required'
                    : error.code === 'DOMAIN_NOT_ALLOWED'
                    ? 'Access denied'
                    : 'Sign-in failed'}
                </p>
                <p className="text-sm text-slate-300 mt-1 leading-relaxed">{error.message}</p>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Need access? Ask an auditor on your team to send you an invitation.
        </p>
      </div>
    </div>
  );
}
