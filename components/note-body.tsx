"use client";

import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Typography from "@tiptap/extension-typography";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";
import { SlashCommand } from "./slash-command";
import { SelectionToolbar } from "./selection-toolbar";

const lowlight = createLowlight(common);

type Props = {
  noteId: string;
  content: string;
  onChange: (json: string, preview: string) => void;
};

export function NoteBody({ noteId, content, onChange }: Props) {
  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: true,
      extensions: [
        StarterKit.configure({
          codeBlock: false,
          heading: { levels: [1, 2, 3] },
          link: { openOnClick: false, autolink: true },
        }),
        CodeBlockLowlight.configure({ lowlight }),
        Placeholder.configure({
          placeholder: "Write, or type / for blocks",
        }),
        Typography.configure({ emDash: false }),
        Highlight,
        TaskList,
        TaskItem.configure({ nested: true }),
        SlashCommand,
      ],
      content: safeParse(content),
      editorProps: {
        attributes: {
          class: "note-prose",
          spellcheck: "true",
        },
      },
      onUpdate: ({ editor }) => {
        const json = JSON.stringify(editor.getJSON());
        const preview = editor.getText().replace(/\s+/g, " ").trim().slice(0, 180);
        onChange(json, preview);
      },
    },
    [noteId],
  );

  if (!editor) {
    return <div className="min-h-[40vh]" />;
  }

  return (
    <div>
      <SelectionToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function safeParse(raw: string) {
  try {
    return JSON.parse(raw) as object;
  } catch {
    return {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
  }
}
