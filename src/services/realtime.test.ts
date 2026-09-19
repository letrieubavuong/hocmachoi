import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeService } from './realtime';
import type { ChibiCustomization, GameRoom, Player, Question } from '../types';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

const chibi: ChibiCustomization = {
  skinColor: '#fff', hairStyle: 'short', hairColor: '#000', eyeType: 'happy',
  outfitStyle: 'uniform', outfitColor: '#00f', hatStyle: 'none', accessory: 'none',
};

const questions: Question[] = [
  { id: 'q1', type: 'MULTIPLE_CHOICE', questionText: '1 + 1?', options: ['1', '2', '3', '4'], correctIndex: 1, timeLimit: 30, points: 100 },
  { id: 'q2', type: 'SHORT_ANSWER', questionText: '2 + 2?', options: [], shortAnswerText: '4', timeLimit: 30, points: 100 },
];

function player(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1', studentCode: 'HS-0001', name: 'An', chibi, score: 0, streak: 0,
    shieldActive: false, shieldCount: 0, isReady: true, joinedAt: 1,
    shuffledQuestions: questions, currentQuestionIndex: 0, ...overrides,
  };
}

function room(p: Player = player()): GameRoom {
  return {
    roomCode: '123456', hostId: 'host', quiz: { id: 'quiz', title: 'Test', description: '', questions },
    phase: 'QUESTION', currentQuestionIndex: 0, questionStartTime: Date.now(),
    players: { [p.id]: p }, attacks: [], updatedAt: Date.now(),
  };
}

function hostService(initial: GameRoom): RealtimeService {
  localStorage.setItem(`chibi_quiz_room_${initial.roomCode}`, JSON.stringify(initial));
  const service = new RealtimeService();
  Object.assign(service, { isHost: true });
  return service;
}

describe('RealtimeService authoritative quiz flow', () => {
  beforeEach(() => {
    const storage = new MemoryStorage();
    Object.assign(globalThis, {
      window: { localStorage: storage, setTimeout, addEventListener: () => undefined },
      localStorage: storage,
    });
    vi.restoreAllMocks();
  });

  it('chấm đáp án trên host và từ chối cộng điểm lại cho cùng câu', () => {
    const service = hostService(room());
    const first = service.submitAnswer('123456', 'p1', { type: 'MULTIPLE_CHOICE', selectedIndex: 1 }, 3)!;
    expect(first.players.p1.score).toBe(250);
    expect(first.players.p1.correctCount).toBe(1);

    const replay = service.submitAnswer('123456', 'p1', { type: 'MULTIPLE_CHOICE', selectedIndex: 1 }, 3)!;
    expect(replay.players.p1.score).toBe(250);
    expect(replay.players.p1.totalAnswered).toBe(1);
  });

  it('nhận quà x2, dùng đúng một lần rồi chuyển sang câu tiếp theo', () => {
    const service = hostService(room());
    const gifted = service.grantTeacherReward('123456', 'p1', 'DOUBLE_POINTS', 'Quà kiểm thử')!;
    expect(gifted.players.p1.doublePointsActive).toBe(true);
    expect(gifted.latestTeacherGift?.rewardMap?.p1).toBe('DOUBLE_POINTS');

    const answered = service.submitAnswer('123456', 'p1', { type: 'MULTIPLE_CHOICE', selectedIndex: 1 }, 3)!;
    expect(answered.players.p1.score).toBe(500);
    expect(answered.players.p1.doublePointsActive).toBe(false);

    const advanced = service.advancePlayerQuestion('123456', 'p1')!;
    expect(advanced.players.p1.currentQuestionIndex).toBe(1);
    expect(advanced.players.p1.isFinished).toBe(false);
  });

  it('mở quà chuỗi, kích hoạt quà đúng một lần rồi chuyển câu', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const service = hostService(room(player({ streak: 1 })));
    const answered = service.submitAnswer('123456', 'p1', { type: 'MULTIPLE_CHOICE', selectedIndex: 1 }, 3)!;
    expect(answered.players.p1.unlockedPowerUp).toBe('SHIELD');
    expect(answered.players.p1.shieldCount).toBe(0);

    const used = service.executePowerUp('123456', 'p1', 'p1', 'SHIELD');
    expect(used?.success).toBe(true);
    expect(service.getRoom('123456')!.players.p1.shieldCount).toBe(1);
    expect(service.getRoom('123456')!.players.p1.unlockedPowerUp).toBeNull();

    service.advancePlayerQuestion('123456', 'p1');
    expect(service.getRoom('123456')!.players.p1.currentQuestionIndex).toBe(1);
  });

  it('đóng băng 10 giây khi trả lời quá nhanh và không bị xóa bởi cập nhật điểm', () => {
    const now = Date.now();
    const service = hostService(room());
    const updated = service.submitAnswer('123456', 'p1', { type: 'MULTIPLE_CHOICE', selectedIndex: 1 }, 1)!;
    expect(updated.players.p1.isFrozen).toBe(true);
    expect(updated.players.p1.freezeUntil).toBeGreaterThanOrEqual(now + 9_000);
    expect(updated.players.p1.rapidGuessCount).toBe(1);
  });

  it('host tự đánh giá trắc nghiệm, đúng-sai và câu trả lời ngắn', () => {
    const service = hostService(room());
    expect(service.evaluateAnswer(questions[0], { type: 'MULTIPLE_CHOICE', selectedIndex: 0 })).toBe(false);
    expect(service.evaluateAnswer(
      { ...questions[0], type: 'TRUE_FALSE', options: ['a', 'b'], tfAnswers: [true, false] },
      { type: 'TRUE_FALSE', selections: { 0: true, 1: false } },
    )).toBe(true);
    expect(service.evaluateAnswer(questions[1], { type: 'SHORT_ANSWER', text: '4,0' })).toBe(true);
  });

  it('client không thể ghi đè room dùng chung khi tự chuyển câu', () => {
    const initial = room();
    localStorage.setItem('chibi_quiz_room_123456', JSON.stringify(initial));
    const client = new RealtimeService();
    client.advancePlayerQuestion('123456', 'p1');
    const persisted = JSON.parse(localStorage.getItem('chibi_quiz_room_123456')!);
    expect(persisted.players.p1.currentQuestionIndex).toBe(0);
  });

  it('không cho client thay nội dung hoặc số điểm khi gửi thứ tự câu hỏi', () => {
    const initial = room(player({ shuffledQuestions: undefined }));
    const service = hostService(initial);
    const tampered = questions.map((question) => ({ ...question, points: 999_999, correctIndex: 0 }));
    const updated = service.initializePlayerQuestions('123456', 'p1', tampered)!;
    expect(updated.players.p1.shuffledQuestions?.[0].points).toBe(100);
    expect(updated.players.p1.shuffledQuestions?.[0].correctIndex).toBe(1);
  });
});
