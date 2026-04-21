"use client";

import React from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as AuthSession from "expo-auth-session";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { VideoView, useVideoPlayer } from "expo-video";

import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { BrandedBackground } from "@/components/ui/BrandedBackground";
import { useAuth } from "@/lib/auth/provider";
import {
  googleClientId,
  googleDiscovery,
  googleRedirectUri,
  microsoftClientId,
  microsoftDiscovery,
  microsoftRedirectUri,
} from "@/lib/auth/config";
import { useAppTheme } from "@/lib/theme";

type ProviderBusy = "credentials" | "google" | "microsoft" | null;
const loginBackgroundVideo = require("../assets/videos/login-bg.mp4");

async function fetchGoogleProfile(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    throw new Error("Google sign-in completed, but profile retrieval failed.");
  }

  return (await response.json()) as {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
  };
}

async function fetchMicrosoftProfile(accessToken: string) {
  const response = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    throw new Error("Microsoft sign-in completed, but profile retrieval failed.");
  }

  return (await response.json()) as {
    id: string;
    displayName?: string;
    mail?: string;
    userPrincipalName?: string;
  };
}

export default function LoginScreen() {
  const { theme } = useAppTheme();
  const { signInWithPassword, completeOAuthSignIn } = useAuth();
  const insets = useSafeAreaInsets();
  const backgroundPlayer = useVideoPlayer(loginBackgroundVideo, (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState<ProviderBusy>(null);
  const [error, setError] = React.useState<string | null>(null);
  const googleHandledRef = React.useRef<string | null>(null);
  const microsoftHandledRef = React.useRef<string | null>(null);

  const [googleRequest, googleResponse, promptGoogleAsync] = AuthSession.useAuthRequest(
    {
      clientId: googleClientId,
      redirectUri: googleRedirectUri,
      scopes: ["openid", "profile", "email"],
      responseType: AuthSession.ResponseType.Code,
      extraParams: {
        prompt: "select_account",
      },
    },
    googleDiscovery
  );

  const [microsoftRequest, microsoftResponse, promptMicrosoftAsync] = AuthSession.useAuthRequest(
    {
      clientId: microsoftClientId,
      redirectUri: microsoftRedirectUri,
      scopes: ["openid", "profile", "email", "offline_access", "User.Read"],
      responseType: AuthSession.ResponseType.Code,
      extraParams: {
        prompt: "select_account",
      },
    },
    microsoftDiscovery
  );

  React.useEffect(() => {
    async function handleGoogleResponse() {
      if (!googleResponse || googleResponse.type !== "success") return;

      const code = googleResponse.params.code;
      if (!code || googleHandledRef.current === code || !googleRequest?.codeVerifier) return;
      googleHandledRef.current = code;

      setBusy("google");
      setError(null);
      try {
        const tokenResponse = await AuthSession.exchangeCodeAsync(
          {
            clientId: googleClientId,
            code,
            redirectUri: googleRedirectUri,
            extraParams: {
              code_verifier: googleRequest.codeVerifier,
            },
          },
          googleDiscovery
        );

        const accessToken = tokenResponse.accessToken;
        if (!accessToken) {
          throw new Error("Google sign-in did not return an access token.");
        }

        const profile = await fetchGoogleProfile(accessToken);
        await completeOAuthSignIn({
          provider: "google",
          subject: profile.sub,
          email: profile.email,
          name: profile.name,
          image: profile.picture,
        });
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Google sign-in failed.");
      } finally {
        setBusy(null);
      }
    }

    void handleGoogleResponse();
  }, [completeOAuthSignIn, googleRequest?.codeVerifier, googleResponse]);

  React.useEffect(() => {
    async function handleMicrosoftResponse() {
      if (!microsoftResponse || microsoftResponse.type !== "success") return;

      const code = microsoftResponse.params.code;
      if (!code || microsoftHandledRef.current === code || !microsoftRequest?.codeVerifier) return;
      microsoftHandledRef.current = code;

      setBusy("microsoft");
      setError(null);
      try {
        const tokenResponse = await AuthSession.exchangeCodeAsync(
          {
            clientId: microsoftClientId,
            code,
            redirectUri: microsoftRedirectUri,
            extraParams: {
              code_verifier: microsoftRequest.codeVerifier,
            },
          },
          microsoftDiscovery
        );

        const accessToken = tokenResponse.accessToken;
        if (!accessToken) {
          throw new Error("Microsoft sign-in did not return an access token.");
        }

        const profile = await fetchMicrosoftProfile(accessToken);
        await completeOAuthSignIn({
          provider: "microsoft-entra-id",
          subject: profile.id,
          email: profile.mail || profile.userPrincipalName || "",
          name: profile.displayName,
        });
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Microsoft sign-in failed.");
      } finally {
        setBusy(null);
      }
    }

    void handleMicrosoftResponse();
  }, [completeOAuthSignIn, microsoftRequest?.codeVerifier, microsoftResponse]);

  async function handleCredentials() {
    setBusy("credentials");
    setError(null);
    try {
      await signInWithPassword(email.trim(), password);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Invalid email or password.");
    } finally {
      setBusy(null);
    }
  }

  async function handleProviderPress(provider: "google" | "microsoft") {
    if (provider === "google") {
      if (!googleClientId) {
        setError("Google OAuth is not configured. Set EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID.");
        return;
      }

      setError(null);
      setBusy("google");
      const result = await promptGoogleAsync();
      if (result.type !== "success") {
        setBusy(null);
      }
      return;
    }

    if (!microsoftClientId) {
      setError("Microsoft OAuth is not configured. Set EXPO_PUBLIC_MICROSOFT_OAUTH_CLIENT_ID.");
      return;
    }

    setError(null);
    setBusy("microsoft");
    const result = await promptMicrosoftAsync();
    if (result.type !== "success") {
      setBusy(null);
    }
  }

  return (
    <View style={styles.root}>
      <BrandedBackground />
      <View pointerEvents="none" style={styles.backgroundMedia}>
        <VideoView
          allowsPictureInPicture={false}
          contentFit="cover"
          nativeControls={false}
          player={backgroundPlayer}
          style={styles.backgroundVideo}
        />
        <LinearGradient
          colors={["rgba(18, 6, 34, 0.28)", "rgba(10, 4, 24, 0.52)", "rgba(5, 6, 13, 0.82)"]}
          locations={[0, 0.45, 1]}
          style={styles.backgroundScrim}
        />
      </View>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
          <View style={[styles.screen, { paddingTop: Math.max(insets.top, 6) }]}>
            <Animated.View entering={FadeInUp.duration(420)} style={styles.header}>
              <BrandWordmark />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(60).duration(420)} style={styles.sheetWrap}>
              <LinearGradient
                colors={["rgba(20,16,10,0.94)", "rgba(12,16,24,0.98)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.sheet, { shadowColor: theme.palette.shadow }]}
              >
                <View style={styles.sheetHeader}>
                  <Text style={[styles.title, { color: "#fff7e8", fontSize: theme.text.size(24) }]}>Sign in</Text>
                  <Text style={[styles.subtitle, { color: "rgba(255, 241, 214, 0.7)" }]}>
                    Email, Google, or Microsoft. Same account system as web.
                  </Text>
                </View>

                <View style={styles.formGap}>
                  <View style={styles.inputGap}>
                    <Text style={[styles.inputLabel, { color: "#fff2d1" }]}>Email</Text>
                    <TextInput
                      autoCapitalize="none"
                      autoComplete="email"
                      keyboardType="email-address"
                      value={email}
                      onChangeText={setEmail}
                      placeholder="you@careerlift.ai"
                      placeholderTextColor="rgba(255, 236, 197, 0.38)"
                      style={styles.input}
                    />
                  </View>

                  <View style={styles.inputGap}>
                    <Text style={[styles.inputLabel, { color: "#fff2d1" }]}>Password</Text>
                    <TextInput
                      autoComplete="current-password"
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Enter your password"
                      placeholderTextColor="rgba(255, 236, 197, 0.38)"
                      style={styles.input}
                    />
                  </View>
                </View>

                {error ? (
                  <View style={styles.errorBanner}>
                    <Text style={{ color: theme.palette.danger, fontWeight: "700" }}>Auth error</Text>
                    <Text style={{ color: "#fff7ef", lineHeight: theme.text.size(20) }}>{error}</Text>
                  </View>
                ) : null}

                <Pressable
                  onPress={() => void handleCredentials()}
                  disabled={busy !== null || !email.trim() || !password}
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: busy === "credentials" ? "rgba(217, 174, 87, 0.74)" : "#d9ae57",
                      opacity: busy !== null && busy !== "credentials" ? 0.72 : 1,
                    },
                  ]}
                >
                  <Text style={styles.primaryButtonText}>{busy === "credentials" ? "Signing in..." : "Sign in with email"}</Text>
                </Pressable>

                <View style={styles.dividerRow}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                  <View style={styles.divider} />
                </View>

                <View style={styles.providersStack}>
                  <Pressable
                    onPress={() => void handleProviderPress("google")}
                    disabled={busy !== null || !googleRequest}
                    style={[styles.providerButton, busy !== null && busy !== "google" ? styles.dimmed : null, !googleRequest ? styles.disabled : null]}
                  >
                    <Feather name="chrome" size={18} color="#fff1ce" />
                    <Text style={styles.providerText}>{busy === "google" ? "Connecting..." : "Google"}</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => void handleProviderPress("microsoft")}
                    disabled={busy !== null || !microsoftRequest}
                    style={[styles.providerButton, busy !== null && busy !== "microsoft" ? styles.dimmed : null, !microsoftRequest ? styles.disabled : null]}
                  >
                    <Feather name="grid" size={18} color="#fff1ce" />
                    <Text style={styles.providerText}>{busy === "microsoft" ? "Connecting..." : "Microsoft"}</Text>
                  </Pressable>

                  <Pressable disabled style={[styles.providerButton, styles.disabled]}>
                    <Feather name="smartphone" size={18} color="rgba(255, 236, 197, 0.44)" />
                    <Text style={[styles.providerText, { color: "rgba(255, 236, 197, 0.44)" }]}>Apple coming soon</Text>
                  </Pressable>
                </View>
              </LinearGradient>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backgroundMedia: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 18,
    justifyContent: "space-between",
  },
  header: {
    paddingTop: 0,
    paddingBottom: 10,
  },
  sheetWrap: {
    paddingBottom: 96,
    alignItems: "center",
  },
  sheet: {
    width: "100%",
    maxWidth: 420,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(228, 186, 104, 0.16)",
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 30,
    elevation: 10,
  },
  sheetHeader: {
    gap: 6,
  },
  title: {
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  subtitle: {
    lineHeight: 19,
    maxWidth: 290,
    fontSize: 13,
  },
  formGap: {
    gap: 12,
  },
  inputGap: {
    gap: 6,
  },
  inputLabel: {
    fontWeight: "700",
    fontSize: 12,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: "#fff9ef",
    borderColor: "rgba(228, 186, 104, 0.16)",
    backgroundColor: "rgba(255, 249, 236, 0.04)",
  },
  errorBanner: {
    gap: 6,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderColor: "rgba(248, 113, 113, 0.22)",
    backgroundColor: "rgba(248, 113, 113, 0.12)",
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#241503",
    fontWeight: "800",
    fontSize: 14,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(228, 186, 104, 0.14)",
  },
  dividerText: {
    color: "rgba(255, 236, 197, 0.56)",
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 1.1,
  },
  providersStack: {
    gap: 8,
  },
  providerButton: {
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    borderColor: "rgba(228, 186, 104, 0.16)",
    backgroundColor: "rgba(255, 249, 236, 0.04)",
  },
  providerText: {
    color: "#fff1ce",
    fontWeight: "700",
    fontSize: 12,
  },
  dimmed: {
    opacity: 0.68,
  },
  disabled: {
    opacity: 0.45,
  },
});
