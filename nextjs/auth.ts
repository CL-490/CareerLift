import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

const INTERNAL_API_URL =
  process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const AUTH_SECRET = process.env.AUTH_SECRET?.trim() || undefined;

const GOOGLE_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const GOOGLE_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const MS_ID = process.env.MICROSOFT_OAUTH_CLIENT_ID;
const MS_SECRET = process.env.MICROSOFT_OAUTH_CLIENT_SECRET;
const MS_TENANT = process.env.MICROSOFT_OAUTH_TENANT_ID || "common";

const providers: any[] = [
  Credentials({
    id: "credentials",
    name: "Email and Password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;
      try {
        const res = await fetch(`${INTERNAL_API_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          fastapiJwt: data.access_token,
        } as any;
      } catch {
        return null;
      }
    },
  }),
];

if (GOOGLE_ID && GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: GOOGLE_ID,
      clientSecret: GOOGLE_SECRET,
      // Always prompt the user to pick an account instead of silently
      // signing in with the last-used Google identity.
      authorization: { params: { prompt: "select_account" } },
    }),
  );
}
if (MS_ID && MS_SECRET) {
  providers.push(
    MicrosoftEntraID({
      clientId: MS_ID,
      clientSecret: MS_SECRET,
      issuer: `https://login.microsoftonline.com/${MS_TENANT}/v2.0`,
      // Same thing for Microsoft — `select_account` shows the picker even
      // if the browser already has a signed-in Microsoft session.
      authorization: { params: { prompt: "select_account" } },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  // Avoid passing an empty string, which Auth.js treats as an invalid server
  // configuration. In local dev it can fall back when the env var is unset.
  secret: AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // First sign-in via OAuth: upsert user in FastAPI and stash the JWT.
      if (account && account.provider !== "credentials" && profile) {
        try {
          const res = await fetch(`${INTERNAL_API_URL}/api/auth/oauth-upsert`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: account.provider,
              subject: account.providerAccountId,
              email: (profile as any).email,
              name: (profile as any).name,
              image: (profile as any).picture || (profile as any).image,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            (token as any).fastapiJwt = data.access_token;
            (token as any).userId = data.user.id;
            token.email = data.user.email;
            token.name = data.user.name;
          } else {
            console.error("[auth] oauth-upsert failed", res.status, await res.text().catch(() => ""));
          }
        } catch (err) {
          console.error("[auth] oauth-upsert error", err);
        }
      }
      // Credentials sign-in: copy fastapiJwt + id off the user object returned
      // from `authorize()`.
      if (user) {
        const u = user as any;
        if (u.fastapiJwt) (token as any).fastapiJwt = u.fastapiJwt;
        if (u.id) (token as any).userId = u.id;
      }
      return token;
    },
    async session({ session, token }) {
      const t = token as any;
      if (t.fastapiJwt) (session as any).fastapiJwt = t.fastapiJwt;
      if (t.userId && session.user) (session.user as any).id = t.userId;
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    fastapiJwt?: string;
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
