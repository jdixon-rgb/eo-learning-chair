import { forwardRef } from "react"
import { cn } from "@/lib/utils"

// Minimal Label primitive. The original Lifeline version used
// @radix-ui/react-label for its association behavior, but a plain <label>
// element with htmlFor covers every use case we actually need here and
// saves the dependency.
const Label = forwardRef(({ className, ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
})
Label.displayName = "Label"

export { Label }
