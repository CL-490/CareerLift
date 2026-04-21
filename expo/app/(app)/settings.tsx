import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppShell } from "@/components/shell/AppShell";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { getApiBase } from "@/lib/api/config";
import { useAuth } from "@/lib/auth/provider";
import { FontSizeMode, ThemeMode, useAppTheme } from "@/lib/theme";

const modes: ThemeMode[] = ["system", "dark", "light"];
const fontSizes: FontSizeMode[] = ["sm", "md", "lg"];

export default function SettingsScreen() {
  const { mode, setMode, fontSize, setFontSize, theme } = useAppTheme();
  const { session, signOut } = useAuth();

  return (
    <AppShell title="Settings" subtitle="Phase 1 includes theme control, environment visibility, and the same polished shell used throughout the mobile app.">
      <Card delay={10}>
        <SectionTitle
          eyebrow="Account"
          title="Signed in on mobile"
          subtitle="This Expo shell now uses the same FastAPI-backed identity model as the web app."
        />
        <View
          style={[
            styles.accountPanel,
            {
              borderColor: theme.palette.divider,
              backgroundColor: theme.palette.surfaceMuted,
            },
          ]}
        >
          <View style={styles.subscriptionCopy}>
            <Text style={{ color: theme.palette.foreground, fontWeight: "700" }}>{session?.user.name || "CareerLift User"}</Text>
            <Text style={{ color: theme.palette.muted }}>{session?.user.email || "No email available"}</Text>
          </View>
          <Pressable onPress={() => void signOut()} style={[styles.signOutButton, { backgroundColor: `${theme.palette.danger}18` }]}>
            <Text style={{ color: theme.palette.danger, fontWeight: "700" }}>Sign Out</Text>
          </Pressable>
        </View>
      </Card>

      <Card delay={40}>
        <SectionTitle
          eyebrow="Appearance"
          title="Theme mode"
          subtitle="Switch between system, dark, and light themes to validate the new mobile token system."
        />
        <View
          style={[
            styles.segmentedShell,
            {
              backgroundColor: theme.palette.surfaceMuted,
              borderColor: theme.palette.divider,
            },
          ]}
        >
          {modes.map((candidate) => {
            const active = mode === candidate;
            return (
              <Pressable
                key={candidate}
                onPress={() => void setMode(candidate)}
                style={[
                  styles.segmentedOption,
                  {
                    backgroundColor: active ? theme.palette.surfaceStrong : "transparent",
                    borderColor: active ? theme.palette.divider : "transparent",
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  style={{
                    color: active ? theme.palette.foreground : theme.palette.muted,
                    fontWeight: active ? "700" : "600",
                  }}
                >
                  {candidate[0].toUpperCase() + candidate.slice(1)}
                </Text>
                {active ? <View style={[styles.activeAccent, { backgroundColor: theme.palette.accent }]} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card delay={75}>
        <SectionTitle
          eyebrow="Typography"
          title="Base font size"
          subtitle="Scale the app’s dashboard and shell text for smaller or larger reading comfort."
        />
        <View
          style={[
            styles.segmentedShell,
            {
              backgroundColor: theme.palette.surfaceMuted,
              borderColor: theme.palette.divider,
            },
          ]}
        >
          {fontSizes.map((candidate) => {
            const active = fontSize === candidate;
            return (
              <Pressable
                key={candidate}
                onPress={() => void setFontSize(candidate)}
                style={[
                  styles.segmentedOption,
                  {
                    backgroundColor: active ? theme.palette.surfaceStrong : "transparent",
                    borderColor: active ? theme.palette.divider : "transparent",
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  style={{
                    color: active ? theme.palette.foreground : theme.palette.muted,
                    fontWeight: active ? "700" : "600",
                  }}
                >
                  {candidate === "sm" ? "Small" : candidate === "md" ? "Medium" : "Large"}
                </Text>
                {active ? <View style={[styles.activeAccent, { backgroundColor: theme.palette.accent }]} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card delay={110}>
        <SectionTitle
          eyebrow="Environment"
          title="Backend target"
          subtitle="This mobile shell is already pointing at the existing FastAPI backend through a single config source."
        />
        <View
          style={[
            styles.infoPanel,
            {
              borderColor: theme.palette.divider,
              backgroundColor: theme.palette.surfaceMuted,
            },
          ]}
        >
          <Text style={{ color: theme.palette.foreground, fontWeight: "600" }}>{getApiBase()}</Text>
          <Text style={{ color: theme.palette.muted, marginTop: 6, lineHeight: 20 }}>
            Set `EXPO_PUBLIC_API_URL` to override this automatically detected address for physical devices or shared environments.
          </Text>
        </View>
      </Card>

      <Card delay={145}>
        <SectionTitle
          eyebrow="Subscription"
          title="Manage Subscription"
          subtitle="We’re still building billing and plan management on mobile, but this section is framed to match the web app’s intent."
        />
        <View
          style={[
            styles.subscriptionPanel,
            {
              borderColor: theme.palette.divider,
              backgroundColor: theme.palette.surfaceMuted,
            },
          ]}
        >
          <View style={styles.subscriptionCopy}>
            <Text style={{ color: theme.palette.foreground, fontWeight: "600" }}>Coming soon</Text>
            <Text style={{ color: theme.palette.muted, lineHeight: 20 }}>
              When billing lands, you’ll be able to change plans, update payment details, and review invoices here.
            </Text>
            <Text style={{ color: theme.palette.muted, lineHeight: 20 }}>Free / Pro plan changes</Text>
            <Text style={{ color: theme.palette.muted, lineHeight: 20 }}>Payment method management</Text>
            <Text style={{ color: theme.palette.muted, lineHeight: 20 }}>Invoice history</Text>
          </View>
          <View style={[styles.upgradeChip, { backgroundColor: theme.palette.accentSoft }]}>
            <Text style={{ color: theme.palette.accent, fontWeight: "700" }}>Upgrade to Pro</Text>
          </View>
        </View>
      </Card>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  segmentedShell: {
    flexDirection: "row",
    gap: 8,
    borderRadius: 22,
    padding: 6,
    borderWidth: 1,
  },
  segmentedOption: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  activeAccent: {
    width: 20,
    height: 3,
    borderRadius: 999,
  },
  infoPanel: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  subscriptionPanel: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  accountPanel: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  subscriptionCopy: {
    gap: 8,
  },
  upgradeChip: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    opacity: 0.7,
  },
  signOutButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
