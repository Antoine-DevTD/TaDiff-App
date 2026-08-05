"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { emailVariables } from "@/lib/email-template-variables";

export function VariableInput({ value, onChange, ...props }: Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> & { value: string; onChange: (value: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [match, setMatch] = useState<{ from: number; to: number; query: string } | null>(null);

  function updateSuggestions(nextValue: string, cursor: number) {
    const beforeCursor = nextValue.slice(0, cursor);
    const current = beforeCursor.match(/(?:^|\s)@([\p{L}\p{N}_]*)$/u);
    setMatch(current ? { from: cursor - current[0].trimStart().length, to: cursor, query: current[1].toLocaleLowerCase("fr") } : null);
  }

  function insert(token: string) {
    if (!match) return;
    const nextValue = `${value.slice(0, match.from)}${token} ${value.slice(match.to)}`;
    onChange(nextValue);
    setMatch(null);
    requestAnimationFrame(() => {
      const cursor = match.from + token.length + 1;
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(cursor, cursor);
    });
  }

  const suggestions = match
    ? emailVariables.filter((variable) => variable.token.slice(1).includes(match.query)).slice(0, 7)
    : [];

  return (
    <div className="relative">
      <Input
        {...props}
        ref={inputRef}
        value={value}
        onBlur={() => window.setTimeout(() => setMatch(null), 150)}
        onChange={(event) => {
          onChange(event.target.value);
          updateSuggestions(event.target.value, event.target.selectionStart ?? event.target.value.length);
        }}
        onKeyUp={(event) => updateSuggestions(event.currentTarget.value, event.currentTarget.selectionStart ?? event.currentTarget.value.length)}
      />
      {match && suggestions.length > 0 ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.375rem)] z-20 overflow-hidden rounded-md border border-border bg-panel shadow-xl shadow-ink/15" role="listbox" aria-label="Variables disponibles">
          {suggestions.map((variable) => (
            <button key={variable.token} className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-panel-strong focus-visible:bg-panel-strong focus-visible:outline-none" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => insert(variable.token)}>
              <span>{variable.label}</span><span className="text-xs font-medium text-accent">{variable.token}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
