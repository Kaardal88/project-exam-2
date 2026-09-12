"use client";

import Link from "next/link";
import { Footer } from "@/components/Footer";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { loginSchema } from "@/server/auth/auth.schemas";
import { HomeLink } from "@/components/HomeLink";
import { useRedirectIfSignedIn } from "@/components/useSignedInHint";

// Shown for any failed login attempt, regardless of whether the email
// or the password was wrong — naming the field that failed makes it
// easier to enumerate registered accounts.
const INVALID_CREDENTIALS_MESSAGE =
  "Invalid email or password. Please try again.";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useRedirectIfSignedIn();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const passwordResult = loginSchema.shape.password.safeParse(password);
    if (!passwordResult.success) {
      setPasswordError("Password must be at least 8 characters long.");
      return;
    }
    setPasswordError("");

    setLoading(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!response.ok) {
      setError(INVALID_CREDENTIALS_MESSAGE);
      return;
    }

    // Nothing to store: the session arrived as an httpOnly cookie on this
    // response, and the page is not allowed to read it.
    router.push(`/user`);
  }

  return (
    <main className="auth-page">
      {/* py-* so the card never meets the top of the window. Centring only
          centres while the card is shorter than the screen; on a laptop it
          is taller, and without this it sat flush against the browser edge. */}
      <div className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
        <section className="mx-auto w-96 sm:w-80 md:w-96 lg:w-100 overflow-hidden border border-neutral-700 bg-neutral-900/80 shadow-2xl p-6 ">
          <HomeLink className="mx-auto mt-6 mb-10" />
          <h1 className="text-2xl font-bold mb-4">Log in</h1>

          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              Email
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="you@example.com"
                required
              />
            </label>

            <label>
              Password
              <div className="password-field">
                <input
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  aria-invalid={passwordError ? "true" : undefined}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordError && (
                <span className="text-sm text-red-300">{passwordError}</span>
              )}
            </label>

            <button
              className="border border-neutral-700 bg-neutral-800 py-2 px-4 rounded-md hover:bg-yellow-50 hover:cursor-pointer hover:text-black hover:font-bold! transition"
              type="submit"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          {error && (
            <p className="mt-4 rounded-md border border-red-900/60 bg-red-950/20 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          {/*
            There is no self-service reset yet: that needs an email provider, a
            verified sending domain and a token table, and it is the same job as
            email verification. Saying so is better than an absence -- someone
            who finds nothing here assumes the app is broken and stops, rather
            than asking.
          */}
          <p className="mt-4 text-center text-sm text-neutral-400">
            Forgotten your password? There is no reset link yet — contact the
            developer and it can be set for you.
          </p>

          <p className="auth-switch">
            No account? <Link href="/register">Create one</Link>
          </p>
        </section>
      </div>

      <Footer />
    </main>
  );
}
