"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";

/**
 * A short label shown on hover or focus, above `children` (the trigger, rendered as is). Use it
 * for icon-only buttons; give the button its own `aria-label` too.
 */
export function Tooltip({
  label,
  children,
  className,
}: {
  label: React.ReactNode;
  children: React.ReactElement;
  className?: string;
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger delay={300} render={children} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side="top" sideOffset={6} className="z-50">
          <TooltipPrimitive.Popup
            className={cn(
              "max-w-64 rounded-lg bg-foreground px-2.5 py-1.5 text-xs text-background shadow-md",
              "origin-(--transform-origin) transition-[opacity,scale] duration-150",
              "data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
              className,
            )}
          >
            {label}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
