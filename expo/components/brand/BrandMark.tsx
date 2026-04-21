import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useAppTheme } from "@/lib/theme";

export function BrandMark({ size = 56 }: { size?: number }) {
  const { theme } = useAppTheme();
  const shellRadius = Math.round(size * 0.34);
  const glowSize = size * 0.72;
  const ribbonWidth = size * 0.88;
  const ribbonHeight = size * 0.2;

  return (
    <LinearGradient
      colors={theme.isDark ? ["#2a123f", "#4b1f73", "#a46dff"] : ["#f3ebff", "#dbc8ff", "#b68cff"]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.95, y: 1 }}
      style={[
        styles.shell,
        {
          width: size,
          height: size,
          borderRadius: shellRadius,
          shadowColor: theme.palette.shadow,
          borderColor: theme.isDark ? "rgba(237, 224, 255, 0.16)" : "rgba(94, 53, 177, 0.12)",
        },
      ]}
    >
      <View
        style={[
          styles.glow,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            backgroundColor: theme.isDark ? "rgba(255, 244, 255, 0.24)" : "rgba(255, 255, 255, 0.92)",
            top: size * 0.1,
            left: size * 0.08,
          },
        ]}
      />
      <View
        style={[
          styles.ribbon,
          styles.ribbonPrimary,
          {
            width: ribbonWidth,
            height: ribbonHeight,
            borderRadius: ribbonHeight / 2,
            backgroundColor: theme.isDark ? "rgba(245, 234, 255, 0.92)" : "rgba(91, 43, 165, 0.82)",
            top: size * 0.28,
            left: size * 0.1,
          },
        ]}
      />
      <View
        style={[
          styles.ribbon,
          styles.ribbonSecondary,
          {
            width: ribbonWidth * 0.82,
            height: ribbonHeight * 0.88,
            borderRadius: (ribbonHeight * 0.88) / 2,
            backgroundColor: theme.isDark ? "rgba(214, 187, 255, 0.58)" : "rgba(255, 255, 255, 0.7)",
            top: size * 0.5,
            left: size * 0.18,
          },
        ]}
      />
      <View
        style={[
          styles.core,
          {
            width: size * 0.28,
            height: size * 0.28,
            borderRadius: size * 0.14,
            backgroundColor: theme.isDark ? "rgba(255, 250, 255, 0.88)" : "rgba(255, 255, 255, 0.96)",
            shadowColor: theme.isDark ? "rgba(255,255,255,0.3)" : "rgba(123, 74, 181, 0.18)",
          },
        ]}
      >
        <View
          style={[
            styles.coreDot,
            {
              width: size * 0.08,
              height: size * 0.08,
              borderRadius: size * 0.04,
              backgroundColor: theme.isDark ? "#7b54ff" : "#7a3cff",
            },
          ]}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 26,
    elevation: 10,
  },
  glow: {
    position: "absolute",
  },
  ribbon: {
    position: "absolute",
  },
  ribbonPrimary: {
    transform: [{ rotate: "-33deg" }],
  },
  ribbonSecondary: {
    transform: [{ rotate: "34deg" }],
  },
  core: {
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.26,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 4,
  },
  coreDot: {
    opacity: 0.95,
  },
});
