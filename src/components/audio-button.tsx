"use client";

import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

let current: HTMLAudioElement | null = null;

/** Plays a pronunciation clip, stopping any clip already playing. Autoplay may be blocked. */
export function playAudio(url: string | null | undefined) {
  if (!url) return;
  current?.pause();
  current = new Audio(url);
  current.play().catch(() => {});
}

export function AudioButton({ url, label = "Play pronunciation" }: { url: string | null; label?: string }) {
  if (!url) return null;
  return (
    <Button type="button" variant="ghost" size="icon-sm" aria-label={label} title={label} onClick={() => playAudio(url)}>
      <Volume2 />
    </Button>
  );
}
