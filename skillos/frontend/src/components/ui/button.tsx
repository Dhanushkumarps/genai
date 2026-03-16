import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[5px] text-[13px] font-medium transition-all duration-\[120ms\] ease-\[cubic-bezier(0.25,0.1,0.25,1)\] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(196,155,58,0.4)] disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                // Primary - Only button with accent color
                default: "bg-[#C49B3A] text-[#0F1113] hover:bg-[#D4A844]",

                // Destructive - Muted red
                destructive: "bg-[#B85450] text-[#E8E6E3] hover:bg-[#C45E5A]",

                // Outline - Subtle border
                outline: "border border-[rgba(255,255,255,0.08)] bg-transparent text-[#E8E6E3] hover:bg-[#292E33] hover:border-[rgba(255,255,255,0.12)]",

                // Secondary - Subtle background
                secondary: "bg-[#22262A] text-[#E8E6E3] border border-[rgba(255,255,255,0.08)] hover:bg-[#292E33]",

                // Ghost - Most minimal
                ghost: "text-[#9A9996] hover:bg-[#292E33] hover:text-[#E8E6E3]",

                // Link - Text only
                link: "text-[#C49B3A] underline-offset-4 hover:text-[#D4A844] hover:underline",

                // Neon - Glowing accent
                neon: "bg-gradient-to-r from-violet-600 to-purple-600 text-white border border-violet-500/50 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] hover:from-violet-500 hover:to-purple-500",
            },
            size: {
                default: "h-9 px-4 py-2",
                sm: "h-8 px-3 text-[12px]",
                lg: "h-10 px-5",
                icon: "h-9 w-9 p-0",
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
