import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  FileText, Upload, Trash2, ChevronLeft, ChevronRight,
  AlertCircle, Loader2, BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function Policy() {
  const { isAuditor } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const queryClient = useQueryClient();

  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [pdfWidth, setPdfWidth] = useState(750);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setPdfWidth(Math.min(containerRef.current.clientWidth - 48, 900));
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['policy'],
    queryFn: async () => {
      const res = await axios.get('/api/policy', { headers: authHeader() });
      return res.data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('policy', file);
      const res = await axios.post('/api/policy', formData, {
        headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy'] });
      setPageNumber(1);
      setPageInput('1');
      setNumPages(null);
      toast.success('Policy document uploaded.');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Upload failed.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => axios.delete('/api/policy', { headers: authHeader() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy'] });
      setNumPages(null);
      setPageNumber(1);
      toast.success('Policy document removed.');
    },
    onError: () => toast.error('Failed to remove document.'),
  });

  const policy = data?.policy;

  const onDocumentLoadSuccess = ({ numPages: n }) => {
    setNumPages(n);
    setPageNumber(1);
    setPageInput('1');
    if (containerRef.current) {
      setPdfWidth(Math.min(containerRef.current.clientWidth - 48, 900));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = '';
  };

  const goToPrev = () => {
    const p = Math.max(1, pageNumber - 1);
    setPageNumber(p);
    setPageInput(String(p));
  };

  const goToNext = () => {
    const p = Math.min(numPages, pageNumber + 1);
    setPageNumber(p);
    setPageInput(String(p));
  };

  const handlePageBlur = () => {
    const p = parseInt(pageInput, 10);
    if (p >= 1 && p <= numPages) {
      setPageNumber(p);
    } else {
      setPageInput(String(pageNumber));
    }
  };

  // Colours
  const cardStyle = {
    background: isDark ? '#0f172a' : '#ffffff',
    border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
  };
  const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
  const textMuted = isDark ? '#64748b' : '#94a3b8';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">

        {/* ── Page header ── */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl shrink-0" style={{ background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(79,70,229,0.25)' }}>
            <BookOpen className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight" style={{ color: textPrimary }}>
              AI Use Standards & Approval Policy
            </h1>
            <p className="text-sm mt-0.5" style={{ color: textMuted }}>
              Official guidelines for AI project development and approval within the organization.
            </p>
          </div>
        </div>

        {/* ── Auditor upload card ── */}
        {isAuditor && (
          <div className="rounded-xl p-5 flex flex-wrap items-center justify-between gap-4" style={cardStyle}>
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 shrink-0" style={{ color: textMuted }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: textPrimary }}>
                  {policy ? policy.originalName : 'No document uploaded'}
                </p>
                {policy && (
                  <p className="text-xs mt-0.5" style={{ color: textMuted }}>
                    Uploaded {format(new Date(policy.uploadedAt), 'MMM d, yyyy')} by {policy.uploadedBy?.name || 'Unknown'}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {policy && (
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 cursor-pointer"
                  style={{ color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </button>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition disabled:opacity-50 cursor-pointer"
                style={{ background: uploadMutation.isPending ? '#4338ca' : '#4f46e5' }}
                onMouseEnter={e => { if (!uploadMutation.isPending) e.currentTarget.style.background = '#4338ca'; }}
                onMouseLeave={e => { if (!uploadMutation.isPending) e.currentTarget.style.background = '#4f46e5'; }}
              >
                {uploadMutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Upload className="w-4 h-4" />
                }
                {policy ? 'Replace Document' : 'Upload Document'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
        )}

        {/* ── Creator doc info banner ── */}
        {!isAuditor && policy && (
          <div className="rounded-xl p-4 flex items-center gap-3" style={cardStyle}>
            <FileText className="w-5 h-5 shrink-0 text-indigo-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate" style={{ color: textPrimary }}>{policy.originalName}</p>
              <p className="text-xs mt-0.5" style={{ color: textMuted }}>
                Last updated {format(new Date(policy.uploadedAt), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
        )}

        {/* ── PDF viewer / states ── */}
        {isLoading ? (
          <div className="rounded-xl p-20 flex flex-col items-center gap-3" style={cardStyle}>
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-sm" style={{ color: textMuted }}>Loading document…</p>
          </div>
        ) : isError ? (
          <div className="rounded-xl p-16 flex flex-col items-center gap-3" style={cardStyle}>
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-sm text-red-400">Failed to load document information.</p>
          </div>
        ) : !policy ? (
          <div className="rounded-xl p-20 flex flex-col items-center gap-4" style={cardStyle}>
            <div className="p-5 rounded-2xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9' }}>
              <FileText className="w-10 h-10" style={{ color: textMuted }} />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold" style={{ color: textPrimary }}>No policy document yet</p>
              <p className="text-sm mt-1 max-w-sm" style={{ color: textMuted }}>
                {isAuditor
                  ? 'Use the button above to upload the AI Use Standards & Approval Policy PDF.'
                  : 'The policy document has not been published yet. Please check back later.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={cardStyle}>
            {/* PDF canvas area */}
            <div
              ref={containerRef}
              className="flex justify-center py-6 px-4"
              style={{ background: isDark ? '#060d1a' : '#e8edf5' }}
            >
              <Document
                file={`/uploads/policy/${policy.filename}`}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex flex-col items-center gap-3 py-20">
                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                    <p className="text-sm" style={{ color: textMuted }}>Rendering PDF…</p>
                  </div>
                }
                error={
                  <div className="flex flex-col items-center gap-3 py-20">
                    <AlertCircle className="w-7 h-7 text-red-400" />
                    <p className="text-sm text-red-400">Could not render the PDF. Try re-uploading.</p>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  width={pdfWidth}
                  renderAnnotationLayer
                  renderTextLayer
                  className="shadow-2xl"
                />
              </Document>
            </div>

            {/* Pagination bar */}
            {numPages && (
              <div
                className="flex items-center justify-between px-6 py-3 border-t"
                style={{
                  borderColor: isDark ? '#1e293b' : '#e2e8f0',
                  background: isDark ? '#0a1628' : '#f8fafc',
                }}
              >
                {/* Prev */}
                <button
                  onClick={goToPrev}
                  disabled={pageNumber <= 1}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  style={{ color: textMuted }}
                  onMouseEnter={e => { if (pageNumber > 1) e.currentTarget.style.background = isDark ? '#1e293b' : '#e2e8f0'; }}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                {/* Page counter */}
                <div className="flex items-center gap-2 text-sm" style={{ color: textMuted }}>
                  <span>Page</span>
                  <input
                    type="number"
                    min={1}
                    max={numPages}
                    value={pageInput}
                    onChange={e => setPageInput(e.target.value)}
                    onBlur={handlePageBlur}
                    onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                    className="w-12 text-center rounded-lg border px-1 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                    style={{
                      background: isDark ? '#1e293b' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#cbd5e1',
                      color: textPrimary,
                    }}
                  />
                  <span>of {numPages}</span>
                </div>

                {/* Next */}
                <button
                  onClick={goToNext}
                  disabled={pageNumber >= numPages}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  style={{ color: textMuted }}
                  onMouseEnter={e => { if (pageNumber < numPages) e.currentTarget.style.background = isDark ? '#1e293b' : '#e2e8f0'; }}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
    </div>
  );
}
