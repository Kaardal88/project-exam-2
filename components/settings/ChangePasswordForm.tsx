"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { errorMessage } from "@/lib/errorMessage";

const MIN_LENGTH = 8;

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function reset() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    setError(null);
    setSuccess(false);

    // Checked here as well as on the server, because a mistyped confirmation
    // is a slip rather than a failure and should not cost a round trip.
    if (newPassword.length < MIN_LENGTH) {
      setError(`Your new password must be at least ${MIN_LENGTH} characters.`);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("The two new passwords do not match.");
      return;
    }

    setSaving(true);

    const response = await fetch("/api/users/me/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    setSaving(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(
        errorMessage(data, "Could not change your password", {
          what: "Could not change password",
          status: response.status,
        }),
      );
      return;
    }

    reset();
    setSuccess(true);
  }

  const inputClass =
    "w-full rounded-md border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-yellow-100 outline-none transition focus:border-yellow-200";

  return (
    <section className="mb-8 rounded-md border border-neutral-700 bg-neutral-900/80 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-yellow-100">Password</h2>

        <button
          type="button"
          onClick={() => setShowPasswords((shown) => !shown)}
          aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
          className="text-neutral-400 transition hover:cursor-pointer hover:text-yellow-100"
        >
          {showPasswords ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="current-password"
            className="mb-2 block text-sm font-semibold text-yellow-100"
          >
            Current password
          </label>

          <input
            id="current-password"
            type={showPasswords ? "text" : "password"}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="new-password"
            className="mb-2 block text-sm font-semibold text-yellow-100"
          >
            New password
          </label>

          <input
            id="new-password"
            type={showPasswords ? "text" : "password"}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            className={inputClass}
          />

          <p className="mt-1 text-xs text-neutral-500">
            At least {MIN_LENGTH} characters.
          </p>
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="mb-2 block text-sm font-semibold text-yellow-100"
          >
            Repeat new password
          </label>

          <input
            id="confirm-password"
            type={showPasswords ? "text" : "password"}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            className={inputClass}
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        {success && (
          <p className="text-sm text-green-300">
            Your password is changed. Sessions already open on other devices
            stay signed in until they expire.
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !currentPassword || !newPassword}
            className="rounded-full border border-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:cursor-pointer hover:bg-yellow-50 hover:text-black! disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Changing…" : "Change password"}
          </button>
        </div>
      </form>
    </section>
  );
}
