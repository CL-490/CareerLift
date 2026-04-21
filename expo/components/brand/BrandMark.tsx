import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";

import { useAppTheme } from "@/lib/theme";

export function BrandMark({ size = 56 }: { size?: number }) {
  const { theme } = useAppTheme();
  const id = React.useId().replace(/:/g, "");

  return (
    <View
      style={[
        styles.shell,
        {
          width: size,
          height: size,
          shadowColor: theme.palette.shadow,
        },
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="CareerLift">
        <Defs>
          <SvgLinearGradient id={`${id}-bg`} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#37303f" stopOpacity="0.88" />
            <Stop offset="54%" stopColor="#211d28" stopOpacity="0.82" />
            <Stop offset="100%" stopColor="#12151b" stopOpacity="0.78" />
          </SvgLinearGradient>
          <RadialGradient id={`${id}-gloss`} cx="28%" cy="22%" r="64%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
            <Stop offset="46%" stopColor="#d9c7f6" stopOpacity="0.08" />
            <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </RadialGradient>
          <SvgLinearGradient id={`${id}-edge`} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
            <Stop offset="100%" stopColor="#c4b0e6" stopOpacity="0.05" />
          </SvgLinearGradient>
        </Defs>
        <Rect x="2" y="2" width="60" height="60" rx="14" fill={`url(#${id}-bg)`} />
        <Rect x="2" y="2" width="60" height="60" rx="14" fill={`url(#${id}-gloss)`} />
        <Rect x="2.5" y="2.5" width="59" height="59" rx="13.5" fill="none" stroke={`url(#${id}-edge)`} />
        <Path
          d="M 32 18 a 14 14 0 1 0 0 28"
          fill="none"
          stroke="#ffffff"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <Path
          d="M 38 18 v 26 h 12 l 0 -3"
          fill="none"
          stroke="#ffffff"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    justifyContent: "center",
    alignItems: "center",
    shadowOpacity: 0.24,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 8,
  },
});
