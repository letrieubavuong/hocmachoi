import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';

interface TikZRendererProps {
  code: string;
  className?: string;
  onRenderSuccess?: () => void;
  onRenderError?: (error: string) => void;
}

export type TikZRenderStatus = 'idle' | 'loading' | 'success' | 'error';

declare global {
  interface Window {
    tikzjax?: {
      process?: (elements?: Element[] | HTMLCollection) => void;
    };
  }
}

const TIKZJAX_SCRIPT_URL = 'https://tikzjax.com/v1/tikzjax.js';
const TIKZJAX_STYLE_URL = 'https://tikzjax.com/v1/tikzjax.css';
const TIKZ_RENDER_TIMEOUT_MS = 8000;

// Singleton Promise Loader at module scope
let tikzJaxPromise: Promise<void> | null = null;

function ensureTikzJaxCss(): void {
  if (typeof document === 'undefined') return;
  if (!document.getElementById('tikzjax-css')) {
    const link = document.createElement('link');
    link.id = 'tikzjax-css';
    link.rel = 'stylesheet';
    link.href = TIKZJAX_STYLE_URL;
    document.head.appendChild(link);
  }
}

function loadTikzJax(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Browser environment required'));

  if (window.tikzjax && typeof window.tikzjax.process === 'function') {
    return Promise.resolve();
  }

  if (tikzJaxPromise) {
    return tikzJaxPromise;
  }

  ensureTikzJaxCss();

  tikzJaxPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById('tikzjax-js') as HTMLScriptElement | null;
    if (existingScript) {
      if (window.tikzjax && typeof window.tikzjax.process === 'function') {
        resolve();
        return;
      }
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener(
        'error',
        () => {
          tikzJaxPromise = null; // Reset to allow retry
          reject(new Error('Failed to load TikZJax script'));
        },
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.id = 'tikzjax-js';
    script.src = TIKZJAX_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      resolve();
    };
    script.onerror = () => {
      tikzJaxPromise = null; // Reset to allow retry
      reject(new Error('Failed to load TikZJax script'));
    };
    document.head.appendChild(script);
  });

  return tikzJaxPromise;
}

export const TikZRenderer: React.FC<TikZRendererProps> = React.memo(({
  code,
  className = '',
  onRenderSuccess,
  onRenderError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderIdRef = useRef<number>(0);
  const [status, setStatus] = useState<TikZRenderStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [retryNonce, setRetryNonce] = useState<number>(0);

  // Normalize TikZ code and wrap in \begin{tikzpicture} if missing
  const normalizedCode = useMemo(() => {
    if (!code || !code.trim()) return '';
    const trimmed = code.trim();
    const hasBegin = /\\begin\{tikzpicture\}/i.test(trimmed);
    const hasEnd = /\\end\{tikzpicture\}/i.test(trimmed);

    if (!hasBegin && !hasEnd) {
      return `\\begin{tikzpicture}\n${trimmed}\n\\end{tikzpicture}`;
    }
    return trimmed;
  }, [code]);

  useEffect(() => {
    let observer: MutationObserver | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    renderIdRef.current += 1;
    const currentRenderId = renderIdRef.current;

    if (!normalizedCode) {
      setStatus('error');
      setErrorMessage('Không có dữ liệu hình vẽ TikZ.');
      if (onRenderError) onRenderError('No TikZ data');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    loadTikzJax()
      .then(() => {
        if (cancelled || currentRenderId !== renderIdRef.current) return;
        if (!containerRef.current) return;

        // Clear existing children
        containerRef.current.replaceChildren();

        const scriptEl = document.createElement('script');
        scriptEl.type = 'text/tikz';
        scriptEl.text = normalizedCode;
        containerRef.current.appendChild(scriptEl);

        // Check if SVG was rendered synchronously
        if (containerRef.current.querySelector('svg')) {
          setStatus('success');
          if (onRenderSuccess) onRenderSuccess();
          return;
        }

        // MutationObserver to watch for SVG creation
        observer = new MutationObserver(() => {
          if (cancelled || currentRenderId !== renderIdRef.current) return;

          if (containerRef.current?.querySelector('svg')) {
            setStatus('success');
            if (onRenderSuccess) onRenderSuccess();
            if (observer) {
              observer.disconnect();
              observer = null;
            }
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
          }
        });

        observer.observe(containerRef.current, { childList: true, subtree: true });

        // Trigger TikZJax processing
        if (window.tikzjax && typeof window.tikzjax.process === 'function') {
          try {
            window.tikzjax.process(containerRef.current.children);
          } catch (e) {
            console.warn('[TikZRenderer] Process notice:', e);
          }
        }

        // Fallback Timeout: If 8s elapse with NO SVG, set error state (not success!)
        timeoutId = setTimeout(() => {
          if (cancelled || currentRenderId !== renderIdRef.current) return;

          if (!containerRef.current?.querySelector('svg')) {
            if (observer) {
              observer.disconnect();
              observer = null;
            }
            setStatus('error');
            setErrorMessage('Quá thời gian render hình vẽ TikZ (Timeout).');
            if (onRenderError) onRenderError('Render timeout');
          } else {
            setStatus('success');
            if (onRenderSuccess) onRenderSuccess();
          }
        }, TIKZ_RENDER_TIMEOUT_MS);
      })
      .catch((err) => {
        if (cancelled || currentRenderId !== renderIdRef.current) return;
        console.error('[TikZRenderer] Script load error:', err);
        setStatus('error');
        setErrorMessage('Không thể nạp trình vẽ TikZ (kiểm tra kết nối mạng).');
        if (onRenderError) onRenderError('Script load error');
      });

    return () => {
      cancelled = true;
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };
  }, [normalizedCode, retryNonce, onRenderSuccess, onRenderError]);

  const handleRetry = () => {
    setRetryNonce((prev) => prev + 1);
  };

  return (
    <div className={`my-4 flex flex-col items-center justify-center font-sans ${className}`}>
      <div className="relative p-3 sm:p-4 bg-slate-950/90 rounded-2xl border border-purple-500/30 shadow-xl overflow-x-auto max-w-full min-h-[90px] flex flex-col items-center justify-center">
        {status === 'loading' && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 text-purple-300 text-xs font-bold py-5 px-4 animate-pulse"
          >
            <Loader2 className="w-5 h-5 animate-spin text-purple-400 shrink-0" />
            <span>⚡ Đang tự động vẽ sơ đồ TikZ...</span>
          </div>
        )}

        {status === 'error' && (
          <div role="alert" className="flex flex-col items-center gap-2 text-rose-300 text-xs p-4 text-center">
            <div className="flex items-center gap-1.5 font-bold text-rose-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage || 'Không thể hiển thị sơ đồ TikZ.'}</span>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold rounded-lg text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 text-purple-400" /> Thử lại
            </button>
          </div>
        )}

        <div
          ref={containerRef}
          className={`tikz-container transition-opacity duration-300 ${
            status === 'success' ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
          }`}
          style={{
            maxWidth: '100%',
          }}
        />
      </div>

      {status === 'success' && (
        <span className="mt-1.5 text-[10px] font-semibold text-slate-400 flex items-center gap-1">
          ✨ Sơ đồ được render tự động từ TikZ
        </span>
      )}
    </div>
  );
});

TikZRenderer.displayName = 'TikZRenderer';
