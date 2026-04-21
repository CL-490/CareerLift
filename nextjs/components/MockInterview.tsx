"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import {
  startInterview,
  submitInterviewAnswer,
  getInterviewSession,
  InterviewResponse,
  SessionSummary,
  InterviewQuestion,
  InterviewEvaluation,
} from "@/lib/interviewApi";
import { getApiBase } from "@/lib/jobFinderApi";
import { apiFetch } from "@/lib/apiClient";

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

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
  const [voiceSupport, setVoiceSupport] = useState({ input: false, output: true });
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const baseAnswerRef = useRef<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const speakTokenRef = useRef<number>(0);
  const audioCacheRef = useRef<Map<string, Promise<Blob>>>(new Map());

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    setVoiceSupport((prev) => ({
      ...prev,
      input: "SpeechRecognition" in window || "webkitSpeechRecognition" in window,
    }));
  }, []);

  const stopAudio = () => {
    const audio = audioRef.current;
    if (audio) {
      try {
        audio.pause();
      } catch {
        /* noop */
      }
      audio.removeAttribute("src");
      audio.load();
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setIsSpeaking(false);
  };

  // Synchronously attempt to unlock the persistent <audio> element within a
  // user gesture. The first gesture-attached play() call is what lets later
  // async play() calls bypass autoplay policy.
  const unlockAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const p = audio.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
    audio.pause();
  };

  const fetchAudioBlob = (text: string): Promise<Blob> => {
    const cached = audioCacheRef.current.get(text);
    if (cached) return cached;
    const promise = (async () => {
      const base = getApiBase();
      const res = await apiFetch(`${base}/api/tts/speak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, format: "mp3" }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${body.slice(0, 120)}`);
      }
      return res.blob();
    })();
    audioCacheRef.current.set(text, promise);
    // Evict on failure so a future attempt can retry.
    promise.catch(() => audioCacheRef.current.delete(text));
    return promise;
  };

  const speakText = async (text: string, opts: { userInitiated?: boolean } = {}) => {
    if (!text) return;
    const token = ++speakTokenRef.current;
    try {
      const blob = await fetchAudioBlob(text);
      if (token !== speakTokenRef.current) return;
      const audio = audioRef.current;
      if (!audio) return;
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
      audio.onplay = () => {
        if (token === speakTokenRef.current) setIsSpeaking(true);
      };
      audio.onended = () => {
        if (token === speakTokenRef.current) setIsSpeaking(false);
      };
      audio.onerror = () => {
        if (token === speakTokenRef.current) setIsSpeaking(false);
      };
      audio.src = url;
      try {
        await audio.play();
      } catch (playErr: any) {
        if (playErr?.name === "NotAllowedError") {
          if (opts.userInitiated) {
            // Re-throw so the outer catch surfaces a message; shouldn't happen
            // if the caller unlocked during its gesture.
            throw playErr;
          }
          // Silent auto-speak was blocked — leave the Hear button visible so
          // the user can trigger it manually. No error banner.
          return;
        }
        throw playErr;
      }
    } catch (err) {
      if (token !== speakTokenRef.current) return;
      setIsSpeaking(false);
      const msg = err instanceof Error ? err.message : "unknown error";
      setVoiceError(
        opts.userInitiated
          ? `Voice playback failed: ${msg}. Check that the Kokoro TTS service is running.`
          : `Voice playback unavailable: ${msg}`,
      );
    }
  };

  const handleReplayQuestion = () => {
    if (!currentQuestion) return;
    setVoiceError(null);
    setVoiceSupport((prev) => ({ ...prev, output: true }));
    setIsMuted(false);
    unlockAudio();
    speakText(currentQuestion, { userInitiated: true });
  };

  // Prefetch audio as soon as a new question arrives, regardless of mute state.
  // By the time the user clicks Hear (or auto-speak fires), the blob is usually
  // already in cache, so playback starts within the gesture window.
  useEffect(() => {
    if (!currentQuestion) return;
    fetchAudioBlob(currentQuestion).catch(() => {
      /* surfaced later by speakText if the user tries to play */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion]);

  useEffect(() => {
    if (!currentQuestion || !voiceSupport.output || isMuted) return;
    speakText(currentQuestion);
    return () => {
      stopAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion, isMuted, voiceSupport.output]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort?.();
      stopAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim() || !sessionId) return;

    recognitionRef.current?.stop?.();

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
        const summary = response.summary ?? { steps: [] };
        setSummary(summary);
        onComplete?.(summary);
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
      recognitionRef.current?.abort?.();
      stopAudio();
      onReset?.();
    }
  };

  const handleToggleRecording = () => {
    if (!voiceSupport.input) return;
    if (isRecording) {
      recognitionRef.current?.stop?.();
      return;
    }
    setVoiceError(null);
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = (typeof navigator !== "undefined" && navigator.language) || "en-US";
    baseAnswerRef.current = userAnswer;
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = (event: any) => {
      setIsRecording(false);
      const code = event?.error;
      if (code === "not-allowed" || code === "service-not-allowed") {
        setVoiceError("Microphone permission denied — you can still type your answer.");
      } else if (code === "network") {
        setVoiceError(
          "Voice input needs internet access to the browser's speech service, which isn't reachable right now. " +
          "Check your connection / VPN / firewall, or type your answer instead."
        );
      } else if (code === "audio-capture") {
        setVoiceError("No microphone was detected. Plug in a mic or type your answer instead.");
      } else if (code === "language-not-supported") {
        setVoiceError("Your browser language isn't supported for voice input. Type your answer instead.");
      } else if (code && code !== "aborted" && code !== "no-speech") {
        setVoiceError(`Voice input error: ${code}. You can still type your answer.`);
      }
    };
    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript;
        else interimText += transcript;
      }
      const combined = `${baseAnswerRef.current} ${finalText} ${interimText}`.replace(/\s+/g, " ").trim();
      setUserAnswer(combined);
      if (finalText) baseAnswerRef.current = `${baseAnswerRef.current} ${finalText}`.replace(/\s+/g, " ").trim();
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next) stopAudio();
      return next;
    });
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
      <audio ref={audioRef} hidden preload="auto" />
      {/* Header with Progress */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-muted">Interview in Progress</h3>
          <p className="text-sm font-semibold tracking-tight heading-gradient">
            {roleTitle} • {roleLevel}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {voiceSupport.output && currentQuestion && (
              <button
                onClick={handleReplayQuestion}
                title="Hear question aloud"
                aria-label="Hear question aloud"
                className="surface rounded px-3 py-1 text-xs font-semibold transition-colors hover:opacity-85"
              >
                <span>▶ Hear</span>
                {isSpeaking && (
                  <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" />
                )}
              </button>
            )}
            {voiceSupport.output && (
              <button
                onClick={handleToggleMute}
                title={isMuted ? "Unmute AI voice (auto-speak next question)" : "Mute AI voice (stop auto-speak)"}
                aria-label={isMuted ? "Unmute AI voice" : "Mute AI voice"}
                className="surface rounded px-3 py-1 text-xs font-semibold transition-colors hover:opacity-85"
              >
                <span>{isMuted ? "🔇" : "🔊"}</span>
              </button>
            )}
            <button
              onClick={handleResetClick}
              className="notice-error rounded px-3 py-1 text-xs font-semibold transition-colors hover:opacity-85"
            >
              Reset
            </button>
          </div>
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
      <div className="mock-transcript rounded-lg p-4 space-y-4 max-h-64 overflow-y-auto">
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
              <div className="mock-coach rounded-lg border-l-2 border-[var(--tone-info-border)] px-4 py-3">
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
          {voiceError && (
            <div className="notice-banner notice-warning flex items-start justify-between gap-3 rounded p-2 text-xs">
              <span>{voiceError}</span>
              <button
                onClick={() => setVoiceError(null)}
                aria-label="Dismiss voice error"
                className="font-semibold hover:opacity-70"
              >
                ×
              </button>
            </div>
          )}
          <textarea
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              voiceSupport.input
                ? "Type your answer, or click 🎤 to speak... (Ctrl+Enter to submit)"
                : "Type your answer here... (Ctrl+Enter to submit)"
            }
            className="mock-transcript h-24 w-full resize-none rounded-lg p-3 text-sm"
          />
          <div className="flex gap-2">
            {voiceSupport.input && (
              <button
                onClick={handleToggleRecording}
                disabled={isLoading}
                title={isRecording ? "Stop voice input" : "Start voice input"}
                aria-label={isRecording ? "Stop voice input" : "Start voice input"}
                aria-pressed={isRecording}
                className={`${
                  isRecording ? "notice-error" : "mock-transcript"
                } rounded px-4 py-2 text-sm font-semibold transition-colors hover:opacity-85 disabled:opacity-50`}
              >
                {isRecording ? "⏺ Stop" : "🎤 Speak"}
              </button>
            )}
            <button
              onClick={handleSubmitAnswer}
              disabled={!userAnswer.trim() || isLoading}
              className="jf-btn jf-btn-primary flex-1 px-4 py-2 text-sm"
            >
              {isLoading ? "Processing..." : "Submit Answer"}
            </button>
          </div>
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
        <div className="mock-coach rounded-xl p-4 text-center">
          <p className="mb-1 text-xs font-semibold uppercase">Average Score</p>
          <p className="text-2xl font-bold">{averageScore}</p>
          <p className="text-xs">out of 10</p>
        </div>
        <div className="mock-ready rounded-xl p-4 text-center">
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
          <div key={idx} className="mock-transcript rounded-lg p-3 space-y-2 text-sm">
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
              <div className="mock-coach rounded-lg border-l-2 border-[var(--tone-info-border)] px-3 py-3">
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
            <div key={label} className="mock-transcript rounded-md p-2 text-center">
              <p className="text-[11px] font-semibold uppercase text-muted">{label}</p>
              <p className="text-sm font-bold text-foreground">{value.toFixed(1)}</p>
            </div>
          ))}
        </div>
      )}
      {evaluation.strengths && evaluation.strengths.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase text-[var(--tone-success-text)] mb-1">Strengths</p>
          <ul className="list-disc list-inside text-foreground space-y-1">
            {evaluation.strengths.map((item, idx) => (
              <li key={`${item}-${idx}`}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {evaluation.improvements && evaluation.improvements.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase text-[var(--tone-warning-text)] mb-1">Improve Next</p>
          <ul className="list-disc list-inside text-foreground space-y-1">
            {evaluation.improvements.map((item, idx) => (
              <li key={`${item}-${idx}`}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
