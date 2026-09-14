"use client";

import {
  Code,
  Highlighter,
  LinkSimple,
  TextB,
  TextItalic,
  TextStrikethrough,
  TextUnderline,
} from "@phosphor-icons/react";
import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";

function Tool({
  active,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-[5px] text-[13px] transition-colors ${
        active
          ? "bg-ink text-surface"
          : "text-ink/80 hover:bg-raised hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function SelectionToolbar({ editor }: { editor: Editor }) {
  return (
    <BubbleMenu
      editor={editor}
      className="bubble-menu"
      options={{ placement: "top", offset: 8 }}
    >
      <Tool
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <TextB size={15} weight="bold" />
      </Tool>
      <Tool
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <TextItalic size={15} />
      </Tool>
      <Tool
        label="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <TextUnderline size={15} />
      </Tool>
      <Tool
        label="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <TextStrikethrough size={15} />
      </Tool>
      <Tool
        label="Highlight"
        active={editor.isActive("highlight")}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <Highlighter size={15} />
      </Tool>
      <Tool
        label="Inline code"
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code size={15} />
      </Tool>
      <Tool
        label="Link"
        active={editor.isActive("link")}
        onClick={() => {
          if (editor.isActive("link")) {
            editor.chain().focus().unsetLink().run();
            return;
          }
          const href = window.prompt("URL");
          if (!href) return;
          editor.chain().focus().setLink({ href }).run();
        }}
      >
        <LinkSimple size={15} />
      </Tool>
    </BubbleMenu>
  );
}
