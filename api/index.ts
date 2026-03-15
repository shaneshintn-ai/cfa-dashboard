// Vercel Serverless Function — handles all /api/* routes
// Uses the same Express app and MemStorage as the local dev server

import express, { type Request, Response, NextFunction } from "express";
import { storage } from "../server/storage";
import { insertQuizScoreSchema } from "../shared/schema";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Routes ────────────────────────────────────────────────────────────────────

app.get("/api/progress", async (_req, res) => {
  const progress = await storage.getProgress();
  res.json(progress);
});

app.post("/api/progress", async (req, res) => {
  const { topicId, moduleId, completed } = req.body;
  if (!topicId || !moduleId || typeof completed !== "boolean") {
    return res.status(400).json({ error: "Missing fields" });
  }
  const result = await storage.setModuleComplete(topicId, moduleId, completed);
  res.json(result);
});

app.get("/api/scores", async (_req, res) => {
  const scores = await storage.getQuizScores();
  res.json(scores);
});

app.post("/api/scores", async (req, res) => {
  const parsed = insertQuizScoreSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid data", details: parsed.error });
  }
  const result = await storage.addQuizScore(parsed.data);
  res.json(result);
});

app.get("/api/streak", async (_req, res) => {
  const streak = await storage.getStreak();
  res.json(streak);
});

app.post("/api/streak", async (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: "Missing date" });
  const result = await storage.markStudyDay(date);
  res.json(result);
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || 500;
  res.status(status).json({ message: err.message || "Internal Server Error" });
});

export default app;
