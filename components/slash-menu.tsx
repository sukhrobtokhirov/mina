"use client";

import {
  CheckSquare,
  Code,
  ListBullets,
  ListNumbers,
  Minus,
  Quotes,
  TextHOne,
  TextHThree,
  TextHTwo,
} from "@phosphor-icons/react";
import type { Editor, Range } from "@tiptap/core";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type ComponentType,
} from "react";

export type SlashCommandItem = {
  title: string;
  hint: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  command: (ctx: { editor: Editor; range: Range }) => void;
};

export const slashItems: SlashCommandItem[] = [
  {
    title: "Heading 1",
    hint: "Large section title",
    icon: TextHOne,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    hint: "Section title",
    icon: TextHTwo,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
  },
  {
    title: "Heading 3",
    hint: "Subsection",
    icon: TextHThree,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
  },
  {
    title: "Bullet list",
    hint: "Unordered list",
    icon: ListBullets,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Numbered list",
    hint: "Ordered list",
    icon: ListNumbers,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "Tasks",
    hint: "Checklist",
    icon: CheckSquare,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: "Quote",
    hint: "Pull quote",
    icon: Quotes,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setBlockquote().run(),
  },
  {
    title: "Code",
    hint: "Fenced code block",
    icon: Code,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setCodeBlock().run(),
  },
  {
    title: "Divider",
    hint: "Horizontal rule",
    icon: Minus,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
];

export type SlashMenuHandle = {
  onKeyDown: (event: KeyboardEvent) => boolean;
};

type Props = {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
};

export const SlashMenu = forwardRef<SlashMenuHandle, Props>(
  function SlashMenu({ items, command }, ref) {
    const [index, setIndex] = useState(0);

    useEffect(() => {
      setIndex(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown(event) {
        if (event.key === "ArrowUp") {
          setIndex((i) => (i + items.length - 1) % Math.max(items.length, 1));
          return true;
        }
        if (event.key === "ArrowDown") {
          setIndex((i) => (i + 1) % Math.max(items.length, 1));
          return true;
        }
        if (event.key === "Enter") {
          const item = items[index];
          if (item) command(item);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="slash-menu">
          <p className="px-3 py-2 text-[13px] text-muted">No matches</p>
        </div>
      );
    }

    return (
      <div className="slash-menu">
        {items.map((item, i) => {
          const Icon = item.icon;
          const active = i === index;
          return (
            <button
              key={item.title}
              type="button"
              className={`slash-item ${active ? "is-active" : ""}`}
              onMouseEnter={() => setIndex(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                command(item);
              }}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-raised text-ink">
                <Icon size={15} />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-[13px] font-medium text-ink">
                  {item.title}
                </span>
                <span className="block text-[11px] text-muted">{item.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    );
  },
);
