import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TOPICS, getTotalModules } from "@/data/curriculum";
import type { UserProgress, QuizScore, StudyStreak } from "@shared/schema";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PerplexityAttribution from "@/components/PerplexityAttribution";
import {
  BookOpen, Flame, Target, TrendingDown, CheckCircle,
  BarChart3, Zap, Moon, Sun, ChevronRight, Trophy, Clock
} from "lucide-react";

function useTheme() {
  const [dark, setDark] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  return { dark, toggle: () => setDark((d) => !d) };
}

const TOPIC_COLORS: Record<string, string> = {
  ethics: "from-violet-500 to-violet-600",
  quant: "from-blue-500 to-blue-600",
  economics: "from-emerald-500 to-emerald-600",
  fsa: "from-orange-500 to-orange-600",
  corporate: "from-amber-500 to-amber-600",
  equity: "from-green-500 to-green-600",
  "fixed-income": "from-indigo-500 to-indigo-600",
  derivatives: "from-purple-500 to-purple-600",
  alternatives: "from-rose-500 to-rose-600",
  portfolio: "from-teal-500 to-teal-600",
};

const TOPIC_BG: Record<string, string> = {
  ethics: "bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800",
  quant: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
  economics: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800",
  fsa: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800",
  corporate: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
  equity: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
  "fixed-income": "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800",
  derivatives: "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800",
  alternatives: "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800",
  portfolio: "bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800",
};

const TOPIC_TEXT: Record<string, string> = {
  ethics: "text-violet-600 dark:text-violet-400",
  quant: "text-blue-600 dark:text-blue-400",
  economics: "text-emerald-600 dark:text-emerald-400",
  fsa: "text-orange-600 dark:text-orange-400",
  corporate: "text-amber-600 dark:text-amber-400",
  equity: "text-green-600 dark:text-green-400",
  "fixed-income": "text-indigo-600 dark:text-indigo-400",
  derivatives: "text-purple-600 dark:text-purple-400",
  alternatives: "text-rose-600 dark:text-rose-400",
  portfolio: "text-teal-600 dark:text-teal-400",
};

const TOPIC_PROGRESS_COLOR: Record<string, string> = {
  ethics: "bg-violet-500",
  quant: "bg-blue-500",
  economics: "bg-emerald-500",
  fsa: "bg-orange-500",
  corporate: "bg-amber-500",
  equity: "bg-green-500",
  "fixed-income": "bg-indigo-500",
  derivatives: "bg-purple-500",
  alternatives: "bg-rose-500",
  portfolio: "bg-teal-500",
};

