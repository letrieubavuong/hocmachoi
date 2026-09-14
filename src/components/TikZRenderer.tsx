import React, { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';

interface TikZRendererProps {
  code: string;
  className?: string;
}

declare global {
  interface Window {
    tikzjax?: {
      process?: (elements?: Element[] | HTMLCollection) => void;
    };
    __tikzjaxLoading?: boolean;
    __tikzjaxLoaded?: boolean;
  }
}

export const TikZRenderer: React.FC<TikZRendererProps> = ({ code, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  // Clean code to ensure proper tikzpicture environment
  let cleanCode = code.trim();
  if (!cleanCode.includes('\\begin{tikzpicture}')) {
    cleanCode = `\\begin{tikzpicture}\n${cleanCode}\n\\end{tikzpicture}`;
  }

  useEffect(() => {
    // 1. Load CSS
    if (!document.getElementById('tikzjax-css')) {
      const link = document.createElement('link');
      link.id = 'tikzjax-css';
      link.rel = 'stylesheet';
      link.href = 'https://tikzjax.com/v1/tikzjax.css';
      document.head.appendChild(link);
    }

    // 2. Load JS
    const loadTikzJaxScript = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (window.__tikzjaxLoaded) {
          resolve();
          return;
        }

        const existingScript = document.getElementById('tikzjax-js');
        if (existingScript) {
          existingScript.addEventListener('load', () => resolve());
          existingScript.addEventListener('error', () => reject());
          return;
        }

        const script = document.createElement('script');
        script.id = 'tikzjax-js';
        script.src = 'https://tikzjax.com/v1/tikzjax.js';
        script.async = true;
        script.onload = () => {
          window.__tikzjaxLoaded = true;
          resolve();
        };
        script.onerror = () => reject();
        document.head.appendChild(script);
      });
    };

    let isMounted = true;

    loadTikzJaxScript()
      .then(() => {
        if (!isMounted) return;

        // Process script block in container
        if (containerRef.current) {
          const scriptEl = document.createElement('script');
          scriptEl.type = 'text/tikz';
          scriptEl.text = cleanCode;

          containerRef.current.innerHTML = '';
          containerRef.current.appendChild(scriptEl);

          // Listen for SVG generation
          const observer = new MutationObserver(() => {
            if (containerRef.current?.querySelector('svg')) {
              setIsLoaded(true);
              observer.disconnect();
            }
          });

          observer.observe(containerRef.current, { childList: true, subtree: true });

          // If tikzjax process function is available
          if (window.tikzjax && typeof window.tikzjax.process === 'function') {
            try {
              window.tikzjax.process(containerRef.current.children);
            } catch (e) {
              console.warn('TikZJax process notice:', e);
            }
          }

          // Fallback timeout if rendering takes too long or fails
          const timeout = setTimeout(() => {
            if (!containerRef.current?.querySelector('svg')) {
              if (isMounted) setIsLoaded(true);
            }
          }, 8000);

          return () => {
            observer.disconnect();
            clearTimeout(timeout);
          };
        }
      })
      .catch((err) => {
        console.error('Failed to load TikZJax:', err);
        if (isMounted) setIsError(true);
      });

    return () => {
      isMounted = false;
    };
  }, [cleanCode]);

  return (
    <div className={`my-4 flex flex-col items-center justify-center ${className}`}>
      <div className="relative p-4 bg-slate-950/90 rounded-2xl border border-purple-500/30 shadow-xl overflow-x-auto max-w-full min-h-[100px] flex items-center justify-center">
        {!isLoaded && !isError && (
          <div className="flex items-center gap-2 text-purple-300 text-xs font-bold py-6 px-4 animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
            <span>⚡ Đang tự động vẽ sơ đồ TikZ...</span>
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2 text-amber-400 text-xs p-3">
            <ImageIcon className="w-4 h-4" />
            <span>Không thể nạp trình vẽ TikZ (kiểm tra kết nối mạng)</span>
          </div>
        )}

        <div
          ref={containerRef}
          className={`tikz-container transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
          }`}
        />
      </div>

      <span className="mt-1 text-[10px] font-semibold text-slate-400 flex items-center gap-1">
        ✨ Sơ đồ được render tự động từ TikZ
      </span>
    </div>
  );
};
