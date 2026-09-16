import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { TikZRenderer } from './TikZRenderer';

interface MathRendererProps {
  text: string;
  className?: string;
}

export interface MathPart {
  type: 'text' | 'inline' | 'block' | 'tikz';
  content: string;
}

const KATEX_OPTIONS: katex.KatexOptions = {
  throwOnError: false,
  errorColor: '#f59e0b',
  output: 'htmlAndMathml',
  strict: false,
};

/**
 * Helper to render KaTeX string safely with fallback error handling.
 */
function renderKatex(content: string, displayMode: boolean): string | null {
  try {
    return katex.renderToString(content, {
      ...KATEX_OPTIONS,
      displayMode,
    });
  } catch (err) {
    if (import.meta.env?.DEV) {
      console.warn('[MathRenderer] KaTeX rendering error:', err, 'for content:', content);
    }
    return null;
  }
}

/**
 * Robust token scanner parser for LaTeX and TikZ segments.
 * Handles escaped dollars (\$), unclosed delimiters, multiline formulas, and Unicode text safely.
 */
export function parseMathParts(text: string): MathPart[] {
  if (!text) return [];

  const parts: MathPart[] = [];
  let currentText = '';
  let i = 0;
  const n = text.length;

  const pushCurrentText = () => {
    if (currentText) {
      parts.push({ type: 'text', content: currentText });
      currentText = '';
    }
  };

  while (i < n) {
    // 1. Escaped dollar sign: \$ -> render as literal $
    if (text[i] === '\\' && i + 1 < n && text[i + 1] === '$') {
      currentText += '$';
      i += 2;
      continue;
    }

    // 2. TikZ diagram: \begin{tikzpicture}...\end{tikzpicture}
    if (text.startsWith('\\begin{tikzpicture}', i)) {
      const endMarker = '\\end{tikzpicture}';
      const endIdx = text.indexOf(endMarker, i + 19);
      if (endIdx !== -1) {
        pushCurrentText();
        const tikzCode = text.substring(i, endIdx + endMarker.length);
        parts.push({ type: 'tikz', content: tikzCode });
        i = endIdx + endMarker.length;
        continue;
      }
    }

    // 3. Block Math: $$...$$
    if (text.startsWith('$$', i)) {
      let endIdx = -1;
      let j = i + 2;
      while (j < n) {
        if (text[j] === '\\' && j + 1 < n && text[j + 1] === '$') {
          j += 2;
          continue;
        }
        if (text.startsWith('$$', j)) {
          endIdx = j;
          break;
        }
        j++;
      }
      if (endIdx !== -1) {
        pushCurrentText();
        const rawContent = text.substring(i + 2, endIdx);
        const content = rawContent.replace(/\\\$/g, '$');
        parts.push({ type: 'block', content });
        i = endIdx + 2;
        continue;
      }
    }

    // 4. Block Math: \[...\]
    if (text.startsWith('\\[', i)) {
      const endIdx = text.indexOf('\\]', i + 2);
      if (endIdx !== -1) {
        pushCurrentText();
        const rawContent = text.substring(i + 2, endIdx);
        const content = rawContent.replace(/\\\$/g, '$');
        parts.push({ type: 'block', content });
        i = endIdx + 2;
        continue;
      }
    }

    // 5. Inline Math: \(...\)
    if (text.startsWith('\\(', i)) {
      const endIdx = text.indexOf('\\)', i + 2);
      if (endIdx !== -1) {
        pushCurrentText();
        const rawContent = text.substring(i + 2, endIdx);
        const content = rawContent.replace(/\\\$/g, '$');
        parts.push({ type: 'inline', content });
        i = endIdx + 2;
        continue;
      }
    }

    // 6. Inline Math: $...$
    if (text[i] === '$') {
      let endIdx = -1;
      let j = i + 1;
      while (j < n) {
        if (text[j] === '\\' && j + 1 < n && text[j + 1] === '$') {
          j += 2;
          continue;
        }
        if (text[j] === '$') {
          endIdx = j;
          break;
        }
        j++;
      }

      if (endIdx !== -1) {
        pushCurrentText();
        const rawContent = text.substring(i + 1, endIdx);
        const content = rawContent.replace(/\\\$/g, '$');
        parts.push({ type: 'inline', content });
        i = endIdx + 1;
        continue;
      } else {
        // Unclosed dollar sign -> treat $ as literal text
        currentText += '$';
        i++;
        continue;
      }
    }

    currentText += text[i];
    i++;
  }

  pushCurrentText();
  return parts;
}

export const MathRenderer: React.FC<MathRendererProps> = React.memo(({ text, className = '' }) => {
  if (!text) return null;

  const parts = useMemo(() => parseMathParts(text), [text]);

  const hasBlockOrTikz = useMemo(
    () => parts.some((p) => p.type === 'block' || p.type === 'tikz'),
    [parts]
  );

  const ContainerTag = hasBlockOrTikz ? 'div' : 'span';

  return (
    <ContainerTag className={`math-renderer ${hasBlockOrTikz ? 'block' : 'inline-wrap'} ${className}`}>
      {parts.map((part, index) => {
        const key = `${part.type}-${index}-${part.content.substring(0, 12)}`;

        if (part.type === 'text') {
          return <span key={key}>{part.content}</span>;
        }

        if (part.type === 'tikz') {
          return (
            <div key={key} className="math-tikz my-2 max-w-full overflow-x-auto flex justify-center">
              <TikZRenderer code={part.content} />
            </div>
          );
        }

        const isBlock = part.type === 'block';
        const html = renderKatex(part.content, isBlock);

        if (html === null) {
          return isBlock ? (
            <div
              key={key}
              className="math-render-error my-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-amber-300 text-xs font-mono overflow-x-auto"
            >
              {part.content}
            </div>
          ) : (
            <code
              key={key}
              className="math-render-error text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20 text-xs font-mono"
            >
              {part.content}
            </code>
          );
        }

        return isBlock ? (
          <div
            key={key}
            className="math-block my-2 overflow-x-auto max-w-full text-center"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <span
            key={key}
            className="math-inline inline-block max-w-full overflow-x-auto align-middle mx-0.5"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </ContainerTag>
  );
});

MathRenderer.displayName = 'MathRenderer';
