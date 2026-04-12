import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        coral: "border-transparent bg-eo-coral text-white",
        pink: "border-transparent bg-eo-pink text-white",
        blue: "border-transparent bg-eo-blue text-white",
        success: "border-transparent bg-green-500 text-white",
        positive: "bg-lifeline-positive-bg text-lifeline-positive border-lifeline-positive-light",
        negative: "bg-lifeline-negative-bg text-lifeline-negative border-lifeline-negative-light",
        neutral: "bg-transparent text-lifeline-ink-muted border-lifeline-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
