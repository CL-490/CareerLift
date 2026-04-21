import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DrawerContentComponentProps } from "@react-navigation/drawer";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { useAuth } from "@/lib/auth/provider";
import { useAppTheme } from "@/lib/theme";

const iconMap: Record<string, keyof typeof Feather.glyphMap> = {
  index: "home",
  "resume-lab": "file-text",
  "job-finder": "briefcase",
  applications: "folder",
  "coach-center": "target",
  settings: "settings",
};

const labelMap: Record<string, string> = {
  index: "Dashboard",
  "resume-lab": "Resume Lab",
  "job-finder": "Job Finder",
  applications: "Applications",
  "coach-center": "Coach Center",
  settings: "Settings",
};

export function AppDrawerContent({ state, navigation }: DrawerContentComponentProps) {
  const { theme } = useAppTheme();
  const { session, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[theme.palette.drawerStart, theme.palette.drawerEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView
        style={{
          ...styles.safeArea,
          paddingHorizontal: 20,
          paddingTop: Math.max(18, insets.top + 8),
          paddingBottom: Math.max(18, insets.bottom + 12),
        }}
        edges={["top", "bottom", "left"]}
      >
        <View style={styles.brandBlock}>
          <BrandWordmark subtitle="Native command center" compact />
          <View
            style={[
              styles.accountCard,
              {
                borderColor: theme.palette.divider,
                backgroundColor: theme.palette.surfaceMuted,
              },
            ]}
          >
            <Text style={{ color: theme.palette.foreground, fontWeight: "700" }}>{session?.user.name || "Signed in"}</Text>
            <Text style={{ color: theme.palette.muted, fontSize: 12 }}>{session?.user.email}</Text>
          </View>
        </View>

        <View style={styles.menuList}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const icon = iconMap[route.name] ?? "circle";

            return (
              <Pressable
                key={route.key}
                onPress={() => navigation.navigate(route.name)}
                style={[
                  styles.menuItem,
                  {
                    backgroundColor: focused ? theme.palette.surfaceStrong : "rgba(255,255,255,0.015)",
                    borderColor: focused ? theme.palette.divider : "transparent",
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor: focused ? theme.palette.accentSoft : "rgba(255,255,255,0.035)",
                    },
                  ]}
                >
                  <Feather name={icon} size={17} color={focused ? theme.palette.accent : theme.palette.muted} />
                </View>
                <View style={styles.menuTextWrap}>
                  <Text style={{ color: focused ? theme.palette.foreground : theme.palette.muted, fontSize: 15, fontWeight: focused ? "700" : "500" }}>
                    {labelMap[route.name] ?? route.name}
                  </Text>
                </View>
                {focused ? <View style={[styles.activeDot, { backgroundColor: theme.palette.accent }]} /> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.signOutWrap}>
          <Pressable
            onPress={() => void signOut()}
            style={[
              styles.signOutButton,
              {
                borderColor: theme.palette.divider,
                backgroundColor: theme.palette.surface,
              },
            ]}
          >
            <Text style={{ color: theme.palette.danger, fontWeight: "700" }}>Sign Out</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  brandBlock: {
    gap: 6,
    paddingBottom: 26,
  },
  brandChip: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  accountCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 3,
  },
  menuList: {
    gap: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTextWrap: {
    flex: 1,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  signOutWrap: {
    marginTop: "auto",
    paddingTop: 18,
    paddingBottom: 10,
  },
  signOutButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
});
