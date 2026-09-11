import type { FaqGroup } from "@/lib/faq";

/**
 * The questions inside each group go two-wide from lg; the group headings stay
 * full width and divide the page.
 *
 * Three other layouts were wrong for different reasons. CSS multi-column
 * reflows every time an answer opens, so a question can jump to the other
 * column under the reader's cursor. Two hand-balanced columns of whole groups
 * fix that but reorder the groups on mobile, where the grid collapses to the
 * order the columns were filled in rather than the order they were written in.
 * A single column simply ignores the width it has been given.
 *
 * Splitting inside the group has none of those problems: the grid collapses to
 * exactly the authored order on mobile, `items-start` means an open answer
 * grows its own cell and nothing else, and each group balances itself without
 * anyone counting.
 */
export function FaqList({ groups }: { groups: FaqGroup[] }) {
  return (
    <div className="flex flex-col gap-12">
      {groups.map((group) => (
        <section key={group.group}>
          <h2 className="text-sm font-bold uppercase tracking-widest text-amber-200">
            {group.group}
          </h2>

          <div className="mt-4 grid items-start gap-2 lg:grid-cols-2 lg:gap-x-6">
            {group.items.map((item) => (
              <details
                key={item.id}
                id={item.id}
                className="group rounded-lg border border-neutral-700 bg-black/30 open:border-amber-200/60 transition-colors"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 p-4 font-semibold list-none [&::-webkit-details-marker]:hidden hover:text-amber-200">
                  {item.question}

                  <span
                    aria-hidden="true"
                    className="shrink-0 text-amber-200 transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>

                <div className="px-4 pb-4 flex flex-col gap-3 text-yellow-100/80">
                  {item.answer.map((paragraph) => (
                    <p key={paragraph} className="leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