export default function Dashboard() {
  const { dark, toggle } = useTheme();
  const [, navigate] = useLocation();

  const { data: progress = [] } = useQuery<UserProgress[]>({
    queryKey: ["/api/progress"],
  });

  const { data: scores = [] } = useQuery<QuizScore[]>({
    queryKey: ["/api/scores"],
  });

  const { data: streakData = [] } = useQuery<StudyStreak[]>({
    queryKey: ["/api/streak"],
  });

  const streakMutation = useMutation({
    mutationFn: (date: string) =>
      apiRequest("POST", "/api/streak", { date }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/streak"] }),
  });

  // Mark today as studied
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    streakMutation.mutate(today);
  }, []);

  // Calculate streak
  const streakCount = (() => {
    const days = streakData.map((s) => s.studyDate).sort().reverse();
    if (days.length === 0) return 1;
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < days.length; i++) {
      const day = new Date(days[i]);
      const expected = new Date(today);
      expected.setDate(today.getDate() - i);
      if (day.toISOString().split("T")[0] === expected.toISOString().split("T")[0]) {
        streak++;
      } else break;
    }
    return Math.max(streak, 1);
  })();

  // Completed modules
  const completedModules = progress.filter((p) => p.completed).length;
  const totalModules = getTotalModules();

  // Per-topic mastery
  const topicMastery = TOPICS.map((topic) => {
    const topicScores = scores.filter((s) => s.topicId === topic.id);
    const correct = topicScores.filter((s) => s.isCorrect).length;
    const total = topicScores.length;
    const quizMastery = total > 0 ? Math.round((correct / total) * 100) : 0;
    const topicProgress = progress.filter(
      (p) => p.topicId === topic.id && p.completed
    ).length;
    const completionPct = Math.round((topicProgress / topic.modules.length) * 100);
    const mastery = total > 0 ? Math.round((quizMastery * 0.6 + completionPct * 0.4)) : completionPct;
    return {
      ...topic,
      mastery,
      quizMastery,
      completionPct,
      completed: topicProgress,
      total: topic.modules.length,
      questionsAnswered: total,
    };
  });

  // Weak topics (lowest quiz mastery, at least 1 question answered)
  const weakTopics = [...topicMastery]
    .filter((t) => t.questionsAnswered > 0)
    .sort((a, b) => a.quizMastery - b.quizMastery)
    .slice(0, 3);

  const overallMastery = topicMastery.length > 0
    ? Math.round(topicMastery.reduce((s, t) => s + t.mastery, 0) / topicMastery.length)
    : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <svg aria-label="CFA Study" viewBox="0 0 32 32" width="28" height="28" fill="none">
              <rect width="32" height="32" rx="8" fill="hsl(220 70% 40%)" />
              <text x="4" y="22" fontFamily="Georgia, serif" fontWeight="bold" fontSize="16" fill="hsl(45 90% 65%)">C</text>
              <text x="14" y="22" fontFamily="Georgia, serif" fontWeight="bold" fontSize="16" fill="white">FA</text>
            </svg>
            <div>
              <span className="text-sm font-semibold text-foreground">CFA Level I</span>
              <span className="ml-1.5 text-xs text-muted-foreground hidden sm:inline">2025 Study Dashboard</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Streak badge */}
            <div data-testid="streak-badge" className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-full">
              <Flame className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">{streakCount} day streak</span>
            </div>
            <button
              onClick={toggle}
              data-testid="theme-toggle"
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Hero stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="stats-grid">
          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Overall Mastery</span>
                <Trophy className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-foreground">{overallMastery}%</div>
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-1000" style={{ width: `${overallMastery}%` }} />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Modules Done</span>
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-foreground">{completedModules}<span className="text-base font-normal text-muted-foreground">/{totalModules}</span></div>
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${Math.round((completedModules / totalModules) * 100)}%` }} />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Questions Done</span>
                <Zap className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-foreground">{scores.length}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {scores.filter((s) => s.isCorrect).length} correct ({scores.length > 0 ? Math.round((scores.filter(s => s.isCorrect).length / scores.length) * 100) : 0}%)
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Study Streak</span>
                <Flame className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-foreground">{streakCount}<span className="text-base font-normal text-muted-foreground"> days</span></div>
              <div className="text-xs text-muted-foreground mt-1">Keep it going!</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Topic mastery bars — 2/3 width */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Topic Mastery
              </h2>
              <span className="text-xs text-muted-foreground">Weighted by CFA exam weight</span>
            </div>

            {topicMastery.map((topic) => (
              <Link key={topic.id} href={`/study/${topic.id}`}>
                <div
                  data-testid={`topic-card-${topic.id}`}
                  className={`group border rounded-xl p-3.5 cursor-pointer transition-all hover:shadow-md ${TOPIC_BG[topic.id]}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-sm font-semibold ${TOPIC_TEXT[topic.id]}`}>{topic.shortName}</span>
                      <Badge variant="outline" className="text-xs h-4 px-1.5">
                        {topic.examWeight}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{topic.completed}/{topic.total} modules</span>
                      <span className={`text-sm font-bold ${TOPIC_TEXT[topic.id]}`}>{topic.mastery}%</span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                  <div className="h-2 bg-white/60 dark:bg-black/20 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${TOPIC_PROGRESS_COLOR[topic.id]}`}
                      style={{ width: `${topic.mastery}%` }}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Right column: Weak topics + exam tips */}
          <div className="space-y-4">
            {/* Weak topics */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-rose-500" />
                  Weak Topics
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {weakTopics.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Start quizzes to see your weak areas.</p>
                ) : (
                  weakTopics.map((t, i) => (
                    <Link key={t.id} href={`/study/${t.id}`}>
                      <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground">{i + 1}.</span>
                          <span className="text-sm font-medium">{t.shortName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-rose-500 font-semibold">{t.quizMastery}%</span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </div>
                    </Link>
                  ))
                )}
                {weakTopics.length === 0 && (
                  <p className="text-xs text-muted-foreground">Complete quizzes to track which topics need the most attention.</p>
                )}
              </CardContent>
            </Card>

            {/* CFA exam weight guide */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Exam Weights
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-1.5">
                {TOPICS.map((t) => (
                  <div key={t.id} className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${TOPIC_TEXT[t.id]}`}>{t.shortName}</span>
                    <span className="text-xs text-muted-foreground">{t.examWeight}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>


      </div>

      <PerplexityAttribution />
    </div>
  );
}
