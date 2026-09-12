"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import countries from "world-countries";
import { SuccessMessage } from "@/components/SuccessMessage";
import { genreOptions } from "@/lib/genres";
import { HomeLink } from "@/components/HomeLink";
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
      {/* Two columns from lg. What a laptop is short of is height, not width:
          stacked, this form ran past the fold on a 13-15" screen while half
          the window stood empty on either side. The short fields go left and
          the bio takes the right, stretched to their height. Below lg it is
          the single column it always was.

          py-* for the same reason as login and register: the card is taller
          than a laptop window, and centring cannot keep it off the edge. */}
      <div className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
        <section className="mx-auto w-96 sm:w-80 md:w-96 lg:w-full lg:max-w-4xl overflow-hidden border border-neutral-700 bg-neutral-900/80 shadow-2xl p-6 lg:p-10">
          <HomeLink className="mx-auto mt-6 mb-10 lg:mt-0 lg:mb-8" />
          <h1 className="text-3xl pb-2 md:text-3xl text-center font-[family-name:var(--font-caveat)]">
            Create a Band/Artist profile
          </h1>
          <p className="text-center">Start organizing your music projects.</p>

          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-6 grid w-full gap-6 lg:mt-8 lg:grid-cols-2 lg:gap-x-10"
          >
            <div className="flex flex-col gap-6">
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
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-yellow-100">Bio</span>

              <textarea
                className="min-h-[160px] w-full flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-neutral-50 outline-none transition focus:border-yellow-200"
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
              className="mt-4 flex w-full items-center justify-center rounded-lg bg-yellow-200 px-5 py-3 font-semibold text-black transition hover:cursor-pointer hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-80 lg:col-span-2 lg:mt-0"
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
      </div>
    </main>
  );
}
