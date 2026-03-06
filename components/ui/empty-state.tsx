import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  size?: "sm" | "default" | "lg";
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  size = "default",
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center animate-in fade-in-50",
        {
          "p-8 gap-4": size === "default",
          "p-4 gap-2": size === "sm",
          "p-12 gap-6": size === "lg",
        },
        className
      )}
      {...props}
    >
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
          <Icon className="h-6 w-6 text-zinc-500 dark:text-zinc-400" />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
            {description}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}