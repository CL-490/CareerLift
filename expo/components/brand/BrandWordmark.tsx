import React from "react";
import { StyleSheet, Text, View } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";

import { BrandMark } from "@/components/brand/BrandMark";
import { useAppTheme } from "@/lib/theme";

function GradientTitle({ compact }: { compact?: boolean }) {
  const { theme } = useAppTheme();
  const fontSize = compact ? theme.text.size(20) : theme.text.size(30);

  return (
    <View style={styles.titleWrap}>
      <MaskedView
        maskElement={
          <Text style={[styles.title, { fontSize, color: "#000" }]}>
            CareerLift
          </Text>
        }
      >
        <LinearGradient colors={["#0dd9a3", "#4bd2ff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Text style={[styles.title, styles.titleMaskFill, { fontSize }]}>CareerLift</Text>
        </LinearGradient>
      </MaskedView>
    </View>
  );
}

export function BrandWordmark({
  subtitle,
  compact = false,
}: {
  subtitle?: string;
  compact?: boolean;
}) {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.row, compact ? styles.rowCompact : null]}>
      <BrandMark size={compact ? 42 : 58} />
      <View style={styles.copy}>
        <GradientTitle compact={compact} />
        {subtitle ? <Text style={[styles.subtitle, { color: theme.palette.muted }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  rowCompact: {
    gap: 12,
  },
  copy: {
    flexShrink: 1,
    gap: 4,
  },
  titleWrap: {
    alignSelf: "flex-start",
  },
  title: {
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  titleMaskFill: {
    opacity: 0,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
});
