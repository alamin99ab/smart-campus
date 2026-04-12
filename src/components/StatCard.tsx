import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: { value: number; label: string };
  variant?: "default" | "primary" | "success" | "warning" | "info";
}

const variantStyles = {
  default: "bg-card hover:bg-card/80",
  primary: "bg-primary/5 border-primary/20 hover:bg-primary/10",
  success: "bg-success/5 border-success/20 hover:bg-success/10",
  warning: "bg-warning/5 border-warning/20 hover:bg-warning/10",
  info: "bg-info/5 border-info/20 hover:bg-info/10",
};

const iconStyles = {
  default: "bg-secondary text-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
};

export function StatCard({ title, value, icon: Icon, description, trend, variant = "default" }: StatCardProps) {
  return (
    <div className={cn(
      "stat-card animate-fade-in group cursor-default",
      variantStyles[variant]
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">{title}</p>
          <p className="text-xl sm:text-2xl font-bold font-heading mt-1 tracking-tight">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{description}</p>
          )}
          {trend && (
            <div className={cn(
              "inline-flex items-center gap-1 text-xs mt-2 font-medium px-2 py-0.5 rounded-full",
              trend.value >= 0 
                ? "text-success bg-success/10" 
                : "text-destructive bg-destructive/10"
            )}>
              <span>{trend.value >= 0 ? "↑" : "↓"}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn(
          "w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
          iconStyles[variant]
        )}>
          <Icon className="h-5 w-5 sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  );
}
