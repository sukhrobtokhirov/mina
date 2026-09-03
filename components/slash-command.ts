import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import {
  SlashMenu,
  slashItems,
  type SlashCommandItem,
  type SlashMenuHandle,
} from "./slash-menu";

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: true,
        allowedPrefixes: null,
        items: ({ query }) => {
          const q = query.toLowerCase().trim();
          return slashItems.filter(
            (item) =>
              item.title.toLowerCase().includes(q) ||
              item.hint.toLowerCase().includes(q),
          );
        },
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
        render: () => {
          let component: ReactRenderer<SlashMenuHandle> | null = null;
          let unmount: (() => void) | undefined;

          return {
            onStart(props) {
              component = new ReactRenderer(SlashMenu, {
                editor: props.editor,
                props: {
                  items: props.items,
                  command: props.command,
                },
              });
              unmount = props.mount(component.element);
            },
            onUpdate(props) {
              component?.updateProps({
                items: props.items,
                command: props.command,
              });
            },
            onKeyDown(props) {
              if (props.event.key === "Escape") {
                unmount?.();
                return true;
              }
              return component?.ref?.onKeyDown(props.event) ?? false;
            },
            onExit() {
              unmount?.();
              component?.destroy();
              component = null;
            },
          };
        },
      } satisfies Omit<SuggestionOptions<SlashCommandItem, SlashCommandItem>, "editor">,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
