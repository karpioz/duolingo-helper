"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Form controls shared by the test setup and the personal test creator. */

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="mb-2 font-heading text-base font-bold tracking-tight">{label}</legend>
      {children}
    </fieldset>
  );
}

export function OptionCard({
  selected,
  onClick,
  label,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-2xl border p-3.5 text-left transition-colors",
        selected ? "border-primary bg-danger-soft ring-1 ring-primary" : "bg-card hover:bg-muted",
      )}
    >
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs text-muted-foreground">{hint}</div>
    </button>
  );
}

export function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button type="button" variant={selected ? "default" : "outline"} aria-pressed={selected} onClick={onClick}>
      {children}
    </Button>
  );
}
