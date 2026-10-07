"use client";

import { Children, forwardRef, isValidElement, useEffect, useId, useMemo, useRef, useState, type ReactNode, type SelectHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { searchable?: boolean };

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, searchable, ...props }, ref) {
  if (searchable) return <SearchableSelect {...props} className={className} ref={ref} />;
  return (
    <select
      ref={ref}
      className={cn(
        "min-h-11 w-full rounded-md border border-border bg-panel px-3 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15 [&_option]:bg-panel [&_option]:text-foreground",
        className,
      )}
      {...props}
    />
  );
  },
);

function textContent(node: ReactNode): string {
  return Children.toArray(node).map((child) => isValidElement<{ children?: ReactNode }>(child) ? textContent(child.props.children) : String(child)).join("");
}

export function matchesPersonSearch(text: string, query: string) {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
  const haystack = normalize(text);
  return normalize(query).trim().split(/\s+/).every((term) => haystack.includes(term));
}

type Choice = { value: string; label: string; disabled: boolean };
function readChoices(children: ReactNode, groupDisabled = false): Choice[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ children?: ReactNode; value?: string | number; disabled?: boolean }>(child)) return [];
    if (child.type === "option") return [{ value: String(child.props.value ?? textContent(child.props.children)), label: textContent(child.props.children), disabled: groupDisabled || Boolean(child.props.disabled) }];
    return readChoices(child.props.children, groupDisabled || Boolean(child.props.disabled));
  });
}

const SearchableSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function SearchableSelect({ children, className, id, onChange, onBlur, onInvalid, ...props }, forwardedRef) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const listId = `${inputId}-results`;
    const nativeRef = useRef<HTMLSelectElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const choices = useMemo(() => readChoices(children), [children]);
    const [uncontrolledValue, setUncontrolledValue] = useState(String(props.defaultValue ?? choices[0]?.value ?? ""));
    const value = String(props.value ?? uncontrolledValue);
    const selected = choices.find((choice) => choice.value === value);
    const [query, setQuery] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [invalid, setInvalid] = useState(false);
    const [active, setActive] = useState(0);
    const [position, setPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 240 });
    const matches = choices.filter((choice) => !choice.disabled && matchesPersonSearch(choice.label, query ?? ""));
    const activeIndex = Math.min(active, matches.length - 1);

    useEffect(() => {
      const native = nativeRef.current;
      const reset = () => requestAnimationFrame(() => { setUncontrolledValue(native?.value ?? ""); setQuery(null); setOpen(false); setInvalid(false); });
      native?.form?.addEventListener("reset", reset);
      return () => native?.form?.removeEventListener("reset", reset);
    }, []);

    useEffect(() => {
      if (!open) return;
      function place() {
        const rect = inputRef.current?.getBoundingClientRect();
        if (!rect) return;
        const below = window.innerHeight - rect.bottom - 12;
        const above = rect.top - 12;
        const height = Math.min(240, Math.max(below, above));
        setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)), top: below >= Math.min(240, above) ? rect.bottom + 4 : Math.max(8, rect.top - height - 4), width: Math.min(rect.width, window.innerWidth - 16), maxHeight: height });
      }
      const outside = (event: PointerEvent) => {
        if (event.target instanceof Node && !inputRef.current?.contains(event.target) && !popupRef.current?.contains(event.target)) { setOpen(false); setQuery(null); }
      };
      place();
      window.addEventListener("resize", place);
      window.addEventListener("scroll", place, true);
      document.addEventListener("pointerdown", outside);
      return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); document.removeEventListener("pointerdown", outside); };
    }, [open]);

    useEffect(() => { if (open) document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: "nearest" }); }, [activeIndex, listId, open]);

    function choose(choice: Choice) {
      const native = nativeRef.current;
      if (!native || props.disabled) return;
      // Keep the real select as the form value and event target, including react-hook-form refs.
      native.value = choice.value;
      native.dispatchEvent(new Event("change", { bubbles: true }));
      setQuery(null);
      setOpen(false);
      inputRef.current?.focus();
    }

    return <>
      <input ref={inputRef} id={inputId} role="combobox" type="text" autoComplete="off" disabled={props.disabled} form={props.form} autoFocus={props.autoFocus} tabIndex={props.tabIndex} title={props.title} style={props.style}
        aria-label={props["aria-label"]} aria-labelledby={props["aria-labelledby"]} aria-describedby={[props["aria-describedby"], invalid ? `${inputId}-error` : null].filter(Boolean).join(" ") || undefined} aria-invalid={props["aria-invalid"] ?? invalid} aria-required={props.required}
        aria-expanded={open && !props.disabled} aria-controls={open ? listId : undefined} aria-autocomplete="list" aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        className={cn("min-h-11 w-full min-w-0 rounded-md border border-border bg-panel px-3 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-50", className)}
        placeholder="Écrivez un nom…" value={query ?? selected?.label ?? ""}
        onFocus={() => { setQuery(""); setActive(0); setOpen(true); }}
        onClick={() => { if (!open) { setQuery(""); setActive(0); setOpen(true); } }}
        onChange={(event) => { setQuery(event.target.value); setActive(0); setOpen(true); }}
        onBlur={() => { setOpen(false); setQuery(null); nativeRef.current?.dispatchEvent(new FocusEvent("focusout", { bubbles: true })); }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); setQuery(null); }
          else if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); if (!open) { setOpen(true); setQuery(""); setActive(0); } else setActive((current) => Math.max(0, Math.min(matches.length - 1, current + (event.key === "ArrowDown" ? 1 : -1)))); }
          else if (event.key === "Enter" && open) { event.preventDefault(); if (matches[activeIndex]) choose(matches[activeIndex]); }
        }} />
      <select {...props} id={`${inputId}-value`} ref={(node) => {
        nativeRef.current = node;
        // Form libraries focus their registered field when validation fails.
        if (node) node.focus = (options) => inputRef.current?.focus(options);
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }} hidden tabIndex={-1} aria-hidden="true"
        onFocus={() => inputRef.current?.focus()}
        onBlur={onBlur}
        onInvalid={(event) => { event.preventDefault(); setInvalid(true); onInvalid?.(event); inputRef.current?.focus(); setOpen(true); }}
        onChange={(event) => { setInvalid(false); setUncontrolledValue(event.target.value); onChange?.(event); }}>
        {children}
      </select>
      {invalid ? <p id={`${inputId}-error`} role="alert" className="mt-1 text-xs text-danger">Choisissez une personne dans les résultats.</p> : null}
      {open && !props.disabled ? createPortal(<div ref={popupRef} style={{ position: "fixed", zIndex: 100, ...position }} className="overflow-y-auto overscroll-contain rounded-md border border-border bg-panel shadow-md">
        <div id={listId} role="listbox" aria-label={props["aria-label"] ?? "Personnes proposées"}>
          {matches.map((choice, index) => <div key={choice.value} id={`${listId}-${index}`} role="option" aria-selected={choice.value === value}
            className={cn("min-h-11 cursor-pointer whitespace-normal break-words px-3 py-3 text-sm text-foreground", index === activeIndex && "bg-accent/10 text-accent")}
            onPointerDown={(event) => event.preventDefault()} onClick={() => choose(choice)} onMouseMove={() => setActive(index)}>{choice.label}</div>)}
        </div>
        {!matches.length ? <p role="status" className="px-3 py-3 text-sm text-muted">Aucune personne trouvée. Essayez un autre nom.</p> : null}
      </div>, document.body) : null}
    </>;
  },
);
