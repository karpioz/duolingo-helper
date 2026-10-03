"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyScriptButton({ script }: { script: string }) {
  const [copied, setCopied] = useState<boolean | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(script);
            setCopied(true);
            setTimeout(() => setCopied(null), 3000);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? <Check /> : <Copy />}
        {copied ? "Copied" : "Copy script"}
      </Button>
      {copied === false && <span className="text-xs text-danger">Couldn’t copy: allow clipboard access and try again.</span>}
    </span>
  );
}
