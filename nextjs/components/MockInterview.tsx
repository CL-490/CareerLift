"use client";

import { useState, useEffect, KeyboardEvent } from "react";
import {
  startInterview,
  submitInterviewAnswer,
  getInterviewSession,
  InterviewResponse,
  SessionSummary,
  InterviewQuestion,
  InterviewEvaluation,
} from "@/lib/interviewApi";

interface MockInterviewProps {
  resumeId: string;
  resumeName: string;
  jobApplyUrl: string;
  roleTitle: string;
  roleLevel: string;
  onComplete?: (summary: SessionSummary) => void;
  onReset?: () => void;
}

interface Message {
  question?: string;
  answer?: string;
  evaluation?: InterviewEvaluation;
}

export default function MockInterview({
  resumeId,
  resumeName,
  jobApplyUrl,
  roleTitle,
  roleLevel,
  onComplete,
  onReset,
}: MockInterviewProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize interview session
  useEffect(() => {
    const initializeInterview = async () => {
      try {
        setIsInitializing(true);
        const response = await startInterview(resumeId, jobApplyUrl, roleLevel);
        setSessionId(response.session_id || null);
        if (response.next_question) {
          setCurrentQuestion(response.next_question.text);
          setMessages([{ question: response.next_question.text }]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start interview");
      } finally {
        setIsInitializing(false);
      }
    };

    initializeInterview();
  }, [resumeId, jobApplyUrl, roleLevel]);

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim() || !sessionId) return;

    try {
      setIsLoading(true);
      const response = await submitInterviewAnswer(sessionId, userAnswer);

      // Update messages with answer and evaluation
      setMessages((prev: Message[]) => {
        const updated = [...prev];
        const lastMessage = updated[updated.length - 1];
        lastMessage.answer = userAnswer;
        if (response.evaluation) {
          lastMessage.evaluation = response.evaluation;
        }

        // Add next question if available
        if (response.next_question) {
          updated.push({ question: response.next_question.text });
        }

        return updated;
      });

      setUserAnswer("");

      // Check if interview is complete
      if (response.session_complete) {
        const sessionData = await getInterviewSession(sessionId);
        setSummary(sessionData.summary ?? { steps: [] });
        onComplete?.(sessionData.summary ?? { steps: [] });
      } else if (response.next_question) {
        setCurrentQuestion(response.next_question.text);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit answer");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleSubmitAnswer();
    }
  };

  const handleResetClick = () => {
    if (confirm("Are you sure you want to reset the interview? Your progress will be lost.")) {
      onReset?.();
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spinner mb-4">⏳</div>
          <p className="text-muted">Initializing interview...</p>
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="notice-banner notice-error p-6">
        <p className="font-semibold mb-2">Error Starting Interview</p>
        <p className="text-sm mb-4">{error}</p>
        <button
          onClick={onReset}
          className="jf-btn px-4 py-2 text-sm"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (summary) {
    return <InterviewSummary summary={summary} onNewInterview={onReset} />;
  }

  const questionNumber = messages.length;
  const progress = (questionNumber / 5) * 100;

  return (
    <div className="space-y-4">
      {/* Header with Progress */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-muted">Interview in Progress</h3>
          <p className="text-sm font-semibold tracking-tight heading-gradient">
            {roleTitle} • {roleLevel}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={handleResetClick}
            className="notice-error rounded px-3 py-1 text-xs font-semibold transition-colors hover:opacity-85"
          >
            Reset
          </button>
          <div className="text-right">
            <p className="mb-1 text-xs text-muted">
              Question {questionNumber} of 5
            </p>
            <div className="h-1.5 w-24 rounded-full bg-[var(--input-bg)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Message History - Scrollable */}
      <div className="surface rounded-lg p-4 space-y-4 max-h-64 overflow-y-auto">
        {messages.map((msg, idx) => (
          <div key={idx} className="space-y-2">
            {msg.question && (
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--tone-info-text)]">Question {idx + 1}</p>
                <p className="text-sm font-medium text-foreground">{msg.question}</p>
              </div>
            )}
            {msg.answer && (
              <div className="border-l-2 border-[var(--tone-success-border)] pl-4">
                <p className="mb-1 text-xs font-semibold uppercase text-[var(--tone-success-text)]">Your Answer</p>
                <p className="text-sm text-muted">{msg.answer}</p>
              </div>
            )}
            {msg.evaluation && (
              <div className="border-l-2 border-[var(--tone-info-border)] pl-4">
                <p className="mb-1 text-xs font-semibold uppercase text-[var(--tone-info-text)]">Feedback</p>
                {msg.evaluation.score !== null && msg.evaluation.score !== undefined && (
                  <p className="mb-1 text-xs font-bold text-[var(--tone-info-text)]">
                    Overall: {msg.evaluation.score.toFixed(1)}/10
                  </p>
                )}
                <p className="text-sm text-muted">{msg.evaluation.feedback}</p>
                <RubricBreakdown evaluation={msg.evaluation} compact />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Answer Input */}
      {currentQuestion && (
        <div className="space-y-3">
          <textarea
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your answer here... (Ctrl+Enter to submit)"
            className="h-24 w-full resize-none rounded-lg p-3 text-sm"
          />
          <button
            onClick={handleSubmitAnswer}
            disabled={!userAnswer.trim() || isLoading}
            className="jf-btn jf-btn-primary w-full px-4 py-2 text-sm"
          >
            {isLoading ? "Processing..." : "Submit Answer"}
          </button>
          <p className="text-xs text-muted">Ctrl+Enter to submit</p>
        </div>
      )}
    </div>
  );
}

interface InterviewSummaryProps {
  summary: SessionSummary;
  onNewInterview?: () => void;
}

function InterviewSummary({ summary, onNewInterview }: InterviewSummaryProps) {
  const validScores = summary.steps
    .filter((step) => step.evaluation?.score !== null && step.evaluation?.score !== undefined)
    .map((step) => step.evaluation!.score as number);

  const averageScore = validScores.length > 0
    ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1)
    : "N/A";

  return (
    <div className="space-y-4">
      {/* Score Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="notice-banner notice-info p-4 text-center">
          <p className="mb-1 text-xs font-semibold uppercase">Average Score</p>
          <p className="text-2xl font-bold">{averageScore}</p>
          <p className="text-xs">out of 10</p>
        </div>
        <div className="notice-banner notice-success p-4 text-center">
          <p className="mb-1 text-xs font-semibold uppercase">Questions</p>
          <p className="text-2xl font-bold">{summary.steps.length}</p>
          <p className="text-xs">completed</p>
        </div>
      </div>

      {/* Overall Feedback */}
      {summary.overall_feedback && (
        <div className="notice-banner notice-warning rounded p-4">
          <p className="mb-2 text-xs font-semibold uppercase">Overall Feedback</p>
          <p className="text-sm text-foreground">{summary.overall_feedback}</p>
        </div>
      )}

      {/* Detailed Results */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        <p className="text-sm font-semibold text-foreground">Detailed Feedback</p>
        {summary.steps.map((step, idx) => (
          <div key={idx} className="surface rounded-lg p-3 space-y-2 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase text-[var(--tone-info-text)]">Q{idx + 1}</p>
              <p className="font-medium text-foreground">{step.question.text}</p>
            </div>
            {step.answer && (
              <div className="border-l-2 border-[var(--tone-success-border)] pl-3">
                <p className="mb-1 text-xs font-semibold uppercase text-[var(--tone-success-text)]">Your Answer</p>
                <p className="text-muted">{step.answer}</p>
              </div>
            )}
            {step.evaluation && (
              <div className="border-l-2 border-[var(--tone-info-border)] pl-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold uppercase text-[var(--tone-info-text)]">Feedback</p>
                  {step.evaluation.score !== null && step.evaluation.score !== undefined && (
                    <span className="text-xs font-bold text-[var(--tone-info-text)]">
                      {step.evaluation.score.toFixed(1)}/10
                    </span>
                  )}
                </div>
                <p className="text-muted">{step.evaluation.feedback}</p>
                <RubricBreakdown evaluation={step.evaluation} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Button */}
      <button
        onClick={onNewInterview}
        className="jf-btn jf-btn-primary w-full px-4 py-2 text-sm"
      >
        Start New Interview
      </button>
    </div>
  );
}

function RubricBreakdown({
  evaluation,
  compact = false,
}: {
  evaluation: InterviewEvaluation;
  compact?: boolean;
}) {
  const rubric = evaluation.rubric;
  const entries = [
    ["Relevance", rubric?.relevance],
    ["Clarity", rubric?.clarity],
    ["Technical", rubric?.technical_depth],
    ["Evidence", rubric?.evidence],
    ["Communication", rubric?.communication],
  ].filter(([, value]) => value !== null && value !== undefined) as Array<[string, number]>;

  if (
    entries.length === 0 &&
    (!evaluation.strengths || evaluation.strengths.length === 0) &&
    (!evaluation.improvements || evaluation.improvements.length === 0)
  ) {
    return null;
  }

  return (
    <div className={`mt-3 space-y-3 ${compact ? "text-xs" : "text-sm"}`}>
      {entries.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {entries.map(([label, value]) => (
            <div key={label} className="rounded-md bg-slate-50 border border-slate-200 p-2 text-center">
              <p className="text-[11px] font-semibold uppercase text-slate-500">{label}</p>
              <p className="text-sm font-bold text-slate-700">{value.toFixed(1)}</p>
            </div>
          ))}
        </div>
      )}
      {evaluation.strengths && evaluation.strengths.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase text-green-700 mb-1">Strengths</p>
          <ul className="list-disc list-inside text-slate-700 space-y-1">
            {evaluation.strengths.map((item, idx) => (
              <li key={`${item}-${idx}`}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {evaluation.improvements && evaluation.improvements.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase text-amber-700 mb-1">Improve Next</p>
          <ul className="list-disc list-inside text-slate-700 space-y-1">
            {evaluation.improvements.map((item, idx) => (
              <li key={`${item}-${idx}`}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
