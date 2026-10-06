"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { stripAccents } from "@/lib/answers";
import { cn } from "@/lib/utils";

const fold = (s: string) => stripAccents(s.toLowerCase().trim());

/**
 * Search box with infinitive autocomplete. Suggestions come from the verb list passed in; Enter on
 * anything else (a conjugated form like "fui") goes to the page, which resolves it on the server.
 */
export function VerbSearch({
  verbs,
  initial,
}: {
  verbs: { inf: string; en: string }[];
  initial: string;
}) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const q = fold(value);
  const suggestions = q
    ? [
        ...verbs.filter((v) => fold(v.inf).startsWith(q)),
        ...verbs.filter((v) => !fold(v.inf).startsWith(q) && (fold(v.inf).includes(q) || fold(v.en).includes(q))),
      ].slice(0, 8)
    : [];
  const show = open && suggestions.length > 0;

  const go = (verb: string) => {
    setOpen(false);
    if (!verb.trim()) return;
    setValue(verb);
    router.push(`/verbs?v=${encodeURIComponent(verb.trim())}`);
  };

  return (
    <form
      role="search"
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        go(show && active >= 0 ? suggestions[active].inf : value);
      }}
    >
      <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        autoFocus
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && suggestions.length) {
            e.preventDefault();
            setOpen(true);
            setActive((a) => (a + 1) % suggestions.length);
          } else if (e.key === "ArrowUp" && suggestions.length) {
            e.preventDefault();
            setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1));
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Type a verb or a form: hablar, fui, tengo…"
        aria-label="Search verbs"
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={show && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        className="h-11 rounded-full pr-11 pl-10 text-base"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          title="Clear"
          // Keep focus in the input (blur would close the list first).
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setValue("");
            setActive(-1);
            inputRef.current?.focus();
          }}
          className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
      {show && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden rounded-2xl border bg-popover py-1 text-popover-foreground shadow-lg"
        >
          {suggestions.map((v, i) => (
            <li
              key={v.inf}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => go(v.inf)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex cursor-pointer items-baseline gap-3 px-4 py-2",
                i === active && "bg-muted",
              )}
            >
              <span className="font-semibold">{v.inf}</span>
              <span className="min-w-0 truncate text-sm text-muted-foreground">{v.en}</span>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
