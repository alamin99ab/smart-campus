import { cn } from "@/lib/utils";
import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  actionLabel,
  onAction,
  actionDisabled,
  className,
}: PageHeaderProps) {
  const actionNodes: ReactNode[] = [];

  if (actionLabel && onAction) {
    actionNodes.push(
      <Button key="primary-action" onClick={onAction} disabled={actionDisabled}>
        {actionLabel}
      </Button>
    );
  }

  if (actions) {
    actionNodes.push(
      <div key="extra-actions" className="flex items-center gap-2">{actions}</div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-foreground">
          {title}
        </h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actionNodes.length > 0 && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {actionNodes}
        </div>
      )}
    </div>
  );
}

