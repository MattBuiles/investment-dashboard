import { cn } from "@/lib/utils";

export function GlassCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border backdrop-blur-xl",
        "border-[var(--glass-border)] bg-[var(--glass-bg)]",
        "shadow-[var(--glass-shadow)]",
        className
      )}
      {...props}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at top left, color-mix(in oklab, var(--accent) 25%, transparent), transparent 60%), radial-gradient(ellipse at bottom right, color-mix(in oklab, var(--accent-2) 20%, transparent), transparent 60%)",
        }}
      />
      {props.children}
    </div>
  );
}
