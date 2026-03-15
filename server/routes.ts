import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertQuizScoreSchema, insertStreakSchema } from "@shared/schema";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Get all progress
  app.get("/api/progress", async (_req, res) => {
    const progress = await storage.getProgress();
    res.json(progress);
  });

  // Update module completion
  app.post("/api/progress", async (req, res) => {
    const { topicId, moduleId, completed } = req.body;
    if (!topicId || !moduleId || typeof completed !== "boolean") {
      return res.status(400).json({ error: "Missing fields" });
    }
    const result = await storage.setModuleComplete(topicId, moduleId, completed);
    res.json(result);
  });

  // Get quiz scores
  app.get("/api/scores", async (_req, res) => {
    const scores = await storage.getQuizScores();
    res.json(scores);
  });

  // Add quiz score
  app.post("/api/scores", async (req, res) => {
    const parsed = insertQuizScoreSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid data", details: parsed.error });
    }
    const result = await storage.addQuizScore(parsed.data);
    res.json(result);
  });

  // Get streak data
  app.get("/api/streak", async (_req, res) => {
    const streak = await storage.getStreak();
    res.json(streak);
  });

  // Mark study day
  app.post("/api/streak", async (req, res) => {
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: "Missing date" });
    const result = await storage.markStudyDay(date);
    res.json(result);
  });

  return httpServer;
}
