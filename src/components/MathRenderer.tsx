import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  text: string;
  className?: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ text, className = '' }) => {
  if (!text) return null;

  const parts = parseMathParts(text);

  return (
    <span className={`inline-wrap ${className}`}>
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return <span key={index}>{part.content}</span>;
        }

        try {
          const html = katex.renderToString(part.content, {
            displayMode: part.type === 'block',
            throwOnError: false,
          });

          return (
            <span
              key={index}
              dangerouslySetInnerHTML={{ __html: html }}
              className="inline-block mx-0.5 align-middle"
            />
          );
        } catch (e) {
          return <code key={index} className="text-yellow-400">{part.content}</code>;
        }
      })}
    </span>
  );
};

interface MathPart {
  type: 'text' | 'inline' | 'block';
  content: string;
}

function parseMathParts(text: string): MathPart[] {
  const parts: MathPart[] = [];
  const mathRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[\s\S]*?\$|\\\([\s\S]*?\\\))/g;
  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = mathRegex.exec(text)) !== null) {
    const matchStart = match.index;
    if (matchStart > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, matchStart),
      });
    }

    const rawMatch = match[0];
    if (rawMatch.startsWith('$$') && rawMatch.endsWith('$$')) {
      parts.push({ type: 'block', content: rawMatch.slice(2, -2) });
    } else if (rawMatch.startsWith('\\[') && rawMatch.endsWith('\\]')) {
      parts.push({ type: 'block', content: rawMatch.slice(2, -2) });
    } else if (rawMatch.startsWith('$') && rawMatch.endsWith('$')) {
      parts.push({ type: 'inline', content: rawMatch.slice(1, -1) });
    } else if (rawMatch.startsWith('\\(') && rawMatch.endsWith('\\)')) {
      parts.push({ type: 'inline', content: rawMatch.slice(2, -2) });
    }

    lastIndex = mathRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex),
    });
  }

  return parts;
}
