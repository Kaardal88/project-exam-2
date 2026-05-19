"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: number;
  username: string;
  email: string;
};

export default function UserProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/pages/auth/login");
        return;
      }

      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not load profile");
        setLoading(false);
        return;
      }

      setUser(data.user);
      setLoading(false);
    }

    loadUser();
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/pages/auth/login");
  }

  if (loading) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p>Loading profile...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p className="form-error">{error}</p>
          <button className="btn" onClick={() => router.push("/pages/auth/login")}>Log in</button>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Welcome, {user?.username}</h1>
        <p>You are logged in with:</p>
        <div className="profile-info">
          <p>
            <strong>Email:</strong> {user?.email}
          </p>
          <p>
            <strong>User ID:</strong> {user?.id}
          </p>
        </div>
        <button className="btn btn-accent" onClick={handleLogout}>
          Log out
        </button>
      </section>
    </main>
  );
}
