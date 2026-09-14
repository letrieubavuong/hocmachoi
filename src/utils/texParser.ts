import { Question, QuestionType } from '../types';

/**
 * Advanced TeX Parser supporting Vietnamese ex_test package formats:
 * 1. Standard 4-choice: \choice{A}{B}{C}{D}
 * 2. True/False 4-statement: \choiceTF{a)}{b)}{c)}{d}
 * 3. Short Answer fill-in: \shortans{3.5}
 */
export function parseExTestTeX(texContent: string): Question[] {
  const questions: Question[] = [];
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

  // Fallback if no \begin{ex} tags present
  if (questions.length === 0) {
    const cauSplit = cleaned.split(/(?=\\begin\{ex\}|\\cau|\\bt\s)/i);
    for (const chunk of cauSplit) {
      if (chunk.includes('\\choice') || chunk.includes('\\shortans') || chunk.includes('\\True')) {
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
    // 1. Extract explanation \loigiai
    let explanation = '';
    const loigiaiMatch = block.match(/\\loigiai\{([\s\S]*?)\}/i) || block.match(/\\begin\{loigiai\}([\s\S]*?)\\end\{loigiai\}/i);
    if (loigiaiMatch) {
      explanation = cleanTeXString(loigiaiMatch[1]);
      block = block.replace(loigiaiMatch[0], '');
    }

    // 2. Check for \shortans{...}
    const shortAnsMatch = block.match(/\\shortans\{([\s\S]*?)\}/i);
    if (shortAnsMatch) {
      const ansText = cleanTeXString(shortAnsMatch[1]);
      let questionText = block.replace(shortAnsMatch[0], '').trim();
      questionText = cleanTeXString(questionText);
      questionText = questionText.replace(/^(\\textbf\{)?(Câu|Bài)\s*\d+[\.:]?\s*(\})?/i, '').trim();

      return {
        id: `tex-q-${index}-${Date.now()}`,
        type: 'SHORT_ANSWER',
        questionText: questionText || `Câu hỏi trả lời ngắn #${index}`,
        options: [],
        shortAnswerText: ansText,
        timeLimit: 20,
        points: 100,
        explanation: explanation || undefined,
      };
    }

    // 3. Check for \choiceTF{...} (True/False 4-statement)
    if (/\\choiceTF/i.test(block)) {
      const choiceIdx = block.search(/\\choiceTF/i);
      let questionText = block.substring(0, choiceIdx).trim();
      questionText = cleanTeXString(questionText);
      questionText = questionText.replace(/^(\\textbf\{)?(Cau|Bài|Câu)\s*\d+[\.:]?\s*(\})?/i, '').trim();

      const choicePart = block.substring(choiceIdx);
      const { statements, tfAnswers } = parseChoicesTF(choicePart);

      return {
        id: `tex-q-${index}-${Date.now()}`,
        type: 'TRUE_FALSE',
        questionText: questionText || `Câu hỏi Đúng/Sai #${index}`,
        options: statements.slice(0, 4),
        tfAnswers: tfAnswers.slice(0, 4),
        timeLimit: 30,
        points: 100,
        explanation: explanation || undefined,
      };
    }

    // 4. Check for \choice or \begin{listEX} / \begin{enumEX} Multiple Choice
    const choiceIdx = block.search(/\\choice/i);
    const listExMatch = block.search(/\\begin\{(listEX|enumEX)\}/i);

    if (choiceIdx !== -1) {
      let questionText = block.substring(0, choiceIdx).trim();
      questionText = cleanTeXString(questionText);
      questionText = questionText.replace(/^(\\textbf\{)?(Câu|Bài)\s*\d+[\.:]?\s*(\})?/i, '').trim();

      const choicePart = block.substring(choiceIdx);
      const { options, correctIndex } = parseChoicesMC(choicePart);

      if (options.length >= 2) {
        while (options.length < 4) {
          options.push(`Lựa chọn ${String.fromCharCode(65 + options.length)}`);
        }

        return {
          id: `tex-q-${index}-${Date.now()}`,
          type: 'MULTIPLE_CHOICE',
          questionText: questionText || `Câu hỏi trắc nghiệm #${index}`,
          options: options.slice(0, 4),
          correctIndex: correctIndex >= 0 && correctIndex < 4 ? correctIndex : 0,
          timeLimit: 20,
          points: 100,
          explanation: explanation || undefined,
        };
      }
    }

    // Fallback: listEX/enumEX without explicit \choice keyword
    if (listExMatch !== -1) {
      let questionText = block.substring(0, listExMatch).trim();
      questionText = cleanTeXString(questionText);
      questionText = questionText.replace(/^(\\textbf\{)?(Câu|Bài)\s*\d+[\.:]?\s*(\})?/i, '').trim();

      const choicePart = block.substring(listExMatch);
      const { options, correctIndex } = parseChoicesMC(choicePart);

      if (options.length >= 2) {
        while (options.length < 4) {
          options.push(`Lựa chọn ${String.fromCharCode(65 + options.length)}`);
        }

        return {
          id: `tex-q-${index}-${Date.now()}`,
          type: 'MULTIPLE_CHOICE',
          questionText: questionText || `Câu hỏi trắc nghiệm #${index}`,
          options: options.slice(0, 4),
          correctIndex: correctIndex >= 0 && correctIndex < 4 ? correctIndex : 0,
          timeLimit: 20,
          points: 100,
          explanation: explanation || undefined,
        };
      }
    }

    return null;
  } catch (e) {
    console.error('Error parsing TeX block:', e);
    return null;
  }
}

function parseChoicesTF(choiceStr: string): { statements: string[]; tfAnswers: boolean[] } {
  const statements: string[] = [];
  const tfAnswers: boolean[] = [];

  // Remove \choiceTF or \choiceTF[1] or \choiceTF[2] etc.
  let body = choiceStr.replace(/^\\choiceTF(?:\s*\[.*?\])?\s*/i, '').trim();

  // Strip \begin{listEX}... \end{listEX} or \begin{enumEX}... \end{enumEX} outer wrappers
  body = body
    .replace(/\\begin\{(listEX|enumEX)\}(?:\[.*?\])*(?:\{.*?\})*/gi, '')
    .replace(/\\end\{(listEX|enumEX)\}/gi, '')
    .trim();

  const braceBlocks = extractBraceBlocks(body);

  if (braceBlocks.length >= 4) {
    braceBlocks.slice(0, 4).forEach((rawOpt) => {
      let text = rawOpt.trim();
      const isTrue = /\\True/i.test(text);
      text = text.replace(/\\True/gi, '').trim();
      statements.push(cleanTeXString(text));
      tfAnswers.push(isTrue);
    });
  } else {
    // Fallback item / task split
    const items = body.split(/\\item|\\choice|\\task/i).filter((s) => s.trim().length > 0);
    items.slice(0, 4).forEach((rawOpt) => {
      let text = rawOpt.trim();
      const isTrue = /\\True/i.test(text);
      text = text.replace(/\\True/gi, '').trim();
      statements.push(cleanTeXString(text));
      tfAnswers.push(isTrue);
    });
  }

  while (statements.length < 4) {
    statements.push(`Mệnh đề ${String.fromCharCode(97 + statements.length)})`);
    tfAnswers.push(true);
  }

  return { statements, tfAnswers };
}

function parseChoicesMC(choiceStr: string): { options: string[]; correctIndex: number } {
  const options: string[] = [];
  let correctIndex = 0;

  // Remove \choice or \choice[1] or \choice[2] etc.
  let body = choiceStr.replace(/^\\choice(?:\s*\[.*?\])?\s*/i, '').trim();

  // Strip \begin{listEX}... \end{listEX} or \begin{enumEX}... \end{enumEX} outer wrappers
  body = body
    .replace(/\\begin\{(listEX|enumEX)\}(?:\[.*?\])*(?:\{.*?\})*/gi, '')
    .replace(/\\end\{(listEX|enumEX)\}/gi, '')
    .trim();

  const braceBlocks = extractBraceBlocks(body);

  if (braceBlocks.length >= 4) {
    braceBlocks.slice(0, 4).forEach((rawOpt, idx) => {
      let text = rawOpt.trim();
      if (/\\True/i.test(text)) {
        correctIndex = idx;
        text = text.replace(/\\True/gi, '').trim();
      }
      options.push(cleanTeXString(text));
    });
  } else {
    const items = body.split(/\\item|\\choice|\\task/i).filter((s) => s.trim().length > 0);
    items.slice(0, 4).forEach((rawOpt, idx) => {
      let text = rawOpt.trim();
      if (/\\True/i.test(text)) {
        correctIndex = idx;
        text = text.replace(/\\True/gi, '').trim();
      }
      options.push(cleanTeXString(text));
    });
  }

  return { options, correctIndex };
}

function extractBraceBlocks(str: string): string[] {
  const blocks: string[] = [];
  let depth = 0;
  let current = '';

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '{') {
      if (depth > 0) current += char;
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0) {
        blocks.push(current);
        current = '';
      } else {
        current += char;
      }
    } else if (depth > 0) {
      current += char;
    }
  }
  return blocks;
}

