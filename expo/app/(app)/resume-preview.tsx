import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";

import { AppShell } from "@/components/shell/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { compilePdfToFile } from "@/lib/api/resumeLab";
import { useResumeCompilePreview } from "@/hooks/useResumeCompilePreview";
import { useAppTheme } from "@/lib/theme";
import { getResumeLabSession } from "@/lib/storage/resumeLab";
import type { ResumeLabSession } from "@/lib/types";

export default function ResumePreviewScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [session, setSession] = React.useState<ResumeLabSession | null | undefined>(undefined);
  const [sharing, setSharing] = React.useState(false);

  React.useEffect(() => {
    getResumeLabSession().then(setSession).catch(() => setSession(null));
  }, []);

  const { previewImageUri, pageCount, currentPage, compiling, isRecompiling, goToPage } = useResumeCompilePreview({
    resumeData: session?.resumeData ?? null,
    selectedTemplate: session?.selectedTemplate ?? null,
    debounceMs: 0,
  });

  async function sharePdf() {
    if (!session?.resumeData || !session.selectedTemplate || session.selectedTemplate === "uploaded") return;
    setSharing(true);
    try {
      const fileUri = await compilePdfToFile(session.selectedTemplate, session.resumeData);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <AppShell title="Resume Preview" subtitle="Use this full-screen surface for page navigation and export actions." scroll={false}>
      {session === undefined ? <LoadingState label="Loading preview…" /> : null}

      {session === null ? (
        <EmptyState title="Nothing to preview" message="Return to Resume Lab, select a template or source file, and the preview surface will appear here." actionLabel="Back to Resume Lab" onAction={() => router.replace("/resume-lab")} />
      ) : null}

      {session?.selectedTemplate === "uploaded" && session.uploadedDocument ? (
        <View style={[styles.sourceCard, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted }]}>
          <Text style={{ color: theme.palette.foreground, fontWeight: "700", fontSize: theme.text.size(16) }}>{session.uploadedDocument.name}</Text>
          <Text style={{ color: theme.palette.muted, lineHeight: theme.text.size(20) }}>
            Source preview mode is active. Use the system share sheet to open the original file in a native document viewer.
          </Text>
          <Pressable onPress={() => void Sharing.shareAsync(session.uploadedDocument!.uri)} style={[styles.primaryButton, { backgroundColor: theme.palette.accentStrong }]}>
            <Text style={styles.primaryButtonText}>Open / Share Source File</Text>
          </Pressable>
        </View>
      ) : null}

      {session && session.selectedTemplate && session.selectedTemplate !== "uploaded" && !previewImageUri && compiling ? <LoadingState label="Compiling full-screen preview…" /> : null}

      {session && session.selectedTemplate && session.selectedTemplate !== "uploaded" && previewImageUri ? (
        <View style={styles.previewStack}>
          <View style={styles.topActions}>
            <Pressable onPress={() => router.back()} style={[styles.secondaryButton, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted }]}>
              <Text style={{ color: theme.palette.foreground, fontWeight: "700" }}>Back</Text>
            </Pressable>
            <Pressable onPress={() => void sharePdf()} style={[styles.primaryButton, { backgroundColor: theme.palette.accentStrong }]}>
              <Text style={styles.primaryButtonText}>{sharing ? "Sharing…" : "Share PDF"}</Text>
            </Pressable>
          </View>

          <View style={styles.paginationRow}>
            <Pressable onPress={() => goToPage(currentPage - 1)} disabled={currentPage === 0 || isRecompiling} style={[styles.secondaryButton, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted, opacity: currentPage === 0 || isRecompiling ? 0.6 : 1 }]}>
              <Text style={{ color: theme.palette.foreground, fontWeight: "700" }}>Prev</Text>
            </Pressable>
            <Text style={{ color: theme.palette.muted }}>
              Page {currentPage + 1} of {pageCount || 1}
            </Text>
            <Pressable
              onPress={() => goToPage(currentPage + 1)}
              disabled={currentPage >= Math.max(pageCount - 1, 0) || isRecompiling}
              style={[styles.secondaryButton, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted, opacity: currentPage >= Math.max(pageCount - 1, 0) || isRecompiling ? 0.6 : 1 }]}
            >
              <Text style={{ color: theme.palette.foreground, fontWeight: "700" }}>Next</Text>
            </Pressable>
          </View>

          <View style={[styles.imageFrame, { borderColor: theme.palette.divider, backgroundColor: "#ffffff" }]}>
            <Image source={{ uri: previewImageUri }} style={styles.previewImage} resizeMode="contain" />
          </View>
        </View>
      ) : null}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  sourceCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 12,
  },
  previewStack: {
    gap: 14,
    flex: 1,
  },
  topActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  imageFrame: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 22,
    padding: 12,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
});
