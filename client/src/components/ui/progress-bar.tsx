import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  className?: string;
  showLabel?: boolean;
}

export default function ProgressBar({ value, className, showLabel = false }: ProgressBarProps) {
  const clampedValue = Math.min(Math.max(value, 0), 100);

  return (
    <div className={cn("progress-bar h-2", className)}>
      <div
        className="progress-fill h-full rounded-full"
        style={{ width: `${clampedValue}%` }}
      />
      {showLabel && (
        <div className="text-xs text-slate-600 mt-1 text-right">
          {clampedValue}%
        </div>
      )}
    </div>
  );
}
