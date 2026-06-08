"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [bandname, setBandName] = useState("");
  const [bio, setBio] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const token = localStorage.getItem("token");

    if (!token) {
      setError("You must be logged in to create a band profile");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/bands", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        bandname,
        bio,
        image_url: imageUrl,
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

    router.push(`/pages/bandProfile?id=${data.id}`);
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Create band or artist profile</h1>
        <p>Start organizing your music projects.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Artist/Band Name
            <input
              value={bandname}
              onChange={(event) => setBandName(event.target.value)}
              type="text"
              placeholder="Artist/Band name"
              required
            />
          </label>
          <label>
            Bio
            <textarea
              placeholder="Write your bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              required
            />
          </label>
          <label>
            Image
            <input
              type="url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="Image URL"
            />
          </label>

          <button className="btn btn-accent" type="submit" disabled={loading}>
            {loading ? "Creating profile..." : "Create profile"}
          </button>
        </form>

        {error && <p className="form-error">{error}</p>}

        <p>
          <Link href="/pages/userProfile">Back to profile</Link>
        </p>
      </section>
    </main>
  );
}
