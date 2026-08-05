"use client";

import { Bold, Italic, List, Pilcrow, Redo2, Undo2 } from "lucide-react";
import FontFamily from "@tiptap/extension-font-family";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useId, useState, type ReactNode } from "react";
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
  const [variableQuery, setVariableQuery] = useState<{ from: number; query: string } | null>(null);
  const [activeVariableIndex, setActiveVariableIndex] = useState(0);
  const variableListId = useId();
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
      updateVariableQuery(currentEditor);
    },
    onSelectionUpdate: ({ editor: currentEditor }) => updateVariableQuery(currentEditor),
  });

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editable, editor]);

  useEffect(() => {
    if (!editor) return;
    const nextContent = content as JSONContent;
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(nextContent)) {
      editor.commands.setContent(nextContent);
    }
  }, [content, editor]);

  if (!editor) return <div className="min-h-72 animate-pulse rounded-md bg-panel-strong" />;

  function insertVariable(token: string) {
    if (!token) return;
    if (editor && variableQuery) {
      editor.chain().focus().deleteRange({ from: variableQuery.from, to: editor.state.selection.from }).insertContent(`${token} `).run();
      setVariableQuery(null);
      return;
    }
    editor?.chain().focus().insertContent(token).run();
  }

  function updateVariableQuery(currentEditor: NonNullable<typeof editor>) {
    if (!currentEditor.isEditable) return setVariableQuery(null);
    const { $from } = currentEditor.state.selection;
    const beforeCursor = $from.parent.textBetween(0, $from.parentOffset, undefined, "\ufffc");
    const match = beforeCursor.match(/(?:^|\s)@([\p{L}\p{N}_]*)$/u);
    setVariableQuery(match ? { from: $from.pos - match[0].trimStart().length, query: match[1].toLocaleLowerCase("fr") } : null);
    setActiveVariableIndex(0);
  }

  const suggestedVariables = variableQuery
    ? emailVariables.filter((variable) => variable.token.slice(1).includes(variableQuery.query)).slice(0, 7)
    : [];

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
              {(["Contact", "Spectacle", "Date et pièces"] as const).map((group) => (
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
      <div>
        <EditorContent
          aria-label={editable ? "Corps du message" : "Aperçu du message"}
          aria-autocomplete="list"
          aria-controls={variableQuery && suggestedVariables.length > 0 ? variableListId : undefined}
          aria-expanded={Boolean(variableQuery && suggestedVariables.length > 0)}
          aria-activedescendant={variableQuery && suggestedVariables[activeVariableIndex] ? `${variableListId}-${activeVariableIndex}` : undefined}
          className={cn(
            "email-editor min-h-72 px-6 py-5 text-sm leading-7 outline-none",
            !editable && "bg-white text-slate-900",
          )}
          editor={editor}
          onKeyDown={(event) => {
            if (!variableQuery || suggestedVariables.length === 0) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveVariableIndex((current) => (current + 1) % suggestedVariables.length);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveVariableIndex((current) => (current - 1 + suggestedVariables.length) % suggestedVariables.length);
            } else if (event.key === "Enter" || event.key === "Tab") {
              event.preventDefault();
              insertVariable(suggestedVariables[activeVariableIndex].token);
            } else if (event.key === "Escape") {
              event.preventDefault();
              setVariableQuery(null);
            }
          }}
        />
        {variableQuery && suggestedVariables.length > 0 ? (
          <div id={variableListId} className="border-t border-border bg-panel-strong/45 p-2" role="listbox" aria-label="Variables disponibles">
            <p className="px-2 pb-2 text-xs font-semibold text-muted">Insérer une information — ↑ ↓ pour choisir, Entrée pour insérer</p>
            <div className="grid gap-1 sm:grid-cols-2">
              {suggestedVariables.map((variable, index) => (
                <button id={`${variableListId}-${index}`} key={variable.token} aria-selected={index === activeVariableIndex} className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm focus-visible:outline-none ${index === activeVariableIndex ? "bg-accent text-white" : "hover:bg-panel"}`} role="option" type="button" onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActiveVariableIndex(index)} onClick={() => insertVariable(variable.token)}>
                  <span>{variable.label}</span><span className={index === activeVariableIndex ? "text-xs font-medium text-white/80" : "text-xs font-medium text-accent"}>{variable.token}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ToolbarButton({ children, label, active, disabled, onClick }: { children: ReactNode; label: string; active: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <Button aria-label={label} className={cn("h-11 min-h-11 w-11 p-0", active && "bg-accent !text-white")} disabled={disabled} title={label} type="button" variant="ghost" onClick={onClick}>
      <span className="[&>svg]:h-4 [&>svg]:w-4">{children}</span>
    </Button>
  );
}
