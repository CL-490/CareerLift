import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

import { AppShell } from "@/components/shell/AppShell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { loadApplications, removeApplication, updateApplicationStatus } from "@/lib/storage/applications";
import { useAppTheme } from "@/lib/theme";
import type { ApplicationStatus, SavedApplication } from "@/lib/types";

type Tab = "All" | ApplicationStatus;

const STATUS_OPTIONS: ApplicationStatus[] = ["Applied", "Interview", "Offer", "Rejected"];
const TABS: Tab[] = ["All", ...STATUS_OPTIONS];

export default function ApplicationsScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [activeTab, setActiveTab] = React.useState<Tab>("All");
  const [applications, setApplications] = React.useState<SavedApplication[]>([]);

  const refresh = React.useCallback(async () => {
    const next = await loadApplications();
    setApplications(next);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const filteredApplications =
    activeTab === "All" ? applications : applications.filter((application) => application.status === activeTab);

  const counts = Object.fromEntries(
    TABS.map((tab) => [
      tab,
      tab === "All" ? applications.length : applications.filter((application) => application.status === tab).length,
    ])
  ) as Partial<Record<Tab, number>>;

  async function handleUpdateStatus(id: string, status: ApplicationStatus) {
    await updateApplicationStatus(id, status);
    await refresh();
  }

  async function handleRemove(id: string) {
    await removeApplication(id);
    await refresh();
  }

  return (
    <AppShell title="Applications" subtitle="Track every application milestone from the same mobile-local pipeline used across the app.">
      <SegmentedTabs tabs={TABS} value={activeTab} onChange={setActiveTab} counts={counts} />

      {applications.length === 0 ? (
        <EmptyState
          title="No saved applications yet"
          message="Hit Save to Applications on any job listing to start tracking your pipeline here."
          actionLabel="Open Job Finder"
          onAction={() => router.push("/job-finder")}
        />
      ) : filteredApplications.length === 0 ? (
        <EmptyState
          title={`No ${activeTab} applications`}
          message={`Update an application's status to ${activeTab} to see it in this filtered view.`}
        />
      ) : (
        <View style={styles.listGap}>
          {filteredApplications.map((application, index) => (
            <Card key={application.id} delay={index * 25}>
              <View style={styles.headerRow}>
                <View style={styles.copy}>
                  <Text style={{ color: theme.palette.foreground, fontWeight: "700", fontSize: theme.text.size(17) }}>{application.title}</Text>
                  <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(13), lineHeight: theme.text.size(20) }}>
                    {application.company} · {application.source} · Applied {application.dateApplied}
                  </Text>
                  {application.salary ? (
                    <Text style={{ color: theme.palette.success, fontSize: theme.text.size(12), fontWeight: "600" }}>{application.salary}</Text>
                  ) : null}
                </View>
                <Pressable onPress={() => void handleRemove(application.id)}>
                  <Text style={{ color: theme.palette.danger, fontSize: theme.text.size(12), fontWeight: "600" }}>Remove</Text>
                </Pressable>
              </View>

              <View style={styles.actionsRow}>
                {application.url ? (
                  <Pressable onPress={() => void Linking.openURL(application.url!)} style={[styles.linkChip, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted }]}>
                    <Text style={{ color: theme.palette.accent, fontWeight: "700", fontSize: theme.text.size(12) }}>View Posting</Text>
                  </Pressable>
                ) : null}

                <View style={styles.statusRow}>
                  {STATUS_OPTIONS.map((status) => {
                    const active = application.status === status;
                    const tone =
                      status === "Offer"
                        ? theme.palette.success
                        : status === "Rejected"
                          ? theme.palette.danger
                          : status === "Interview"
                            ? theme.palette.warning
                            : theme.palette.accentStrong;

                    return (
                      <Pressable
                        key={status}
                        onPress={() => void handleUpdateStatus(application.id, status)}
                        style={[
                          styles.statusPill,
                          {
                            borderColor: active ? tone : theme.palette.divider,
                            backgroundColor: active ? `${tone}22` : theme.palette.surfaceMuted,
                          },
                        ]}
                      >
                        <Text style={{ color: active ? tone : theme.palette.muted, fontWeight: "700", fontSize: theme.text.size(11) }}>{status}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  listGap: {
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 5,
  },
  actionsRow: {
    gap: 12,
  },
  linkChip: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
