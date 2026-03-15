import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Progress tracking table
export const userProgress = pgTable("user_progress", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  moduleId: text("module_id").notNull(),
  topicId: text("topic_id").notNull(),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
});

// Quiz scores table
export const quizScores = pgTable("quiz_scores", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  topicId: text("topic_id").notNull(),
  moduleId: text("module_id").notNull(),
  questionId: text("question_id").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  difficulty: text("difficulty").notNull(),
  answeredAt: timestamp("answered_at").notNull().defaultNow(),
});

// Study streak table
export const studyStreak = pgTable("study_streak", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  studyDate: text("study_date").notNull().unique(), // YYYY-MM-DD
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProgressSchema = createInsertSchema(userProgress).omit({ id: true, completedAt: true });
export const insertQuizScoreSchema = createInsertSchema(quizScores).omit({ id: true, answeredAt: true });
export const insertStreakSchema = createInsertSchema(studyStreak).omit({ id: true, createdAt: true });

export type InsertProgress = z.infer<typeof insertProgressSchema>;
export type InsertQuizScore = z.infer<typeof insertQuizScoreSchema>;
export type InsertStreak = z.infer<typeof insertStreakSchema>;
export type UserProgress = typeof userProgress.$inferSelect;
export type QuizScore = typeof quizScores.$inferSelect;
export type StudyStreak = typeof studyStreak.$inferSelect;
