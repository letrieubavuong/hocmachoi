import { Question } from '../types';

/**
 * Robust LaTeX ex_test package parser for Vietnamese exam files (.tex)
 * Supports \begin{ex} ... \end{ex}, \begin{cau} ... \end{cau}
 * Supports \choice{A}{B}{C}{D} with \True or \True{...}
 * Supports \loigiai{...} and \begin{loigiai}...\end{loigiai}
 */
export function parseExTestTeX(texContent: string): Question[] {
  const questions: Question[] = [];

  // Normalize newlines
  const cleaned = texContent.replace(/\r\n/g, '\n');

  // Match all \begin{ex} ... \end{ex} or \begin{cau} ... \end{cau} or \begin{question} ... \end{question}
  const exBlockRegex = /\\begin\{(ex|cau|question)\}([\s\S]*?)\\end\{\1\}/gi;

  let match: RegExpExecArray | null;
  let qCounter = 1;

  while ((match = exBlockRegex.exec(cleaned)) !== null) {
    const block = match[2].trim();
    const parsedQ = parseSingleExBlock(block, qCounter);
    if (parsedQ) {
      questions.push(parsedQ);
      qCounter++;
    }
  }

  // Fallback: If no \begin{ex} blocks found, try splitting by \bt or \cau or Question
  if (questions.length === 0) {
    const cauSplit = cleaned.split(/(?=\\begin\{ex\}|\\cau|\\bt\s)/i);
    for (const chunk of cauSplit) {
      if (chunk.includes('\\choice') || chunk.includes('\\True')) {
        const parsed = parseSingleExBlock(chunk, qCounter);
        if (parsed) {
          questions.push(parsed);
          qCounter++;
        }
      }
    }
  }

  return questions;
}

function parseSingleExBlock(block: string, index: number): Question | null {
  try {
    // 1. Extract \loigiai / explanation if present
    let explanation = '';
    const loigiaiMatch = block.match(/\\loigiai\{([\s\S]*?)\}/i) || block.match(/\\begin\{loigiai\}([\s\S]*?)\\end\{loigiai\}/i);
    if (loigiaiMatch) {
      explanation = cleanTeXString(loigiaiMatch[1]);
      // Remove loigiai from block to simplify choice parsing
      block = block.replace(loigiaiMatch[0], '');
    }

    // 2. Locate \choice / \choices
    const choiceIdx = block.search(/\\choice(s|TF)?/i);
    if (choiceIdx === -1) return null;

    let questionText = block.substring(0, choiceIdx).trim();
    questionText = cleanTeXString(questionText);

    // Remove leading "Câu 1:", "Bài 1:" if present
    questionText = questionText.replace(/^(\\textbf\{)?(Câu|Bài)\s*\d+[\.:]?\s*(\})?/i, '').trim();

    const choicePart = block.substring(choiceIdx);
    const { options, correctIndex } = parseChoices(choicePart);

    if (options.length < 2) return null;

    // Ensure exactly 4 options by padding if needed
    while (options.length < 4) {
      options.push(`Lựa chọn ${String.fromCharCode(65 + options.length)}`);
    }

    return {
      id: `tex-q-${index}-${Date.now()}`,
      questionText: questionText || `Câu hỏi ${index}`,
      options: options.slice(0, 4),
      correctIndex: correctIndex >= 0 && correctIndex < 4 ? correctIndex : 0,
      timeLimit: 20,
      points: 100,
      explanation: explanation || undefined,
    };
  } catch (e) {
    console.error('Error parsing TeX block:', e);
    return null;
  }
}

function parseChoices(choiceStr: string): { options: string[]; correctIndex: number } {
  const options: string[] = [];
  let correctIndex = 0;

  // Remove \choice command header
  const body = choiceStr.replace(/^\\choice(s|TF)?\s*/i, '').trim();

  // Pattern A: \choice{Opt 1}{Opt 2}{Opt 3}{Opt 4}
  const braceBlocks: string[] = [];
  let depth = 0;
  let current = '';

  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    if (char === '{') {
      if (depth > 0) current += char;
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0) {
        braceBlocks.push(current);
        current = '';
      } else {
        current += char;
      }
    } else if (depth > 0) {
      current += char;
    }
  }

  if (braceBlocks.length >= 4) {
    braceBlocks.slice(0, 4).forEach((rawOpt, idx) => {
      let optText = rawOpt.trim();
      if (/\\True/i.test(optText)) {
        correctIndex = idx;
        optText = optText.replace(/\\True/gi, '').trim();
      }
      options.push(cleanTeXString(optText));
    });
    return { options, correctIndex };
  }

  // Pattern B: \choice \item \True Opt 1 \item Opt 2 ...
  const items = body.split(/\\item|\\choice/i).filter((s) => s.trim().length > 0);
  items.slice(0, 4).forEach((rawOpt, idx) => {
    let optText = rawOpt.trim();
    if (/\\True/i.test(optText)) {
      correctIndex = idx;
      optText = optText.replace(/\\True/gi, '').trim();
    }
    options.push(cleanTeXString(optText));
  });

  return { options, correctIndex };
}

function cleanTeXString(str: string): string {
  if (!str) return '';

  let cleaned = str
    // Remove unwanted TeX layout macros
    .replace(/\\immini\{[\s\S]*?\}\{[\s\S]*?\}/gi, '')
    .replace(/\\noindent/gi, '')
    .replace(/\\textbf\{([\s\S]*?)\}/gi, '$1')
    .replace(/\\textit\{([\s\S]*?)\}/gi, '$1')
    .replace(/\\text\{([\s\S]*?)\}/gi, '$1')
    .replace(/\\mathrm\{([\s\S]*?)\}/gi, '$1')
    .replace(/\\begin\{center\}[\s\S]*?\\end\{center\}/gi, '')
    .replace(/\\hfill/gi, '')
    .replace(/\\vspace\{.*?\}|\\hspace\{.*?\}/gi, '')
    .trim();

  return cleaned;
}
