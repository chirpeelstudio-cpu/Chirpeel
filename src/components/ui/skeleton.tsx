import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/60 isolate",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer",
        "before:bg-gradient-to-r before:from-transparent before:via-foreground/10 before:to-transparent",
        "motion-reduce:before:hidden motion-reduce:animate-pulse",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
