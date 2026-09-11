import type { LegalDocument } from "@/lib/legal";

/**
 * Draws one of the documents in lib/legal.ts.
 *
 * Terms and Privacy are the same object with different words in it, so they
 * get one renderer rather than two pages of near-identical JSX that slowly
 * stop matching each other.
 *
 * From lg up the sections flow into two CSS columns. Multi-column is the right
 * tool here precisely because nothing on these pages can be opened or closed:
 * the layout is decided once and never reflows under the reader. The FAQ, where
 * every answer expands, deliberately does something else.
 */
export function LegalDocumentView({ document }: { document: LegalDocument }) {
  return (
    <article className="rounded-lg border border-amber-200 bg-primary p-6 shadow-md sm:p-10 lg:p-14">
      <header className="lg:max-w-3xl">
        <h1 className="text-3xl font-bold">{document.title}</h1>

        <p className="mt-2 text-sm text-yellow-100/60">
          Last updated {document.updated}
        </p>

        {document.intro.map((paragraph) => (
          <p key={paragraph} className="mt-4 text-lg leading-relaxed">
            {paragraph}
          </p>
        ))}
      </header>

      <div className="mt-10 lg:columns-2 lg:gap-14">
        {document.sections.map((section) => (
          // break-inside-avoid so a section never gets split across the
          // column boundary, which would orphan a heading from its list.
          <section key={section.heading} className="mb-8 break-inside-avoid">
            <h2 className="text-xl font-bold">{section.heading}</h2>

            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="mt-3 leading-relaxed">
                {paragraph}
              </p>
            ))}

            {section.bullets && (
              <ul className="mt-3 flex flex-col gap-2 list-disc pl-5 marker:text-amber-200">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="leading-relaxed">
                    {bullet}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}
