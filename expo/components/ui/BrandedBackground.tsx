import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useAppTheme } from "@/lib/theme";

export function BrandedBackground() {
  const { theme } = useAppTheme();

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <LinearGradient
        colors={[theme.palette.background, theme.palette.backgroundAlt, theme.palette.background]}
        start={{ x: 0.15, y: 0.1 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: theme.isDark ? "transparent" : "rgba(255,255,255,0.02)",
          } as never,
        ]}
      />
    </View>
  );
}
