import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] select-none touch-manipulation",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 shadow-gentle hover:shadow-medium",
        destructive:
          "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-gentle hover:shadow-medium",
        outline:
          "border-2 border-primary-200 bg-white/90 backdrop-blur-sm hover:bg-primary-50 hover:text-primary-700 hover:border-primary-300 shadow-soft hover:shadow-gentle",
        secondary:
          "bg-gradient-to-r from-secondary-100 to-secondary-200 text-secondary-800 hover:from-secondary-200 hover:to-secondary-300 shadow-soft hover:shadow-gentle",
        ghost: "hover:bg-primary-50 hover:text-primary-700 transition-colors duration-200",
        link: "text-primary-600 underline-offset-4 hover:underline hover:text-primary-700 transition-colors duration-200",
      },
      size: {
        default: "h-11 px-6 py-3 min-w-[44px]",
        sm: "h-9 px-4 py-2 text-xs min-w-[36px]",
        lg: "h-14 px-8 py-4 text-base min-w-[44px]",
        icon: "h-11 w-11 min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
