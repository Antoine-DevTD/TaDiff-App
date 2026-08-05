"use client";

import { useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { emailVariables } from "@/lib/email-template-variables";

export function VariableInput({ value, onChange, ...props }: Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> & { value: string; onChange: (value: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [match, setMatch] = useState<{ from: number; to: number; query: string } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function updateSuggestions(nextValue: string, cursor: number) {
    const beforeCursor = nextValue.slice(0, cursor);
    const current = beforeCursor.match(/(?:^|\s)@([\p{L}\p{N}_]*)$/u);
    setMatch(current ? { from: cursor - current[0].trimStart().length, to: cursor, query: current[1].toLocaleLowerCase("fr") } : null);
    setActiveIndex(0);
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
        aria-autocomplete="list"
        aria-controls={match && suggestions.length > 0 ? listId : undefined}
        aria-expanded={Boolean(match && suggestions.length > 0)}
        aria-activedescendant={match && suggestions[activeIndex] ? `${listId}-${activeIndex}` : undefined}
        onKeyDown={(event) => {
          if (!match || suggestions.length === 0) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((current) => (current + 1) % suggestions.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((current) => (current - 1 + suggestions.length) % suggestions.length);
          } else if (event.key === "Enter" || event.key === "Tab") {
            event.preventDefault();
            insert(suggestions[activeIndex].token);
          } else if (event.key === "Escape") {
            event.preventDefault();
            setMatch(null);
          }
        }}
        onKeyUp={(event) => {
          if (["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(event.key)) return;
          updateSuggestions(event.currentTarget.value, event.currentTarget.selectionStart ?? event.currentTarget.value.length);
        }}
      />
      {match && suggestions.length > 0 ? (
        <div id={listId} className="absolute left-0 right-0 top-[calc(100%+0.375rem)] z-20 overflow-hidden rounded-md border border-border bg-panel shadow-xl shadow-ink/15" role="listbox" aria-label="Variables disponibles">
          {suggestions.map((variable, index) => (
            <button id={`${listId}-${index}`} key={variable.token} aria-selected={index === activeIndex} className={`flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm focus-visible:outline-none ${index === activeIndex ? "bg-accent/10 text-foreground" : "hover:bg-panel-strong"}`} role="option" type="button" onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActiveIndex(index)} onClick={() => insert(variable.token)}>
              <span>{variable.label}</span><span className="text-xs font-medium text-accent">{variable.token}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
