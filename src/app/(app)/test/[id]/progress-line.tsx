import { Progress } from "@/components/ui/progress";

/** "4 / 10 ━━━━━━──── 3 correct": the count, a thick terracotta bar and a note on the right. */
export function ProgressLine({ done, total, note }: { done: number; total: number; note: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 tabular-nums">
      <span className="shrink-0 font-heading text-base font-extrabold">
        {done}
        <span className="font-medium text-muted-foreground"> / {total}</span>
      </span>
      <Progress
        value={total ? (done / total) * 100 : 0}
        aria-label="Progress"
        className="min-w-0 flex-1"
        trackClassName="h-2.5"
        indicatorClassName="bg-terracotta"
      />
      <span className="shrink-0 text-sm font-bold text-teal">{note}</span>
    </div>
  );
}
