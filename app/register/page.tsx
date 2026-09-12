"use client";

import Link from "next/link";
import { Footer } from "@/components/Footer";
import { useState } from "react";
import { useRouter } from "next/navigation";
import countries from "world-countries";
import { TagCombobox } from "@/components/userProfile/userMusInstTitle";
import { SuccessMessage } from "@/components/SuccessMessage";
import { registerSchema } from "@/server/auth/auth.schemas";
import { HomeLink } from "@/components/HomeLink";
import { useRedirectIfSignedIn } from "@/components/useSignedInHint";
import { errorMessage } from "@/lib/errorMessage";

// Same cca2 list and same sort as /bands/new, so the two registration forms
// offer the same names in the same order.
const countryOptions = countries
  .map((country) => ({ value: country.cca2, label: country.name.common }))
  .sort((a, b) => a.label.localeCompare(b.label));

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
  const [country, setCountry] = useState("");

  useRedirectIfSignedIn();

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
      body: JSON.stringify({ username, email, password, tags, country }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(
        errorMessage(data, "Registration failed", {
          what: "Registration failed",
          status: response.status,
        }),
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
      {/* py-* so the card never meets the top of the window. Centring only
          centres while the card is shorter than the screen; on a laptop this
          one is taller, and without it the card sat flush against the
          browser edge. */}
      <div className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
        <section className="mx-auto w-96 sm:w-80 md:w-96 lg:w-100 overflow-hidden border border-neutral-700 bg-neutral-900/80 shadow-2xl p-6 ">
          <HomeLink className="mx-auto mt-6 mb-10" />
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
              Where you are
              <select
                value={country}
                onChange={(event) => setCountry(event.target.value)}
              >
                {/* Not required, unlike the country on a band. A band is a public
                    act with a home scene; a person is a person, and Connect
                    filters on this -- so it stays something you publish rather
                    than a toll on signing up. Editable later on the profile. */}
                <option value="">Rather not say</option>

                {countryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

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
      </div>

      <Footer />
    </main>
  );
}
