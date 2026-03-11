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
  resumeName: string;
  roleTitle: string;
  roleLevel: string;
  onComplete?: (summary: SessionSummary) => void;
  onReset?: () => void;
}

interface Message {
  question?: string;
  answer?: string;
  evaluation?: string;
}

export default function MockInterview({
  resumeName,
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
        const response = await startInterview(resumeName, roleLevel);
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
  }, [resumeName, roleLevel]);

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
          lastMessage.evaluation = response.evaluation.feedback || `Score: ${response.evaluation.score?.toFixed(1) || "N/A"}/10`;
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
        setSummary(sessionData);
        onComplete?.(sessionData);
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
          <p className="text-slate-600">Initializing interview...</p>
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-800">
        <p className="font-semibold mb-2">Error Starting Interview</p>
        <p className="text-sm mb-4">{error}</p>
        <button
          onClick={onReset}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold"
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
          <h3 className="text-lg font-semibold text-slate-500">Interview in Progress</h3>
          <p className="text-sm font-semibold tracking-tight heading-gradient">
            {roleTitle} • {roleLevel}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={handleResetClick}
            className="px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 rounded border border-red-200 transition-colors"
          >
            Reset
          </button>
          <div className="text-right">
            <p className="text-xs text-slate-600 mb-1">
              Question {questionNumber} of 5
            </p>
            <div className="w-24 h-1.5 bg-slate-200 rounded-full">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Message History - Scrollable */}
      <div className="bg-slate-50 rounded-lg p-4 space-y-4 max-h-64 overflow-y-auto border border-slate-200">
        {messages.map((msg, idx) => (
          <div key={idx} className="space-y-2">
            {msg.question && (
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase">Question {idx + 1}</p>
                <p className="text-sm font-medium text-slate-800">{msg.question}</p>
              </div>
            )}
            {msg.answer && (
              <div className="pl-4 border-l-2 border-green-500">
                <p className="text-xs font-semibold text-green-700 uppercase mb-1">Your Answer</p>
                <p className="text-sm text-slate-700">{msg.answer}</p>
              </div>
            )}
            {msg.evaluation && (
              <div className="pl-4 border-l-2 border-blue-500">
                <p className="text-xs font-semibold text-blue-700 uppercase mb-1">Feedback</p>
                <p className="text-sm text-slate-700">{msg.evaluation}</p>
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
            className="w-full h-24 p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none resize-none text-sm"
          />
          <button
            onClick={handleSubmitAnswer}
            disabled={!userAnswer.trim() || isLoading}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isLoading ? "Processing..." : "Submit Answer"}
          </button>
          <p className="text-xs text-slate-500">Ctrl+Enter to submit</p>
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
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg text-center border border-blue-200">
          <p className="text-xs font-semibold text-blue-700 uppercase mb-1">Average Score</p>
          <p className="text-2xl font-bold text-blue-600">{averageScore}</p>
          <p className="text-xs text-blue-600">out of 10</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg text-center border border-green-200">
          <p className="text-xs font-semibold text-green-700 uppercase mb-1">Questions</p>
          <p className="text-2xl font-bold text-green-600">{summary.steps.length}</p>
          <p className="text-xs text-green-600">completed</p>
        </div>
      </div>

      {/* Overall Feedback */}
      {summary.overall_feedback && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
          <p className="text-xs font-semibold text-amber-700 uppercase mb-2">Overall Feedback</p>
          <p className="text-sm text-slate-800">{summary.overall_feedback}</p>
        </div>
      )}

      {/* Detailed Results */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        <p className="text-sm font-semibold text-slate-800">Detailed Feedback</p>
        {summary.steps.map((step, idx) => (
          <div key={idx} className="border border-slate-200 rounded-lg p-3 space-y-2 text-sm">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase">Q{idx + 1}</p>
              <p className="font-medium text-slate-800">{step.question.text}</p>
            </div>
            {step.answer && (
              <div className="pl-3 border-l-2 border-green-500">
                <p className="text-xs font-semibold text-green-700 uppercase mb-1">Your Answer</p>
                <p className="text-slate-700">{step.answer}</p>
              </div>
            )}
            {step.evaluation && (
              <div className="pl-3 border-l-2 border-blue-500">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-blue-700 uppercase">Feedback</p>
                  {step.evaluation.score !== null && step.evaluation.score !== undefined && (
                    <span className="text-xs font-bold text-blue-600">
                      {step.evaluation.score.toFixed(1)}/10
                    </span>
                  )}
                </div>
                <p className="text-slate-700">{step.evaluation.feedback}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Button */}
      <button
        onClick={onNewInterview}
        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm"
      >
        Start New Interview
      </button>
    </div>
  );
}
