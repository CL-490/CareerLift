import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { AppShell } from "@/components/shell/AppShell";
import { InterviewSummaryCard } from "@/components/coach-center/InterviewSummaryCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { getInterviewSession, startInterview, submitInterviewAnswer } from "@/lib/api/interview";
import { useAppTheme } from "@/lib/theme";
import type { InterviewEvaluation, SessionSummary } from "@/lib/types";

type Message = {
  question?: string;
  answer?: string;
  evaluation?: InterviewEvaluation;
};

export default function CoachInterviewScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    resumeId?: string;
    resumeName?: string;
    jobApplyUrl?: string;
    roleTitle?: string;
    roleLevel?: string;
  }>();

  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [currentQuestion, setCurrentQuestion] = React.useState<string | null>(null);
  const [userAnswer, setUserAnswer] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isInitializing, setIsInitializing] = React.useState(true);
  const [summary, setSummary] = React.useState<SessionSummary | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function initialize() {
      if (!params.resumeId || !params.jobApplyUrl || !params.roleLevel) {
        setError("Missing interview context.");
        setIsInitializing(false);
        return;
      }

      try {
        setIsInitializing(true);
        const response = await startInterview(params.resumeId, params.jobApplyUrl, params.roleLevel);
        setSessionId(response.session_id || null);
        if (response.next_question) {
          setCurrentQuestion(response.next_question.text);
          setMessages([{ question: response.next_question.text }]);
        }
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Failed to start interview");
      } finally {
        setIsInitializing(false);
      }
    }

    void initialize();
  }, [params.jobApplyUrl, params.resumeId, params.roleLevel]);

  async function handleSubmitAnswer() {
    if (!userAnswer.trim() || !sessionId) return;

    try {
      setIsLoading(true);
      const response = await submitInterviewAnswer(sessionId, userAnswer);

      setMessages((previous) => {
        const updated = [...previous];
        const last = updated[updated.length - 1];
        last.answer = userAnswer;
        if (response.evaluation) {
          last.evaluation = response.evaluation;
        }
        if (response.next_question) {
          updated.push({ question: response.next_question.text });
        }
        return updated;
      });

      setUserAnswer("");

      if (response.session_complete) {
        const sessionData = await getInterviewSession(sessionId);
        setSummary(sessionData.summary ?? { steps: [] });
      } else if (response.next_question) {
        setCurrentQuestion(response.next_question.text);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to submit answer");
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    Alert.alert("Reset interview?", "Your progress will be lost.", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: () => router.replace("/coach-center") },
    ]);
  }

  if (isInitializing) {
    return (
      <AppShell title="Mock Interview" subtitle="Initializing interview…" scroll={false}>
        <LoadingState label="Initializing interview…" />
      </AppShell>
    );
  }

  if (error && !summary) {
    return (
      <AppShell title="Mock Interview" subtitle="Unable to start interview" scroll={false}>
        <View style={[styles.notice, { borderColor: `${theme.palette.danger}55`, backgroundColor: `${theme.palette.danger}16` }]}>
          <Text style={{ color: theme.palette.danger, fontWeight: "700" }}>Error Starting Interview</Text>
          <Text style={{ color: theme.palette.foreground }}>{error}</Text>
          <Pressable onPress={() => router.replace("/coach-center")}>
            <Text style={{ color: theme.palette.accentStrong, fontWeight: "700" }}>Go Back</Text>
          </Pressable>
        </View>
      </AppShell>
    );
  }

  if (summary) {
    return (
      <AppShell title="Interview Summary" subtitle={`${params.roleTitle || "Role"} • ${params.roleLevel || ""}`}>
        <InterviewSummaryCard summary={summary} onNewInterview={() => router.replace("/coach-center")} />
      </AppShell>
    );
  }

  const questionNumber = messages.length;
  const progress = (questionNumber / 5) * 100;

  return (
    <AppShell title="Mock Interview" subtitle={`${params.roleTitle || "Role"} • ${params.roleLevel || ""}`}>
      <View style={styles.headerRow}>
        <View>
          <Text style={{ color: theme.palette.foreground, fontWeight: "700", fontSize: theme.text.size(18) }}>Interview in Progress</Text>
          <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(13) }}>Question {questionNumber} of 5</Text>
        </View>
        <Pressable onPress={handleReset}>
          <Text style={{ color: theme.palette.danger, fontWeight: "700" }}>Reset</Text>
        </Pressable>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: theme.palette.surfaceStrong }]}>
        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: theme.palette.accentStrong }]} />
      </View>

      <ScrollView style={[styles.history, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted }]} nestedScrollEnabled>
        <View style={styles.historyGap}>
          {messages.map((message, index) => (
            <View key={index} style={styles.historyBlock}>
              {message.question ? (
                <View style={styles.messageGap}>
                  <Text style={{ color: theme.palette.accentStrong, fontWeight: "700", fontSize: theme.text.size(11) }}>{`QUESTION ${index + 1}`}</Text>
                  <Text style={{ color: theme.palette.foreground, fontWeight: "700", lineHeight: theme.text.size(20) }}>{message.question}</Text>
                </View>
              ) : null}
              {message.answer ? (
                <View style={styles.messageGap}>
                  <Text style={{ color: theme.palette.success, fontWeight: "700", fontSize: theme.text.size(11) }}>YOUR ANSWER</Text>
                  <Text style={{ color: theme.palette.foreground, lineHeight: theme.text.size(20) }}>{message.answer}</Text>
                </View>
              ) : null}
              {message.evaluation ? (
                <View style={styles.messageGap}>
                  <Text style={{ color: theme.palette.warning, fontWeight: "700", fontSize: theme.text.size(11) }}>FEEDBACK</Text>
                  {message.evaluation.score !== null && message.evaluation.score !== undefined ? (
                    <Text style={{ color: theme.palette.accentStrong, fontWeight: "800" }}>{message.evaluation.score.toFixed(1)}/10</Text>
                  ) : null}
                  <Text style={{ color: theme.palette.foreground, lineHeight: theme.text.size(20) }}>{message.evaluation.feedback}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>

      {currentQuestion ? (
        <View style={styles.answerBox}>
          <TextInput
            value={userAnswer}
            onChangeText={setUserAnswer}
            placeholder="Type your answer here…"
            placeholderTextColor={theme.palette.muted}
            multiline
            style={[
              styles.textarea,
              {
                color: theme.palette.foreground,
                borderColor: theme.palette.divider,
                backgroundColor: theme.palette.surfaceMuted,
              },
            ]}
          />
          <Pressable
            onPress={() => void handleSubmitAnswer()}
            disabled={!userAnswer.trim() || isLoading}
            style={[
              styles.primaryButton,
              {
                backgroundColor: !userAnswer.trim() || isLoading ? theme.palette.surfaceStrong : theme.palette.accentStrong,
                opacity: !userAnswer.trim() || isLoading ? 0.65 : 1,
              },
            ]}
          >
            <Text style={styles.primaryText}>{isLoading ? "Processing…" : "Submit Answer"}</Text>
          </Pressable>
        </View>
      ) : null}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  notice: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  history: {
    maxHeight: 320,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  historyGap: {
    gap: 14,
  },
  historyBlock: {
    gap: 10,
  },
  messageGap: {
    gap: 4,
  },
  answerBox: {
    gap: 12,
  },
  textarea: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    textAlignVertical: "top",
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
});
