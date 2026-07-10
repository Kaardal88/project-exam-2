"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, Heading2, List } from "lucide-react";

type RichTextEditorProps = {
  initialValue: string;
  onChange: (html: string) => void;
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

export function RichTextEditor({ initialValue, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialValue,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[160px] rounded-md border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-yellow-100 outline-none transition focus:border-yellow-200 prose prose-invert prose-sm max-w-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
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
