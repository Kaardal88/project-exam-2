import { Fragment } from "react";

/**
 * Rendered rich text, without ever building an HTML string.
 *
 * A band bio is shown to signed-out visitors, and anyone can sign up, create a
 * band and become its leader -- so whatever a leader writes is attacker-
 * controlled content on a public page. Storing the editor's HTML and passing
 * it to dangerouslySetInnerHTML would make that a stored XSS, held shut only
 * by a sanitiser being right about every entity and attribute trick.
 *
 * So the editor stores tiptap's JSON document instead and this walks it. Every
 * string ends up as a React child, which React escapes; every node type is
 * matched against the list below and anything unrecognised is skipped. There
 * is no HTML to parse and no sanitiser to get wrong.
 *
 * It also renders plain text, because that is what every bio written before
 * this held, and because a value that fails to parse should read as words
 * rather than disappear.
 */

type Mark = { type?: string };

type Node = {
  type?: string;
  text?: string;
  marks?: Mark[];
  attrs?: { level?: number };
  content?: Node[];
};

/** The marks the toolbar offers, plus the ones its keyboard shortcuts reach. */
function withMarks(text: string, marks: Mark[] | undefined, key: number) {
  if (!marks?.length) return <Fragment key={key}>{text}</Fragment>;

  // The key goes on the Fragment at the end, not on the wrappers: these are
  // built inside a reduce and only the outermost one lands in the array that
  // renderNodes returns.
  const marked = marks.reduce<React.ReactNode>((wrapped, mark) => {
    switch (mark.type) {
      case "bold":
        return <strong>{wrapped}</strong>;
      case "italic":
        return <em>{wrapped}</em>;
      case "strike":
        return <s>{wrapped}</s>;
      case "code":
        return (
          <code className="rounded bg-neutral-800 px-1 py-0.5 text-[0.9em]">
            {wrapped}
          </code>
        );
      default:
        // A mark we do not draw still keeps its text.
        return wrapped;
    }
  }, text as React.ReactNode);

  return <Fragment key={key}>{marked}</Fragment>;
}

function renderNodes(nodes: Node[] | undefined): React.ReactNode {
  if (!nodes?.length) return null;

  return nodes.map((node, index) => {
    switch (node.type) {
      case "text":
        return withMarks(node.text ?? "", node.marks, index);

      case "hardBreak":
        return <br key={index} />;

      case "paragraph":
        return (
          <p key={index} className="mb-3 last:mb-0">
            {renderNodes(node.content)}
          </p>
        );

      case "heading": {
        // Only h2 is in the toolbar, but markdown input rules reach the rest,
        // and a heading that silently became a paragraph would lose meaning.
        const level = Math.min(Math.max(node.attrs?.level ?? 2, 2), 4);
        const size =
          level === 2 ? "text-lg" : level === 3 ? "text-base" : "text-sm";
        const Tag = `h${level}` as "h2" | "h3" | "h4";

        return (
          <Tag
            key={index}
            className={`mb-2 mt-4 font-bold text-yellow-100 first:mt-0 ${size}`}
          >
            {renderNodes(node.content)}
          </Tag>
        );
      }

      case "bulletList":
        return (
          <ul key={index} className="mb-3 list-disc pl-5 last:mb-0">
            {renderNodes(node.content)}
          </ul>
        );

      case "orderedList":
        return (
          <ol key={index} className="mb-3 list-decimal pl-5 last:mb-0">
            {renderNodes(node.content)}
          </ol>
        );

      case "listItem":
        return (
          <li key={index} className="mb-1 [&>p]:mb-0">
            {renderNodes(node.content)}
          </li>
        );

      case "blockquote":
        return (
          <blockquote
            key={index}
            className="mb-3 border-l-2 border-neutral-600 pl-4 italic last:mb-0"
          >
            {renderNodes(node.content)}
          </blockquote>
        );

      case "codeBlock":
        return (
          <pre
            key={index}
            className="mb-3 overflow-x-auto rounded-md bg-neutral-950 p-3 text-xs last:mb-0"
          >
            <code>{renderNodes(node.content)}</code>
          </pre>
        );

      case "horizontalRule":
        return <hr key={index} className="my-4 border-neutral-700" />;

      case "doc":
        return <Fragment key={index}>{renderNodes(node.content)}</Fragment>;

      default:
        // Unknown node: keep whatever text is inside it, drop the wrapper.
        return <Fragment key={index}>{renderNodes(node.content)}</Fragment>;
    }
  });
}

/** Plain text, as written before this editor existed. */
function renderPlainText(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph, index) => (
      <p key={index} className="mb-3 whitespace-pre-wrap last:mb-0">
        {paragraph}
      </p>
    ));
}

/**
 * The stored value as a document, or null if it is not one.
 *
 * Kept apart from the render so the try/catch covers only the parse. JSX built
 * inside a try looks guarded and is not -- React renders it later, outside the
 * block, where nothing is catching.
 */
function parseDocument(trimmed: string): Node | null {
  if (!trimmed.startsWith("{")) return null;

  try {
    const parsed = JSON.parse(trimmed) as Node;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function RichTextContent({
  value,
  className = "",
  emptyText,
}: {
  /** A tiptap JSON document, or plain text from before there was one. */
  value: string | null | undefined;
  className?: string;
  emptyText?: string;
}) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return emptyText ? <p className={className}>{emptyText}</p> : null;
  }

  const doc = parseDocument(trimmed);

  if (doc) {
    // An empty document still means "no bio", not a blank card.
    if (!doc.content?.length) {
      return emptyText ? <p className={className}>{emptyText}</p> : null;
    }

    return <div className={className}>{renderNodes(doc.content)}</div>;
  }

  return <div className={className}>{renderPlainText(trimmed)}</div>;
}
