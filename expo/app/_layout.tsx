import "react-native-reanimated";
import "react-native-gesture-handler";
import "../global.css";

import React from "react";
import { Stack, usePathname, useRouter } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "@/lib/auth/provider";
import { ThemeProvider, useAppTheme } from "@/lib/theme";
import { BrandedBackground } from "@/components/ui/BrandedBackground";
import { LoadingState } from "@/components/ui/LoadingState";

function AuthGate() {
  const { ready, isAuthenticated } = useAuth();
  const { theme } = useAppTheme();
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    if (!ready) return;

    if (!isAuthenticated && pathname !== "/login") {
      router.replace("/login");
      return;
    }

    if (isAuthenticated && pathname === "/login") {
      router.replace("/");
    }
  }, [isAuthenticated, pathname, ready, router]);

  if (!ready) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BrandedBackground />
        <LoadingState label="Restoring your session…" />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(app)" />
      </Stack>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
