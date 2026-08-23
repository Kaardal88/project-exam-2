"use client";

import { useEffect, useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { Modal } from "@/components/Modal";
import { hasSignedInHint } from "@/lib/session";
import { feedbackCategories, type FeedbackCategory } from "@/lib/feedbackCategories";

/**
 * The way testers report anything, on every page.
 *
 * Fixed to the corner rather than tucked into a menu: feedback is worth having
 * at the moment something goes wrong, and anything that costs two clicks and a
 * memory of where the link lives gets written down later, or not at all.
 *
 * Hidden when signed out, which also keeps it off the landing, login and
 * register pages.
 */
export function FeedbackButton() {
  const [signedIn, setSignedIn] = useState(false);
  const [open, setOpen] = useState(false);

  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Read after mount rather than during render: the server has no cookies to
  // look at, so deciding this while rendering would disagree with the client.
  // Deferred through a timeout the same way BackButton does it, which is the
  // shape the compiler lint accepts for reading a cookie into state.
  useEffect(() => {
    const id = setTimeout(() => {
      setSignedIn(hasSignedInHint());
    }, 0);

    return () => clearTimeout(id);
  }, []);

  if (!signedIn) return null;

  const active = feedbackCategories.find((option) => option.value === category)!;

  function openForm() {
    setCategory("bug");
    setBody("");
    setError(null);
    setSent(false);
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (body.trim() === "") {
      setError("Tell me what happened");
      return;
    }

    setSending(true);
    setError(null);

    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        body: body.trim(),
        // Captured rather than asked for. Nobody remembers to say which page
        // they were on, and it is the first thing worth knowing.
        page: `${window.location.pathname}${window.location.search}`,
      }),
    });

    setSending(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Could not send that");
      return;
    }

    setSent(true);
  }

  return (
    <>
      <button
        onClick={openForm}
        title="Send feedback"
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-yellow-100/60 bg-neutral-900/90 px-4 py-3 text-sm font-semibold text-yellow-100 shadow-2xl backdrop-blur transition hover:cursor-pointer hover:border-yellow-100 hover:bg-neutral-800"
      >
        <MessageSquarePlus className="h-4 w-4" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)}>
        <div className="max-h-[85vh] w-[90vw] max-w-lg overflow-y-auto">
          {sent ? (
            <>
              <h2 className="mb-2 text-xl font-bold text-yellow-100">Thank you</h2>

              <p className="mb-6 text-sm text-neutral-300">
                It is in. You can see everything you have sent, and any answer
                to it, under <span className="text-yellow-100">Feedback</span>{" "}
                in your account menu.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={openForm}
                  className="rounded-full border border-neutral-600 px-4 py-2 text-sm text-yellow-100 transition hover:cursor-pointer hover:border-yellow-200"
                >
                  Send another
                </button>

                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:cursor-pointer hover:bg-yellow-50 hover:text-black!"
                >
                  Done
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="mb-1 text-xl font-bold text-yellow-100">
                Send feedback
              </h2>

              <p className="mb-4 text-sm text-neutral-400">
                This goes to the developer, and only to the developer.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold text-yellow-100">
                    What kind of thing is it?
                  </legend>

                  <div className="space-y-2">
                    {feedbackCategories.map((option) => (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition ${
                          category === option.value
                            ? "border-yellow-200/60 bg-yellow-100/5"
                            : "border-neutral-800 bg-neutral-950/40 hover:border-neutral-600"
                        }`}
                      >
                        <input
                          type="radio"
                          name="feedback-category"
                          value={option.value}
                          checked={category === option.value}
                          onChange={() => setCategory(option.value)}
                          className="mt-1 accent-yellow-100"
                        />

                        <span>
                          <span className="block text-sm font-semibold text-yellow-100">
                            {option.label}
                          </span>
                          <span className="block text-xs text-neutral-400">
                            {option.description}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div>
                  <label
                    htmlFor="feedback-body"
                    className="mb-2 block text-sm font-semibold text-yellow-100"
                  >
                    Tell me about it
                  </label>

                  <textarea
                    id="feedback-body"
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder={active.placeholder}
                    rows={5}
                    className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
                  />
                </div>

                {error && <p className="form-error">{error}</p>}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-full border border-neutral-600 px-4 py-2 text-sm text-yellow-100 transition hover:cursor-pointer hover:border-yellow-200"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={sending}
                    className="rounded-full border border-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:cursor-pointer hover:bg-yellow-50 hover:text-black! disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {sending ? "Sending…" : "Send"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
