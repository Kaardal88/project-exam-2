"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TagCombobox } from "@/components/userProfile/userMusInstTitle";
import { SuccessMessage } from "@/components/SuccessMessage";
import { registerSchema } from "@/server/auth/auth.schemas";
import { appName } from "@/components/Stemlock";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tags, setTags] = useState<string[]>([]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const passwordResult = registerSchema.shape.password.safeParse(password);
    if (!passwordResult.success) {
      setPasswordError("Password must be at least 8 characters long.");
      return;
    }
    setPasswordError("");

    setLoading(true);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password, tags }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(
        typeof data.error === "string" ? data.error : "Registration failed",
      );
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push("/login");
    }, 1000);
  }

  return (
    <main className="auth-page">
      <section className="mx-auto my-auto w-96 sm:w-80 md:w-96 lg:w-100 overflow-hidden border border-neutral-700 bg-neutral-900/80 shadow-2xl p-6 ">
        <div className="flex w-max justify-center mx-auto mt-6 mb-10 bg-[#f3e7b6] text-neutral-950 px-8 sm:px-10 py-3 font-black shadow-[0_8px_25px_rgba(0,0,0,0.45)] -rotate-3 [clip-path:polygon(6%_0%,94%_0%,98%_8%,95%_18%,99%_28%,94%_42%,97%_56%,93%_72%,98%_88%,95%_100%,6%_100%,2%_92%,5%_80%,1%_68%,6%_54%,2%_38%,5%_22%,1%_10%)]">
          <Link href="/">
            <span className="text-3xl md:text-4xl font-black tracking-tight hover:opacity-90 transition font-[family-name:var(--font-marker)]">
              {appName}
            </span>
          </Link>
        </div>
        <h1 className="text-3xl pb-2 md:text-3xl text-center font-[family-name:var(--font-caveat)]">
          Create account
        </h1>
        <p className="text-center">Start organizing your music projects.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Name
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              type="text"
              placeholder="Your name"
              required
            />
          </label>

          <TagCombobox value={tags} onChange={setTags} />

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
            className="border border-neutral-700 bg-neutral-800 py-2 px-4 rounded-md hover:bg-yellow-50 hover:cursor-pointer hover:text-black hover:font-bold! transition disabled:cursor-not-allowed disabled:opacity-80"
            type="submit"
            disabled={loading || success}
          >
            {success ? (
              <SuccessMessage message="Account created" />
            ) : loading ? (
              "Creating account..."
            ) : (
              "Create account"
            )}
          </button>
        </form>

        {error && (
          <p className="mt-4 rounded-md border border-red-900/60 bg-red-950/20 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <p className="auth-switch">
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </section>
    </main>
  );
}
