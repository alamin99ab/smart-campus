import { cn } from "@/lib/utils";
import { type LucideIcon, Inbox, Search, FileX, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  variant?: "default" | "search" | "error" | "minimal";
}

const variantIcons = {
  default: Inbox,
  search: Search,
  error: AlertCircle,
  minimal: FileX,
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  className,
  variant = "default",
}: EmptyStateProps) {
  const IconComponent = icon || variantIcons[variant];
  const resolvedAction = action || (actionLabel && onAction ? { label: actionLabel, onClick: onAction } : undefined);
  
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in",
      className
    )}>
      <div className={cn(
        "w-16 h-16 rounded-2xl flex items-center justify-center mb-4",
        variant === "error" 
          ? "bg-destructive/10 text-destructive" 
          : "bg-muted text-muted-foreground"
      )}>
        <IconComponent className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>
      )}
      {resolvedAction && (
        <Button onClick={resolvedAction.onClick} variant="outline" size="sm">
          {resolvedAction.label}
        </Button>
      )}
    </div>
  );
}
