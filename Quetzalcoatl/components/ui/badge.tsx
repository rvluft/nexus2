import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "muted";
};

const variantClass: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-zinc-100 text-zinc-800",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-rose-100 text-rose-800",
  muted: "bg-zinc-200 text-zinc-700",
};

export function Badge({ children, variant = "default" }: BadgeProps) {
  return <span className={cn("rounded px-2 py-0.5 text-xs font-medium", variantClass[variant])}>{children}</span>;
}