function unwrapImmini(str: string): string {
  let result = str;
  let guard = 0;
  
  while (guard < 100) {
    guard++;
    const imminiIndex = result.search(/\\immini\s*\{/i);
    if (imminiIndex === -1) break;

    const afterKeyword = result.substring(imminiIndex);
    const firstBraceIdx = afterKeyword.indexOf('{');
    if (firstBraceIdx === -1) break;

    let depth = 0;
    let blockCount = 0;
    let endIdx = -1;
    const blocks: string[] = ['', ''];

    for (let i = firstBraceIdx; i < afterKeyword.length; i++) {
      const char = afterKeyword[i];
      if (char === '{') {
        if (depth > 0) blocks[blockCount] += char;
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          blockCount++;
          if (blockCount === 2) {
            endIdx = i + 1;
            break;
          }
        } else {
          blocks[blockCount] += char;
        }
      } else if (depth > 0) {
        blocks[blockCount] += char;
      }
    }

    if (endIdx !== -1 && blockCount === 2) {
      const fullMatch = afterKeyword.substring(0, endIdx);
      const replacement = `${blocks[0]}\n\n${blocks[1]}`;
      result = result.substring(0, imminiIndex) + replacement + result.substring(imminiIndex + fullMatch.length);
    } else {
      break;
    }
  }

  return result;
}

function cleanTeXString(str: string): string {
  if (!str) return '';

  let cleaned = str;
  cleaned = unwrapImmini(cleaned);

  return cleaned
    .replace(/\\begin\{(listEX|enumEX)\}(?:\[.*?\])*(?:\{.*?\})*/gi, '')
    .replace(/\\end\{(listEX|enumEX)\}/gi, '')
    .replace(/\\begin\{center\}/gi, '')
    .replace(/\\end\{center\}/gi, '')
    .replace(/\\item\s*/gi, '\n• ')
    .replace(/\\task\s*/gi, '\n• ')
    .replace(/\\noindent/gi, '')
    .replace(/\\textbf\{([\s\S]*?)\}/gi, '$1')
    .replace(/\\textit\{([\s\S]*?)\}/gi, '$1')
    .replace(/\\text\{([\s\S]*?)\}/gi, '$1')
    .replace(/\\mathrm\{([\s\S]*?)\}/gi, '$1')
    .replace(/\\hfill/gi, '')
    .replace(/\\vspace\{.*?\}|\\hspace\{.*?\}/gi, '')
    .trim();
}

