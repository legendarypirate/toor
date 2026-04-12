"use client";

import { useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExt from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Link2,
  ImageIcon,
  Undo2,
  Redo2,
} from "lucide-react";

export interface TiptapEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minHeight?: number;
}

export function TiptapEditor({
  value = "",
  onChange,
  placeholder = "",
  disabled = false,
  className,
  minHeight = 150,
}: TiptapEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      UnderlineExt,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
      Image.configure({ inline: true, allowBase64: true }),
    ],
    content: value || "",
    editable: !disabled,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none dark:prose-invert focus:outline-none px-3 py-2",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor || value === undefined) return;
    const current = editor.getHTML();
    const next = value || "";
    if (next === current) return;
    editor.commands.setContent(next, false);
  }, [editor, value]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("Холбоосын хаяг (URL)", prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Зургийн URL", "https://");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) {
    return (
      <div
        className={cn("rounded-md border border-input bg-background", className)}
        style={{ minHeight }}
      >
        <div className="animate-pulse p-4 text-sm text-muted-foreground">Ачаалж байна...</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-background overflow-hidden",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      <div className="flex flex-wrap gap-0.5 border-b border-border bg-muted/40 p-1">
        <ToolbarIcon
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          label="Тод"
        >
          <Bold className="h-4 w-4" />
        </ToolbarIcon>
        <ToolbarIcon
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          label="Налуу"
        >
          <Italic className="h-4 w-4" />
        </ToolbarIcon>
        <ToolbarIcon
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          label="Доогуур зураас"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarIcon>
        <ToolbarIcon
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          label="Цэгцлэх"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarIcon>
        <span className="mx-0.5 w-px self-stretch bg-border" />
        <ToolbarIcon
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
          label="Гарчиг 1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarIcon>
        <ToolbarIcon
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          label="Гарчиг 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarIcon>
        <ToolbarIcon
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          label="Гарчиг 3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarIcon>
        <span className="mx-0.5 w-px self-stretch bg-border" />
        <ToolbarIcon
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          label="Жагсаалт"
        >
          <List className="h-4 w-4" />
        </ToolbarIcon>
        <ToolbarIcon
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          label="Дугаарласан"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarIcon>
        <span className="mx-0.5 w-px self-stretch bg-border" />
        <ToolbarIcon onClick={setLink} active={editor.isActive("link")} label="Холбоос">
          <Link2 className="h-4 w-4" />
        </ToolbarIcon>
        <ToolbarIcon onClick={addImage} active={false} label="Зураг">
          <ImageIcon className="h-4 w-4" />
        </ToolbarIcon>
        <span className="mx-0.5 w-px self-stretch bg-border" />
        <ToolbarIcon onClick={() => editor.chain().focus().undo().run()} label="Буцаах">
          <Undo2 className="h-4 w-4" />
        </ToolbarIcon>
        <ToolbarIcon onClick={() => editor.chain().focus().redo().run()} label="Дахих">
          <Redo2 className="h-4 w-4" />
        </ToolbarIcon>
      </div>
      <div
        className="tiptap-editor-shell max-h-[480px] overflow-y-auto"
        style={{ ["--tiptap-min-height" as string]: `${minHeight}px` }}
      >
        <EditorContent editor={editor} className="tiptap-editor-content" />
      </div>
    </div>
  );
}

function ToolbarIcon({
  children,
  onClick,
  active,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon"
      className="h-8 w-8 shrink-0"
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {children}
    </Button>
  );
}
