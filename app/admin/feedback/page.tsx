"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import AmpLoader from "@/components/AmpLoader";
import {
  feedbackCategories,
  feedbackCategoryLabel,
  feedbackStatuses,
  type FeedbackStatus,
} from "@/lib/feedbackCategories";

type FeedbackItem = {
  id: string;
  category: string;
  body: string;
  page: string | null;
  status: FeedbackStatus;
  reply: string | null;
  replied_at: string | null;
  created_at: string | null;
  author: { id: string; handle: string | null; username: string } | null;
};

const STATUS_STYLES: Record<FeedbackStatus, string> = {
  new: "border-yellow-200/50 text-yellow-100",
  seen: "border-neutral-600 text-neutral-300",
  resolved: "border-green-800/60 text-green-300",
};

function formatWhen(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * The inbox. Reachable only by the single platform admin.
 *
 * The page does not decide that -- the API does. A 404 from /api/feedback is
 * what sends a non-admin away, so knowing the URL gets you nothing.
 */
export default function AdminFeedbackPage() {
  const router = useRouter();

  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FeedbackStatus | "all">("all");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/feedback");

    if (response.status === 401) {
      router.push("/login");
      return;
    }

    // Not an admin, so as far as this account is concerned the inbox does not
    // exist. Same answer the API gives.
    if (response.status === 404) {
      router.push("/user");
      return;
    }

    if (response.ok) setItems(await response.json());

    setLoading(false);
  }, [router]);

  useEffect(() => {
    async function loadInbox() {
      await load();
    }

    void loadInbox();
  }, [load]);

  async function update(id: string, changes: Record<string, unknown>) {
    setBusyId(id);

    const response = await fetch(`/api/feedback/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });

    setBusyId(null);

    if (response.ok) await load();
  }

  const shown =
    filter === "all" ? items : items.filter((item) => item.status === filter);

  const counts = feedbackStatuses.map((status) => ({
    status,
    count: items.filter((item) => item.status === status).length,
  }));

  return (
    <main className="w-full min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-slate-900 text-yellow-100">
      <NavBar />

      <div className="mx-auto w-full max-w-4xl px-4 pb-24">
        <h1 className="mb-2 mt-12 text-center font-[family-name:var(--font-caveat)] text-4xl tracking-wide text-yellow-100 md:text-5xl">
          Feedback inbox
        </h1>

        <p className="mb-8 text-center text-sm text-neutral-400">
          {items.length} in total
          {counts
            .filter((entry) => entry.count > 0)
            .map((entry) => ` · ${entry.count} ${entry.status}`)
            .join("")}
        </p>

        <div className="mb-6 flex flex-wrap justify-center gap-2">
          {(["all", ...feedbackStatuses] as const).map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition hover:cursor-pointer ${
                filter === value
                  ? "border-yellow-100 bg-yellow-100 text-black"
                  : "border-neutral-700 text-neutral-300 hover:border-yellow-200"
              }`}
            >
              {value}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <AmpLoader />
          </div>
        ) : shown.length === 0 ? (
          <p className="text-center text-sm text-neutral-500">
            Nothing here.
          </p>
        ) : (
          <ul className="space-y-4">
            {shown.map((item) => {
              const category = feedbackCategories.find(
                (option) => option.value === item.category,
              );

              return (
                <li
                  key={item.id}
                  className="rounded-md border border-neutral-700 bg-neutral-900/80 p-5 shadow-2xl"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-xs font-semibold text-neutral-300">
                      {category?.label ?? feedbackCategoryLabel(item.category)}
                    </span>

                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[item.status]}`}
                    >
                      {item.status}
                    </span>

                    <span className="text-xs text-neutral-500">
                      {item.author?.username ?? "a deleted account"} ·{" "}
                      {formatWhen(item.created_at)}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap text-sm text-neutral-200">
                    {item.body}
                  </p>

                  {item.page && (
                    <p className="mt-2 font-mono text-xs text-neutral-600">
                      {item.page}
                    </p>
                  )}

                  <div className="mt-4 space-y-2">
                    <textarea
                      value={drafts[item.id] ?? item.reply ?? ""}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                      placeholder="Reply to whoever sent this…"
                      rows={2}
                      className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
                    />

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {feedbackStatuses
                        .filter((status) => status !== item.status)
                        .map((status) => (
                          <button
                            key={status}
                            disabled={busyId === item.id}
                            onClick={() => update(item.id, { status })}
                            className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-300 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100 disabled:opacity-40"
                          >
                            Mark {status}
                          </button>
                        ))}

                      <button
                        disabled={busyId === item.id}
                        onClick={() =>
                          update(item.id, {
                            reply: drafts[item.id] ?? item.reply ?? "",
                          })
                        }
                        className="rounded-md border border-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-100 transition hover:cursor-pointer hover:bg-yellow-50 hover:text-black! disabled:opacity-40"
                      >
                        {item.reply ? "Update reply" : "Send reply"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
