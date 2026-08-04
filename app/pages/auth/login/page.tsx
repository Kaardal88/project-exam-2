"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginSchema } from "@/server/auth/auth.schemas";

// Shown for any failed login attempt, regardless of whether the email
// or the password was wrong — naming the field that failed makes it
// easier to enumerate registered accounts.
const INVALID_CREDENTIALS_MESSAGE = "En eller flere av feltene er feil.";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

    const data = await response.json();
    localStorage.setItem("token", data.token);
    router.push(`/pages/userProfile`);
  }

  return (
    <main className="auth-page">
      <section className="mx-auto my-auto w-96 sm:w-80 md:w-96 lg:w-100 overflow-hidden border border-neutral-700 bg-neutral-900/80 shadow-2xl p-6 ">
        <div className="flex w-max justify-center mx-auto mt-6 mb-10 bg-[#f3e7b6] text-neutral-950 px-8 sm:px-10 py-3 font-black shadow-[0_8px_25px_rgba(0,0,0,0.45)] -rotate-3 [clip-path:polygon(6%_0%,94%_0%,98%_8%,95%_18%,99%_28%,94%_42%,97%_56%,93%_72%,98%_88%,95%_100%,6%_100%,2%_92%,5%_80%,1%_68%,6%_54%,2%_38%,5%_22%,1%_10%)]">
          <Link href="/">
            <span className="text-3xl md:text-4xl font-black tracking-tight hover:opacity-90 transition font-[family-name:var(--font-marker)]">
              Vardo
            </span>
          </Link>
        </div>
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
            <input
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (passwordError) setPasswordError("");
              }}
              type="password"
              placeholder="••••••••"
              aria-invalid={passwordError ? "true" : undefined}
              required
            />
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

        <p className="auth-switch">
          No account? <Link href="/pages/auth/register">Create one</Link>
        </p>
      </section>
    </main>
  );
}
