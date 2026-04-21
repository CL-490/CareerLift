"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { CLLogo } from "@/components/BrandLogo";

type ProviderId = "google" | "microsoft-entra-id" | "apple";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        d="M21.35 11.1H12v2.94h5.34c-.23 1.4-1.59 4.1-5.34 4.1-3.21 0-5.83-2.66-5.83-5.94S8.79 6.26 12 6.26c1.83 0 3.05.78 3.75 1.45l2.55-2.46C16.69 3.83 14.55 3 12 3 6.98 3 2.92 7.05 2.92 12.1S6.98 21.2 12 21.2c6.93 0 9.18-4.86 9.18-7.4 0-.5-.05-.88-.13-1.7H21.35z"
        fill="currentColor"
      />
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
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        d="M16.365 1.43c0 1.14-.42 2.22-1.18 3.04-.88.94-2.27 1.68-3.55 1.59-.13-1.12.43-2.27 1.18-3.07.85-.91 2.34-1.66 3.55-1.66l0 .1zm4.55 16.13c-.35.81-.77 1.55-1.27 2.24-.71.97-1.29 1.64-1.74 2.01-.7.6-1.45.91-2.27.93-.59 0-1.3-.16-2.13-.5-.83-.34-1.6-.5-2.31-.5-.74 0-1.53.16-2.39.5-.86.34-1.55.52-2.08.54-.78.03-1.55-.29-2.32-.95-.49-.39-1.1-1.08-1.83-2.07-.78-1.06-1.42-2.29-1.93-3.69-.55-1.5-.82-2.96-.82-4.37 0-1.61.35-3 1.04-4.16.55-.93 1.27-1.66 2.18-2.2.91-.54 1.89-.82 2.95-.84.62 0 1.43.19 2.43.57.99.38 1.63.57 1.91.57.21 0 .91-.22 2.1-.66 1.13-.41 2.08-.58 2.86-.51 2.11.17 3.7 1.01 4.74 2.51-1.89 1.14-2.82 2.74-2.8 4.79.02 1.6.6 2.93 1.74 3.99.52.5 1.1.88 1.74 1.16-.14.41-.29.8-.45 1.18z"
        fill="currentColor"
      />
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
