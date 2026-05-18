import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import ProjectForm from './pages/ProjectForm';
import Invitations from './pages/Invitations';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function AppToaster() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: isDark
          ? { background: '#1a2f44', color: '#e8f0f8', border: '1px solid #274158' }
          : { background: '#ffffff', color: '#0f1b2a', border: '1px solid #d7e1ec' },
      }}
    />
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Navigate to="/projects" replace />
                  </ProtectedRoute>
                }
              />

            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <Projects />
                </ProtectedRoute>
              }
            />

              <Route
                path="/projects/new"
                element={
                  <ProtectedRoute requiredRole="creator">
                    <ProjectForm />
                  </ProtectedRoute>
                }
              />

            <Route
              path="/projects/:id"
              element={
                <ProtectedRoute>
                  <ProjectDetail />
                </ProtectedRoute>
              }
            />

              <Route
                path="/projects/:id/edit"
                element={
                  <ProtectedRoute requiredRole="creator">
                    <ProjectForm />
                  </ProtectedRoute>
                }
              />

            <Route
              path="/invitations"
              element={
                <ProtectedRoute requiredRole="auditor">
                  <Invitations />
                </ProtectedRoute>
              }
            />

                <Route path="*" element={<Navigate to="/projects" replace />} />
              </Routes>
            </BrowserRouter>
            <AppToaster />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
