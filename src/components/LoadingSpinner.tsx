import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  text?: string;
  size?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: "h-6 w-6",
  md: "h-10 w-10",
  lg: "h-14 w-14",
};

export function LoadingSpinner({ className, text, size = "md" }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4", className)}>
      <div className="relative">
        <Loader2 className={cn("animate-spin text-primary", sizeStyles[size])} />
        <div className={cn(
          "absolute inset-0 animate-ping opacity-20 rounded-full bg-primary",
          sizeStyles[size]
        )} />
      </div>
      {text && (
        <p className="text-sm text-muted-foreground mt-4 font-medium animate-pulse">{text}</p>
      )}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner text="Loading..." />
    </div>
  );
}

export function SkeletonLoader({ className, count = 1 }: { className?: string; count?: number }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-4 bg-muted rounded-md w-full" />
        </div>
      ))}
    </div>
  );
}
