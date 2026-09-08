"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import countries from "world-countries";
import { SuccessMessage } from "@/components/SuccessMessage";
import { genreOptions } from "@/lib/genres";
import { appName } from "@/components/Stemlock";
/* const countries = [
  { value: "NO", label: "Norway", flag: "🇳🇴" },
  { value: "SE", label: "Sweden", flag: "🇸🇪" },
  { value: "DK", label: "Denmark", flag: "🇩🇰" },
]; */

const countryOptions = countries
  .map((country) => ({
    value: country.cca2,
    label: country.name.common,
    flag: country.flag,
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

export default function RegisterPage() {
  const router = useRouter();
  const [bandname, setBandName] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [country, setCountry] = useState("");
  const [genre, setGenre] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const response = await fetch("/api/bands", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bandname,
        bio,
        country,
        genre,
      }),
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }

    setLoading(false);

    if (!response.ok) {
      setError(data.error || "Registration failed");
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push(`/band/${data.slug ?? data.id}`);
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
          Create a Band/Artist profile
        </h1>
        <p className="text-center">Start organizing your music projects.</p>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-6 flex w-full max-w-2xl flex-col gap-6"
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-yellow-100">
              Artist / Band Name
            </span>

            <input
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-neutral-50 outline-none transition focus:border-yellow-200"
              value={bandname}
              onChange={(event) => setBandName(event.target.value)}
              type="text"
              placeholder="Artist/Band name"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-yellow-100">Country</span>

            <select
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-neutral-50 outline-none transition focus:border-yellow-200"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              required
            >
              <option value="">Select country</option>

              {countryOptions.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-yellow-100">Genre</span>

            <select
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-neutral-50 outline-none transition focus:border-yellow-200"
              value={genre}
              onChange={(event) => setGenre(event.target.value)}
              required
            >
              <option value="">Select genre</option>

              {genreOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-yellow-100">Bio</span>

            <textarea
              className="min-h-[160px] w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-neutral-50 outline-none transition focus:border-yellow-200"
              placeholder="Write your bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              required
            />
          </label>

          {/* No picture fields here on purpose: the avatar and header are
              uploaded from the device on the band page once it exists, through
              EditableProfileImage. A URL box could only ever hold a link to
              somebody else's server. */}

          <button
            className="mt-4 flex w-full items-center justify-center rounded-lg bg-yellow-200 px-5 py-3 font-semibold text-black transition hover:cursor-pointer hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-80"
            type="submit"
            disabled={loading || success}
          >
            {success ? (
              <SuccessMessage message="Band profile created" tone="dark" />
            ) : loading ? (
              "Creating profile..."
            ) : (
              "Create profile"
            )}
          </button>
        </form>

        {error && <p className="form-error">{error}</p>}

        <p className="mt-4">
          <Link
            className="  rounded-full border border-neutral-600 bg-neutral-950/80 px-4 py-2  text-xs font-semibold text-yellow-100 transition hover:border-yellow-200 hover:bg-neutral-800 hover:cursor-pointer"
            href="/user"
          >
            Back to profile
          </Link>
        </p>
      </section>
    </main>
  );
}
