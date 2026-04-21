import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { BrandMark } from "@/components/brand/BrandMark";
import { useAppTheme } from "@/lib/theme";

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
        <Text
          style={[
            styles.title,
            {
              color: theme.isDark ? "#f6efff" : "#1d1230",
              fontSize: compact ? theme.text.size(20) : theme.text.size(30),
            },
          ]}
        >
          CareerLift
        </Text>
        <Text style={[styles.kicker, { color: theme.isDark ? "#caa9ff" : "#7b54c9" }]}>Fluid momentum for every next move</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.isDark ? "rgba(236, 225, 255, 0.74)" : theme.palette.muted }]}>{subtitle}</Text>
        ) : null}
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
    gap: 3,
  },
  title: {
    fontWeight: "900",
    letterSpacing: -1.35,
  },
  kicker: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
});
