"use client";

import { Bold, Italic, List, Pilcrow, Redo2, Undo2 } from "lucide-react";
import FontFamily from "@tiptap/extension-font-family";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { emailVariables } from "@/lib/email-template-variables";
import { cn } from "@/lib/utils";
import type { Json } from "@/types/database.types";

type RichEmailEditorProps = {
  content: Json;
  editable?: boolean;
  showVariables?: boolean;
  className?: string;
  onChange?: (content: Json, html: string, text: string) => void;
};

export function RichEmailEditor({
  content,
  editable = true,
  showVariables = false,
  className,
  onChange,
}: RichEmailEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit,
      TextStyle,
      FontFamily.configure({ types: ["textStyle"] }),
      Placeholder.configure({ placeholder: "Redigez votre message..." }),
    ],
    content: content as JSONContent,
    onCreate: ({ editor: currentEditor }) => {
      onChange?.(currentEditor.getJSON() as Json, currentEditor.getHTML(), currentEditor.getText({ blockSeparator: "\n\n" }));
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange?.(currentEditor.getJSON() as Json, currentEditor.getHTML(), currentEditor.getText({ blockSeparator: "\n\n" }));
    },
  });

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editable, editor]);

  if (!editor) return <div className="min-h-72 animate-pulse rounded-md bg-panel-strong" />;

  function insertVariable(token: string) {
    if (!token) return;
    editor?.chain().focus().insertContent(token).run();
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border bg-panel", className)}>
      {editable ? (
        <div className="flex flex-wrap items-center gap-1 border-b border-border bg-panel-strong/55 p-2" aria-label="Mise en forme du message">
          <ToolbarButton label="Annuler" active={false} disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 /></ToolbarButton>
          <ToolbarButton label="Retablir" active={false} disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 /></ToolbarButton>
          <span className="mx-1 h-6 w-px bg-border" aria-hidden />
          <ToolbarButton label="Gras" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold /></ToolbarButton>
          <ToolbarButton label="Italique" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic /></ToolbarButton>
          <ToolbarButton label="Liste" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List /></ToolbarButton>
          <ToolbarButton label="Paragraphe" active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()}><Pilcrow /></ToolbarButton>
          <Select
            aria-label="Police"
            className="ml-1 min-h-9 w-36 py-1"
            defaultValue="Arial"
            onChange={(event) => editor.chain().focus().setFontFamily(event.target.value).run()}
          >
            <option value="Arial">Arial</option>
            <option value="Georgia">Georgia</option>
            <option value="Verdana">Verdana</option>
            <option value="Trebuchet MS">Trebuchet</option>
          </Select>
          {showVariables ? (
            <Select aria-label="Ajouter une information" className="ml-auto min-h-9 w-56 py-1" defaultValue="" onChange={(event) => { insertVariable(event.target.value); event.target.value = ""; }}>
              <option value="">+ Ajouter une information</option>
              {(["Contact", "Spectacle"] as const).map((group) => (
                <optgroup key={group} label={group}>
                  {emailVariables.filter((variable) => variable.group === group).map((variable) => (
                    <option key={variable.token} value={variable.token}>{variable.label}</option>
                  ))}
                </optgroup>
              ))}
            </Select>
          ) : null}
        </div>
      ) : null}
      <EditorContent
        aria-label={editable ? "Corps du message" : "Apercu du message"}
        className={cn(
          "email-editor min-h-72 px-6 py-5 text-[15px] leading-7 outline-none",
          !editable && "bg-white text-slate-900",
        )}
        editor={editor}
      />
    </div>
  );
}

function ToolbarButton({ children, label, active, disabled, onClick }: { children: ReactNode; label: string; active: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <Button aria-label={label} className={cn("h-9 min-h-9 w-9 p-0", active && "bg-accent !text-white")} disabled={disabled} title={label} type="button" variant="ghost" onClick={onClick}>
      <span className="[&>svg]:h-4 [&>svg]:w-4">{children}</span>
    </Button>
  );
}
