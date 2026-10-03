"use client";

import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

let current: HTMLAudioElement | null = null;

/** Plays a pronunciation clip, stopping any clip already playing. Autoplay may be blocked. */
export function playAudio(url: string | null | undefined) {
  if (!url) return;
  current?.pause();
  current = new Audio(url);
  current.play().catch(() => {});
}

/**
 * `ghost`: a small icon button (lists, results). `solid`: the Azulejo teal circle (Words page,
 * test prompts).
 */
export function AudioButton({
  url,
  label = "Play pronunciation",
  variant = "ghost",
  className,
}: {
  url: string | null;
  label?: string;
  variant?: "ghost" | "solid";
  className?: string;
}) {
  if (!url) return null;
  if (variant === "solid") {
    return (
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => playAudio(url)}
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full bg-teal text-primary-foreground transition-colors outline-none hover:bg-teal/85 focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px [&_svg]:size-5",
          className,
        )}
      >
        <Volume2 />
      </button>
    );
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      onClick={() => playAudio(url)}
      className={className}
    >
      <Volume2 />
    </Button>
  );
}
