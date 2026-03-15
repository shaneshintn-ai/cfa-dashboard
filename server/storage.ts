import {
  userProgress, quizScores, studyStreak,
  type UserProgress, type QuizScore, type StudyStreak,
  type InsertProgress, type InsertQuizScore, type InsertStreak,
} from "@shared/schema";

export interface IStorage {
  // Progress
  getProgress(): Promise<UserProgress[]>;
  setModuleComplete(topicId: string, moduleId: string, completed: boolean): Promise<UserProgress>;
  // Quiz scores
  getQuizScores(): Promise<QuizScore[]>;
  addQuizScore(score: InsertQuizScore): Promise<QuizScore>;
  // Streak
  getStreak(): Promise<StudyStreak[]>;
  markStudyDay(date: string): Promise<StudyStreak>;
}

export class MemStorage implements IStorage {
  private progress: Map<string, UserProgress> = new Map();
  private scores: QuizScore[] = [];
  private streakDays: Map<string, StudyStreak> = new Map();
  private nextId = 1;

  async getProgress(): Promise<UserProgress[]> {
    return Array.from(this.progress.values());
  }

  async setModuleComplete(topicId: string, moduleId: string, completed: boolean): Promise<UserProgress> {
    const key = `${topicId}:${moduleId}`;
    const existing = this.progress.get(key);
    const record: UserProgress = {
      id: existing?.id ?? this.nextId++,
      topicId,
      moduleId,
      completed,
      completedAt: completed ? new Date() : null,
    };
    this.progress.set(key, record);
    return record;
  }

  async getQuizScores(): Promise<QuizScore[]> {
    return this.scores;
  }

  async addQuizScore(score: InsertQuizScore): Promise<QuizScore> {
    const record: QuizScore = {
      id: this.nextId++,
      ...score,
      answeredAt: new Date(),
    };
    this.scores.push(record);
    return record;
  }

  async getStreak(): Promise<StudyStreak[]> {
    return Array.from(this.streakDays.values());
  }

  async markStudyDay(date: string): Promise<StudyStreak> {
    const existing = this.streakDays.get(date);
    if (existing) return existing;
    const record: StudyStreak = {
      id: this.nextId++,
      studyDate: date,
      createdAt: new Date(),
    };
    this.streakDays.set(date, record);
    return record;
  }
}

export const storage = new MemStorage();
