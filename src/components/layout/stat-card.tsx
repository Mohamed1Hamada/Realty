import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "primary",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "primary" | "success" | "danger" | "warning" | "muted";
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/12 text-success",
    danger: "bg-destructive/12 text-destructive",
    warning: "bg-accent/15 text-accent",
    muted: "bg-secondary text-secondary-foreground",
  };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="num mt-1.5 text-2xl font-bold leading-none">{value}</p>
          {hint ? (
            <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        <div className={cn("rounded-lg p-2.5", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
