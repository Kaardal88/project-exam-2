"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error || "Login failed");
      return;
    }

    localStorage.setItem("token", data.token);
    router.push(`/pages/userProfile`);
  }

  return (
    <main className="auth-page">
      <section className="mx-auto my-auto w-96 sm:w-80 md:w-96 lg:w-100 overflow-hidden border border-neutral-700 bg-neutral-900/80 shadow-2xl p-6 ">
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
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="••••••••"
              required
            />
          </label>

          <button className="btn btn-accent" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        {error && <p className="form-error">{error}</p>}

        <p className="auth-switch">
          No account? <Link href="/pages/auth/register">Create one</Link>
        </p>
      </section>
    </main>
  );
}
