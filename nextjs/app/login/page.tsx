"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { CLLogo } from "@/components/BrandLogo";

type ProviderId = "google" | "microsoft-entra-id" | "apple";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <rect x="2" y="2" width="9.5" height="9.5" fill="#f25022" />
      <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7fba00" />
      <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00a4ef" />
      <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#ffb900" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.13-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [providerBusy, setProviderBusy] = useState<ProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProvider = async (provider: ProviderId) => {
    if (provider === "apple") return;
    setProviderBusy(provider);
    setError(null);
    try {
      await signIn(provider, { callbackUrl });
    } catch (err) {
      setProviderBusy(null);
      setError(
        err instanceof Error
          ? err.message
          : "OAuth not configured. Set the credentials in .env to enable this provider.",
      );
    }
  };

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });
      if (!res || res.error) {
        setError("Invalid email or password.");
      } else if (res.ok) {
        router.push(res.url || callbackUrl);
      }
    } finally {
      setBusy(false);
    }
  };

  const providers: Array<{
    id: ProviderId;
    label: string;
    icon: React.ReactNode;
    disabled?: boolean;
  }> = [
    { id: "google", label: "Google", icon: <GoogleIcon /> },
    { id: "microsoft-entra-id", label: "Microsoft", icon: <MicrosoftIcon /> },
    { id: "apple", label: "Apple", icon: <AppleIcon />, disabled: true },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/videos/login-bg.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,7,35,0.34),rgba(10,6,26,0.55)_45%,rgba(7,8,14,0.82))]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex w-full max-w-md flex-col items-center">
          <div className="mb-8 flex flex-col items-center text-center">
            <CLLogo size={88} className="mb-4 drop-shadow-[0_12px_32px_rgba(0,0,0,0.35)]" />
            <div className="brand select-none text-[34px] leading-none sm:text-[40px]">CareerLift</div>
            <div className="mt-2 text-sm text-white/70">Your AI-powered career workspace</div>
          </div>

          <div className="w-full rounded-[28px] border border-white/10 bg-[rgba(11,14,20,0.58)] p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.75)] backdrop-blur-xl sm:p-7">
            <h1 className="mb-6 text-[34px] font-semibold tracking-tight text-white">
              Sign in
            </h1>

            <form onSubmit={handleCredentials} className="space-y-3">
              <div>
                <label htmlFor="login-email" className="form-label">Email</label>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-control w-full rounded-lg p-2"
                  suppressHydrationWarning
                />
              </div>
              <div>
                <label htmlFor="login-password" className="form-label">Password</label>
                <input
                  id="login-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-control w-full rounded-lg p-2"
                  suppressHydrationWarning
                />
              </div>
              {error && (
                <p className="text-[12px] text-red-300" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="jf-btn jf-btn-primary w-full px-4 py-2 text-sm disabled:opacity-50"
              >
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[11px] uppercase tracking-wider text-white/55">
                Or continue with
              </span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="flex items-center justify-center gap-3">
              {providers.map((provider) => {
                const isBusy = providerBusy === provider.id;
                const disabled = provider.disabled || providerBusy !== null;
                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => handleProvider(provider.id)}
                    disabled={disabled}
                    title={
                      provider.disabled
                        ? `${provider.label} sign-in (coming soon)`
                        : `Continue with ${provider.label}`
                    }
                    aria-label={`Continue with ${provider.label}`}
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-colors hover:border-[var(--accent)] hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isBusy ? (
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                    ) : (
                      provider.icon
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
