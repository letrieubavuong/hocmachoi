import { Question } from '../types';

export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function shuffleStudentQuestions(questions: Question[]): Question[] {
  if (!questions || questions.length === 0) return [];

  // 1. Shuffle question order
  const shuffledQList = shuffleArray(questions);

  // 2. Shuffle options for MULTIPLE_CHOICE questions
  return shuffledQList.map((q) => {
    if (
      (q.type === 'MULTIPLE_CHOICE' || !q.type) &&
      q.options &&
      q.options.length > 0 &&
      q.correctIndex !== undefined
    ) {
      const indexedOptions = q.options.map((opt, idx) => ({
        text: opt,
        isCorrect: idx === q.correctIndex,
      }));
      const shuffledOptions = shuffleArray(indexedOptions);
      const newOptions = shuffledOptions.map((o) => o.text);
      const newCorrectIndex = shuffledOptions.findIndex((o) => o.isCorrect);

      return {
        ...q,
        options: newOptions,
        correctIndex: newCorrectIndex,
      };
    }
    return { ...q };
  });
}
