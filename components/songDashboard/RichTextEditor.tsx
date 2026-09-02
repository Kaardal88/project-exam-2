"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, Heading2, List } from "lucide-react";

type RichTextEditorProps = {
  initialValue: string;
  onChange: (value: string) => void;
  /**
   * What `onChange` hands back.
   *
   * "html" is what the note and lyrics editor has always stored, and those are
   * only ever read back into this editor. "json" is for anything rendered onto
   * a page -- a band bio is public, and a stored HTML string rendered to a
   * visitor is a stored XSS waiting for the sanitiser to have a gap. The JSON
   * document has no such edge: RichTextContent walks it and React escapes
   * every string in it. See components/RichTextContent.tsx.
   */
  format?: "html" | "json";
};

function ToolbarButton({
  editor,
  isActive,
  onClick,
  label,
  children,
}: {
  editor: Editor;
  isActive: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-md border transition hover:cursor-pointer ${
        isActive
          ? "border-yellow-100 bg-yellow-100 text-black"
          : "border-neutral-700 text-neutral-300 hover:border-yellow-200 hover:text-yellow-100"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * What to seed the editor with.
 *
 * The stored value is a JSON document, an HTML string, or -- for anything
 * written before this editor existed -- plain text. Tiptap takes the first two
 * as they are; the third would be shown with its line breaks collapsed, so it
 * is handed over as text and left for the writer to lay out again.
 */
function parseInitialValue(value: string) {
  if (!value) return "";

  const trimmed = value.trim();

  if (trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Not a document after all -- fall through and treat it as text.
    }
  }

  return value;
}

export function RichTextEditor({
  initialValue,
  onChange,
  format = "html",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: parseInitialValue(initialValue),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        // stemlock-richtext, not `prose`: the typography plugin is not
        // installed, so those class names styled nothing and headings and
        // bullets came out looking like ordinary text. See app/globals.css.
        class:
          "stemlock-richtext min-h-[160px] rounded-md border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-yellow-100 outline-none transition focus:border-yellow-200",
      },
    },
    onUpdate: ({ editor }) =>
      onChange(
        format === "json"
          ? JSON.stringify(editor.getJSON())
          : editor.getHTML(),
      ),
  });

  if (!editor) return null;

  return (
    <div>
      <div className="mb-2 flex gap-1">
        <ToolbarButton
          editor={editor}
          isActive={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          editor={editor}
          isActive={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          editor={editor}
          isActive={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          label="Heading"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          editor={editor}
          isActive={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="Bullet list"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
