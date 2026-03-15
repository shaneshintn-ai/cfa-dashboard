import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TOPICS, getTopicById, type LearningModule, type Flashcard, type QuizQuestion, type Difficulty } from "@/data/curriculum";
import type { UserProgress, QuizScore } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import PerplexityAttribution from "@/components/PerplexityAttribution";
import {
  ArrowLeft, BookOpen, Zap, Brain, ChevronRight, ChevronLeft,
  CheckCircle, XCircle, RotateCcw, Sun, Moon, Flame, ChevronDown,
  ChevronUp, Menu, X, AlertTriangle, List, ChevronRight as Arrow
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

type StudyMode = "modules" | "flashcards" | "quiz";

const TOPIC_BG_SIDEBAR: Record<string, string> = {
  ethics: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  quant: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  economics: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  fsa: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  corporate: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  equity: "bg-green-500/10 text-green-700 dark:text-green-300",
  "fixed-income": "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  derivatives: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  alternatives: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  portfolio: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
};

const TOPIC_ACCENT: Record<string, string> = {
  ethics: "bg-violet-500 hover:bg-violet-600",
  quant: "bg-blue-500 hover:bg-blue-600",
  economics: "bg-emerald-500 hover:bg-emerald-600",
  fsa: "bg-orange-500 hover:bg-orange-600",
  corporate: "bg-amber-500 hover:bg-amber-600",
  equity: "bg-green-500 hover:bg-green-600",
  "fixed-income": "bg-indigo-500 hover:bg-indigo-600",
  derivatives: "bg-purple-500 hover:bg-purple-600",
  alternatives: "bg-rose-500 hover:bg-rose-600",
  portfolio: "bg-teal-500 hover:bg-teal-600",
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

// ─── Flashcard Component ─────────────────────────────────────────────────────
function FlashcardDeck({ cards }: { cards: Flashcard[] }) {
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [seen, setSeen] = useState<Set<number>>(new Set());

  const card = cards[current];

  const next = () => {
    setFlipped(false);
    setTimeout(() => {
      const nextIdx = (current + 1) % cards.length;
      setCurrent(nextIdx);
      setSeen((s) => new Set([...s, nextIdx]));
    }, 200);
  };

  const prev = () => {
    setFlipped(false);
    setTimeout(() => {
      const prevIdx = (current - 1 + cards.length) % cards.length;
      setCurrent(prevIdx);
    }, 200);
  };

  return (
    <div className="space-y-4">
      {/* Progress indicators */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Card {current + 1} of {cards.length}
        </span>
        <div className="flex gap-1">
          {cards.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === current
                  ? "w-6 bg-primary"
                  : seen.has(i)
                  ? "w-2 bg-primary/40"
                  : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{card.losRef}</span>
      </div>

      {/* Card */}
      <div
        className="flashcard-scene cursor-pointer"
        style={{ height: "300px" }}
        onClick={() => setFlipped((f) => !f)}
        data-testid="flashcard"
      >
        <div className={`flashcard-inner w-full h-full ${flipped ? "flipped" : ""}`}>
          {/* Front */}
          <div className="flashcard-face w-full h-full bg-card border rounded-2xl shadow-md flex flex-col items-center justify-center p-6 text-center">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Question</div>
            <div className="text-base font-semibold text-foreground leading-relaxed">{card.front}</div>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <RotateCcw className="h-3 w-3" />
              <span>Tap to reveal answer</span>
            </div>
          </div>

          {/* Back */}
          <div className="flashcard-back bg-card border rounded-2xl shadow-md flex flex-col items-center justify-center p-6 text-center overflow-auto">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Answer</div>
            <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">{card.back}</div>
            {card.formula && (
              <div className="mt-3 formula-box text-foreground">
                {card.formula}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={prev} className="flex-1 sm:flex-none" data-testid="flashcard-prev">
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <Button variant="outline" onClick={() => setFlipped((f) => !f)} className="flex-1 sm:flex-none" data-testid="flashcard-flip">
          <RotateCcw className="h-4 w-4 mr-1" /> Flip
        </Button>
        <Button onClick={next} className="flex-1 sm:flex-none" data-testid="flashcard-next">
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ─── Study Kit Component ──────────────────────────────────────────────────────
function StudyKit({ module: mod, topicId }: { module: LearningModule; topicId: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <List className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Must-Know Points</span>
      </div>
      {mod.studyKit.map((point, i) => (
        <div key={i} className="flex gap-3 p-3 bg-muted/50 rounded-xl border">
          <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${TOPIC_ACCENT[topicId]?.split(" ")[0] ?? "bg-primary"}`}>
            {i + 1}
          </div>
          <p className="text-sm text-foreground leading-relaxed">{point}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Adaptive Quiz Component ──────────────────────────────────────────────────
function AdaptiveQuiz({
  module: mod,
  topicId,
  onScoreUpdate,
}: {
  module: LearningModule;
  topicId: string;
  onScoreUpdate: (correct: boolean, questionId: string, difficulty: Difficulty) => void;
}) {
  const [difficulty, setDifficulty] = useState<Difficulty>("foundation");
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [currentQ, setCurrentQ] = useState<QuizQuestion | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showFlashcard, setShowFlashcard] = useState(false);
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const [sessionStats, setSessionStats] = useState({ total: 0, correct: 0 });

  const getNextQuestion = useCallback(
    (diff: Difficulty, exclude?: Set<string>) => {
      const pool = mod.quizzes.filter(
        (q) => q.difficulty === diff && !exclude?.has(q.id)
      );
      if (pool.length === 0) {
        // Try any difficulty
        const anyPool = mod.quizzes.filter((q) => !exclude?.has(q.id));
        if (anyPool.length === 0) return null;
        return anyPool[Math.floor(Math.random() * anyPool.length)];
      }
      return pool[Math.floor(Math.random() * pool.length)];
    },
    [mod.quizzes]
  );

  useEffect(() => {
    const q = getNextQuestion("foundation", new Set());
    setCurrentQ(q);
    setDifficulty("foundation");
  }, [mod.id]);

  const handleAnswer = (idx: number) => {
    if (showFeedback || selected !== null) return;
    setSelected(idx);
    setShowFeedback(true);

    const isCorrect = idx === currentQ!.correctIndex;
    onScoreUpdate(isCorrect, currentQ!.id, currentQ!.difficulty);

    setSessionStats((s) => ({
      total: s.total + 1,
      correct: s.correct + (isCorrect ? 1 : 0),
    }));

    setAnswered((prev) => new Set([...prev, currentQ!.id]));

    if (isCorrect) {
      const newConsec = consecutiveCorrect + 1;
      setConsecutiveCorrect(newConsec);
      // Escalate difficulty
      if (newConsec >= 2 && difficulty === "application") {
        setDifficulty("analysis");
      } else if (difficulty === "foundation") {
        setDifficulty("application");
      }
    } else {
      // Drop difficulty
      setConsecutiveCorrect(0);
      if (difficulty === "analysis") setDifficulty("application");
      else if (difficulty === "application") setDifficulty("foundation");
      // Show linked flashcard
      if (currentQ?.linkedFlashcardId) {
        setShowFlashcard(true);
      }
    }
  };

  const nextQuestion = () => {
    setSelected(null);
    setShowFeedback(false);
    setShowFlashcard(false);
    const next = getNextQuestion(difficulty, answered.size >= mod.quizzes.length ? new Set() : answered);
    setCurrentQ(next);
  };

  const resetQuiz = () => {
    setDifficulty("foundation");
    setConsecutiveCorrect(0);
    setAnswered(new Set());
    setSelected(null);
    setShowFeedback(false);
    setShowFlashcard(false);
    setSessionStats({ total: 0, correct: 0 });
    const q = getNextQuestion("foundation", new Set());
    setCurrentQ(q);
  };

  if (!currentQ) {
    return (
      <div className="text-center py-10">
        <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold mb-2">Quiz Complete!</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Score: {sessionStats.correct}/{sessionStats.total} ({sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0}%)
        </p>
        <Button onClick={resetQuiz} variant="outline">
          <RotateCcw className="h-4 w-4 mr-2" /> Restart Quiz
        </Button>
      </div>
    );
  }

  const linkedFlashcard = currentQ.linkedFlashcardId
    ? mod.flashcards.find((f) => f.id === currentQ.linkedFlashcardId)
    : null;

  const difficultyLabel: Record<Difficulty, string> = {
    foundation: "Foundation",
    application: "Application",
    analysis: "Analysis",
  };
  const difficultyColor: Record<Difficulty, string> = {
    foundation: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    application: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    analysis: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${difficultyColor[difficulty]}`}>
            {difficultyLabel[difficulty]}
          </span>
          <span className="text-xs text-muted-foreground">{currentQ.losRef}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {sessionStats.correct}/{sessionStats.total} correct
          </span>
          <button
            onClick={resetQuiz}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            data-testid="quiz-reset"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Difficulty progression bar */}
      <div className="flex gap-1">
        {(["foundation", "application", "analysis"] as Difficulty[]).map((d) => (
          <div
            key={d}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              d === difficulty
                ? "bg-primary"
                : difficulty === "analysis" && d !== "analysis"
                ? "bg-primary/40"
                : difficulty === "application" && d === "foundation"
                ? "bg-primary/40"
                : "bg-muted"
            }`}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Foundation</span>
        <span>Application</span>
        <span>Analysis</span>
      </div>

      {/* Question */}
      <div className="bg-card border rounded-2xl p-4 shadow-sm">
        <p className="text-sm font-medium text-foreground leading-relaxed">{currentQ.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-2" data-testid="quiz-options">
        {currentQ.options.map((option, idx) => {
          let optionClass =
            "w-full text-left p-3 rounded-xl border text-sm transition-all ";

          if (!showFeedback) {
            optionClass += "bg-card hover:bg-muted cursor-pointer border-border hover:border-primary/40";
          } else if (idx === currentQ.correctIndex) {
            optionClass += "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-600 text-emerald-800 dark:text-emerald-300";
          } else if (idx === selected && selected !== currentQ.correctIndex) {
            optionClass += "bg-rose-50 dark:bg-rose-950/30 border-rose-400 dark:border-rose-600 text-rose-800 dark:text-rose-300";
          } else {
            optionClass += "bg-card border-border opacity-60";
          }

          return (
            <button
              key={idx}
              className={optionClass}
              onClick={() => handleAnswer(idx)}
              disabled={showFeedback}
              data-testid={`option-${idx}`}
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border text-xs flex items-center justify-center font-medium">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="leading-snug">{option}</span>
                {showFeedback && idx === currentQ.correctIndex && (
                  <CheckCircle className="ml-auto flex-shrink-0 h-4 w-4 text-emerald-500 mt-0.5" />
                )}
                {showFeedback && idx === selected && selected !== currentQ.correctIndex && (
                  <XCircle className="ml-auto flex-shrink-0 h-4 w-4 text-rose-500 mt-0.5" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {showFeedback && (
        <div
          className={`answer-feedback rounded-xl p-4 border ${
            selected === currentQ.correctIndex
              ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700"
              : "bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-700"
          }`}
          data-testid="answer-feedback"
        >
          <div className="flex items-center gap-2 mb-2">
            {selected === currentQ.correctIndex ? (
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            ) : (
              <XCircle className="h-4 w-4 text-rose-600" />
            )}
            <span className={`text-sm font-semibold ${selected === currentQ.correctIndex ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
              {selected === currentQ.correctIndex ? "Correct!" : "Incorrect"}
            </span>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{currentQ.explanation}</p>
          <div className="mt-2 text-xs text-muted-foreground">
            Source: {currentQ.losRef} · CFA 2025 Curriculum
          </div>
        </div>
      )}

      {/* Review flashcard on wrong answer */}
      {showFeedback && selected !== currentQ.correctIndex && linkedFlashcard && (
        <div className="border rounded-xl p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Review — Linked Flashcard</span>
            <span className="text-xs text-muted-foreground ml-auto">{linkedFlashcard.losRef}</span>
          </div>
          <div className="text-xs font-medium text-foreground mb-1">{linkedFlashcard.front}</div>
          <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{linkedFlashcard.back}</div>
          {linkedFlashcard.formula && (
            <div className="formula-box mt-2 text-xs">{linkedFlashcard.formula}</div>
          )}
        </div>
      )}

      {showFeedback && (
        <Button onClick={nextQuestion} className="w-full" data-testid="next-question">
          Next Question <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      )}
    </div>
  );
}

// ─── Module Item in sidebar ───────────────────────────────────────────────────
function ModuleItem({
  mod,
  isSelected,
  isCompleted,
  topicId,
  onClick,
}: {
  mod: LearningModule;
  isSelected: boolean;
  isCompleted: boolean;
  topicId: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={`module-item-${mod.id}`}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center gap-2.5 ${
        isSelected
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
      }`}
    >
      <div className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all ${
        isCompleted ? "bg-emerald-500 border-emerald-500" : "border-sidebar-border"
      }`}>
        {isCompleted && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2.5"><path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
      <span className="text-xs leading-snug">{mod.title}</span>
    </button>
  );
}

// ─── Main StudyPage ───────────────────────────────────────────────────────────
export default function StudyPage() {
  const params = useParams();
  const [, navigate] = useLocation();
  const { dark, toggle } = useTheme();

  const topicId = params.topicId as string;
  const moduleIdParam = params.moduleId as string | undefined;

  const topic = getTopicById(topicId);
  const [selectedModuleId, setSelectedModuleId] = useState<string>(
    moduleIdParam ?? topic?.modules[0]?.id ?? ""
  );
  const [mode, setMode] = useState<StudyMode>("modules");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Reset selected module and mode when topic changes (e.g. clicking another topic in sidebar)
  useEffect(() => {
    const firstModule = getTopicById(topicId)?.modules[0]?.id ?? "";
    setSelectedModuleId(moduleIdParam ?? firstModule);
    setMode("modules");
    setSidebarOpen(false);
  }, [topicId]);

  const { data: progress = [] } = useQuery<UserProgress[]>({
    queryKey: ["/api/progress"],
  });

  const progressMutation = useMutation({
    mutationFn: ({
      topicId,
      moduleId,
      completed,
    }: {
      topicId: string;
      moduleId: string;
      completed: boolean;
    }) => apiRequest("POST", "/api/progress", { topicId, moduleId, completed }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] }),
  });

  const scoreMutation = useMutation({
    mutationFn: (data: {
      topicId: string;
      moduleId: string;
      questionId: string;
      isCorrect: boolean;
      difficulty: string;
    }) => apiRequest("POST", "/api/scores", data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["/api/scores"] }),
  });

  const streakMutation = useMutation({
    mutationFn: (date: string) =>
      apiRequest("POST", "/api/streak", { date }),
  });

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    streakMutation.mutate(today);
  }, []);

  if (!topic) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Topic not found</p>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  const selectedModule = topic.modules.find((m) => m.id === selectedModuleId) ?? topic.modules[0];

  const isCompleted = (modId: string) =>
    progress.some((p) => p.moduleId === modId && p.topicId === topicId && p.completed);

  const toggleComplete = (modId: string) => {
    const completed = !isCompleted(modId);
    progressMutation.mutate({ topicId, moduleId: modId, completed });
  };

  const handleScoreUpdate = (correct: boolean, questionId: string, diff: Difficulty) => {
    scoreMutation.mutate({
      topicId,
      moduleId: selectedModule.id,
      questionId,
      isCorrect: correct,
      difficulty: diff,
    });
  };

  const completedCount = topic.modules.filter((m) => isCompleted(m.id)).length;
  const accentGradient = `from-${topicId === "fixed-income" ? "indigo" : topicId === "alternatives" ? "rose" : topicId === "portfolio" ? "teal" : topicId}-500 to-${topicId === "fixed-income" ? "indigo" : topicId === "alternatives" ? "rose" : topicId === "portfolio" ? "teal" : topicId}-600`;

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        data-testid="sidebar"
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-72 flex flex-col
          bg-sidebar border-r border-sidebar-border transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Sidebar header */}
        <div className="flex-shrink-0 p-4 border-b border-sidebar-border">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground text-xs mb-3 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </button>

          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br ${accentGradient}`}>
              {topic.shortName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-semibold text-sidebar-foreground">{topic.shortName}</div>
              <div className="text-xs text-sidebar-foreground/50">{completedCount}/{topic.modules.length} complete</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1.5 bg-sidebar-accent rounded-full overflow-hidden">
            <div
              className="h-full bg-sidebar-primary rounded-full transition-all duration-500"
              style={{ width: `${Math.round((completedCount / topic.modules.length) * 100)}%` }}
            />
          </div>
        </div>

        {/* Module list */}
        <ScrollArea className="flex-1 sidebar-scroll">
          <div className="p-2 space-y-0.5">
            <div className="px-2 py-1.5 text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
              Learning Modules
            </div>
            {topic.modules.map((mod) => (
              <ModuleItem
                key={mod.id}
                mod={mod}
                isSelected={mod.id === selectedModuleId}
                isCompleted={isCompleted(mod.id)}
                topicId={topicId}
                onClick={() => {
                  setSelectedModuleId(mod.id);
                  setMode("modules");
                  setSidebarOpen(false);
                }}
              />
            ))}
          </div>

          {/* Other topics */}
          <div className="px-3 pt-4 pb-2">
            <div className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-2">Other Topics</div>
            {TOPICS.filter((t) => t.id !== topicId).map((t) => (
              <button
                key={t.id}
                onClick={() => navigate(`/study/${t.id}`)}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all"
              >
                {t.shortName}
              </button>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 h-13 border-b bg-card/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              className="lg:hidden p-1.5 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setSidebarOpen(true)}
              data-testid="menu-toggle"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="hidden sm:block">
              <span className="text-xs text-muted-foreground">{topic.name}</span>
              <span className="mx-1.5 text-muted-foreground/40">/</span>
              <span className="text-xs font-medium text-foreground">{selectedModule?.title}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode tabs */}
            <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
              {(["modules", "flashcards", "quiz"] as StudyMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  data-testid={`mode-${m}`}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all capitalize ${
                    mode === m
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "modules" ? "Study Kit" : m === "flashcards" ? "Flashcards" : "Quiz"}
                </button>
              ))}
            </div>

            <button
              onClick={toggle}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {/* Content area */}
        <ScrollArea className="flex-1">
          <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
            {/* Module header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge variant="outline" className="text-xs mb-2">{topic.shortName} · LM {selectedModule?.number}</Badge>
                <h1 className="text-lg font-bold text-foreground leading-tight">{selectedModule?.title}</h1>
              </div>

              {/* Complete toggle */}
              <div className="flex-shrink-0">
                <button
                  data-testid={`complete-toggle-${selectedModule?.id}`}
                  onClick={() => toggleComplete(selectedModule!.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    isCompleted(selectedModule?.id ?? "")
                      ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400"
                      : "bg-card border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <CheckCircle className={`h-3.5 w-3.5 ${isCompleted(selectedModule?.id ?? "") ? "text-emerald-500" : "text-muted-foreground"}`} />
                  {isCompleted(selectedModule?.id ?? "") ? "Completed" : "Mark Complete"}
                </button>
              </div>
            </div>

            {/* Mode content */}
            {mode === "modules" && selectedModule && (
              <StudyKit module={selectedModule} topicId={topicId} />
            )}

            {mode === "flashcards" && selectedModule && (
              <FlashcardDeck cards={selectedModule.flashcards} />
            )}

            {mode === "quiz" && selectedModule && (
              <AdaptiveQuiz
                module={selectedModule}
                topicId={topicId}
                onScoreUpdate={handleScoreUpdate}
              />
            )}

            {/* Module navigation */}
            <div className="flex items-center justify-between pt-4 border-t">
              {(() => {
                const idx = topic.modules.findIndex((m) => m.id === selectedModuleId);
                const prev = topic.modules[idx - 1];
                const next = topic.modules[idx + 1];
                return (
                  <>
                    {prev ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSelectedModuleId(prev.id); setMode("modules"); }}
                        data-testid="prev-module"
                      >
                        <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                        <span className="hidden sm:inline">{prev.title.substring(0, 20)}...</span>
                        <span className="sm:hidden">Previous</span>
                      </Button>
                    ) : <div />}

                    {next ? (
                      <Button
                        size="sm"
                        onClick={() => { setSelectedModuleId(next.id); setMode("modules"); }}
                        data-testid="next-module"
                      >
                        <span className="hidden sm:inline">{next.title.substring(0, 20)}...</span>
                        <span className="sm:hidden">Next</span>
                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    ) : <div />}
                  </>
                );
              })()}
            </div>
          </div>

          <PerplexityAttribution />
        </ScrollArea>
      </div>
    </div>
  );
}
