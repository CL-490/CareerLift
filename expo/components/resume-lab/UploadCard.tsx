import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { useAppTheme } from "@/lib/theme";
import type { UploadedDocument } from "@/lib/types";

type Props = {
  file: UploadedDocument | null;
  uploading: boolean;
  error: string | null;
  personNameInput: string;
  resumeNameInput: string;
  onPersonNameChange: (value: string) => void;
  onResumeNameChange: (value: string) => void;
  onPickDocument: () => void;
  onUpload: () => void;
  onClearResume?: () => void;
  hasResult: boolean;
};

export function UploadCard({
  file,
  uploading,
  error,
  personNameInput,
  resumeNameInput,
  onPersonNameChange,
  onResumeNameChange,
  onPickDocument,
  onUpload,
  onClearResume,
  hasResult,
}: Props) {
  const { theme } = useAppTheme();
  const isDisabled = !file || uploading;

  return (
    <Card delay={30}>
      <View style={styles.headerRow}>
        <View style={styles.titleStack}>
          <Text style={{ color: theme.palette.foreground, fontSize: theme.text.size(18), fontWeight: "700" }}>Upload Resume</Text>
          <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(13), lineHeight: theme.text.size(20) }}>
            Import a resume, extract structured career data, and keep the full editing and preview workflow in one mobile surface.
          </Text>
        </View>
        {hasResult && onClearResume ? (
          <Pressable onPress={onClearResume}>
            <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(12), textDecorationLine: "underline" }}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable
        onPress={onPickDocument}
        style={[
          styles.dropzone,
          {
            borderColor: theme.palette.divider,
            backgroundColor: theme.palette.surfaceMuted,
          },
        ]}
      >
        <Text style={{ color: theme.palette.accent, fontSize: theme.text.size(14), fontWeight: "700" }}>Pick resume file</Text>
        <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(13), textAlign: "center", lineHeight: theme.text.size(20) }}>
          Supported formats: TXT, MD, PDF, DOC, DOCX
        </Text>
        {file ? (
          <View
            style={[
              styles.fileChip,
              {
                borderColor: theme.palette.divider,
                backgroundColor: theme.palette.surface,
              },
            ]}
          >
            <Text style={{ color: theme.palette.foreground, fontWeight: "600" }} numberOfLines={1}>
              {file.name}
            </Text>
            <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(12) }}>{file.isPdf ? "PDF ready for source preview" : "Ready to process"}</Text>
          </View>
        ) : null}
      </Pressable>

      <View style={styles.inputStack}>
        <TextInput
          value={personNameInput}
          onChangeText={onPersonNameChange}
          placeholder="Person name (optional)"
          placeholderTextColor={theme.palette.muted}
          style={[
            styles.input,
            {
              color: theme.palette.foreground,
              backgroundColor: theme.palette.surfaceMuted,
              borderColor: theme.palette.divider,
            },
          ]}
        />
        <TextInput
          value={resumeNameInput}
          onChangeText={onResumeNameChange}
          placeholder="Resume name"
          placeholderTextColor={theme.palette.muted}
          style={[
            styles.input,
            {
              color: theme.palette.foreground,
              backgroundColor: theme.palette.surfaceMuted,
              borderColor: theme.palette.divider,
            },
          ]}
        />
      </View>

      {error ? (
        <View
          style={[
            styles.errorPanel,
            {
              borderColor: theme.palette.danger,
              backgroundColor: theme.isDark ? "rgba(248,113,113,0.12)" : "rgba(220,38,38,0.08)",
            },
          ]}
        >
          <Text style={{ color: theme.palette.danger, lineHeight: theme.text.size(20) }}>{error}</Text>
        </View>
      ) : null}

      <Pressable
        onPress={onUpload}
        disabled={isDisabled}
        style={[
          styles.primaryButton,
          {
            backgroundColor: isDisabled ? (theme.isDark ? "rgba(255,255,255,0.05)" : "rgba(109, 70, 214, 0.08)") : theme.palette.accentStrong,
            borderColor: isDisabled ? (theme.isDark ? "rgba(255,255,255,0.07)" : "rgba(109, 70, 214, 0.14)") : theme.palette.accentStrong,
            opacity: 1,
          },
        ]}
      >
        <Text
          style={{
            color: isDisabled ? (theme.isDark ? "rgba(243, 239, 255, 0.62)" : "rgba(95, 71, 153, 0.78)") : "#ffffff",
            fontWeight: "700",
            fontSize: theme.text.size(14),
          }}
        >
          {uploading ? "Processing resume…" : "Process Resume"}
        </Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  titleStack: {
    flex: 1,
    gap: 6,
  },
  dropzone: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 22,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  fileChip: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  inputStack: {
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 18,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  errorPanel: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
