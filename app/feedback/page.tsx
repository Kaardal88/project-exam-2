"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import AmpLoader from "@/components/AmpLoader";
import { feedbackCategoryLabel } from "@/lib/feedbackCategories";

type MyFeedback = {
  id: string;
  category: string;
  body: string;
  page: string | null;
  status: string;
  reply: string | null;
  replied_at: string | null;
  created_at: string | null;
};

function formatWhen(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * What you have sent, and what came back.
 *
 * The list is scoped to the signed-in author on the server, not filtered here
 * -- filtering in the browser would mean every tester's feedback being sent to
 * every tester's machine.
 */
export default function MyFeedbackPage() {
  const router = useRouter();

  const [items, setItems] = useState<MyFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/feedback/mine");

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        setError("Could not load your feedback");
        setLoading(false);
        return;
      }

      setItems(await response.json());
      setLoading(false);

      // Looking at the page is what makes an answer read. Fired after the
      // list is in hand rather than as a side effect of fetching it, so the
      // badge cannot clear for someone who never got as far as seeing this.
      await fetch("/api/feedback/mine/seen", { method: "PUT" }).catch(() => {});
    }

    void load();
  }, [router]);

  return (
    <main className="w-full min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-slate-900 text-yellow-100">
      <NavBar />

      <div className="mx-auto w-full max-w-3xl px-4 pb-24">
        <h1 className="mb-2 mt-12 text-center font-[family-name:var(--font-caveat)] text-4xl tracking-wide text-yellow-100 md:text-5xl">
          Your feedback
        </h1>

        <p className="mb-10 text-center text-sm text-neutral-400">
          Everything you have sent, and any answer to it.
        </p>

        {loading ? (
          <div className="flex justify-center py-12">
            <AmpLoader />
          </div>
        ) : error ? (
          <p className="form-error">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-center text-sm text-neutral-500">
            You have not sent anything yet. Use the Feedback button in the
            corner of any page.
          </p>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-md border border-neutral-700 bg-neutral-900/80 p-5 shadow-2xl"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-xs font-semibold text-neutral-300">
                    {feedbackCategoryLabel(item.category)}
                  </span>

                  <span className="text-xs text-neutral-500">
                    {formatWhen(item.created_at)}
                  </span>

                  {item.reply ? (
                    <span className="rounded-full border border-green-800/60 bg-green-950/30 px-2 py-0.5 text-xs font-semibold text-green-300">
                      Answered
                    </span>
                  ) : (
                    <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-xs text-neutral-400">
                      Sent
                    </span>
                  )}
                </div>

                <p className="whitespace-pre-wrap text-sm text-neutral-200">
                  {item.body}
                </p>

                {item.page && (
                  <p className="mt-2 font-mono text-xs text-neutral-600">
                    {item.page}
                  </p>
                )}

                {item.reply && (
                  <div className="mt-4 rounded-md border border-yellow-200/30 bg-yellow-100/5 p-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-yellow-100">
                      Reply
                      {item.replied_at && (
                        <span className="ml-2 font-normal normal-case text-neutral-500">
                          {formatWhen(item.replied_at)}
                        </span>
                      )}
                    </p>

                    <p className="whitespace-pre-wrap text-sm text-neutral-200">
                      {item.reply}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
