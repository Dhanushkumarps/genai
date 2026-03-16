import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> { }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    // Base - Clean, quiet, almost invisible
                    "flex h-9 w-full rounded-[8px] px-3 py-2",
                    "bg-[#22262A] border border-[rgba(255,255,255,0.04)]",
                    "text-[14px] text-[#E8E6E3] font-normal",
                    "placeholder:text-[#4A4845]",

                    // Transitions
                    "transition-all duration-\[120ms\] ease-\[cubic-bezier(0.25,0.1,0.25,1)\]",

                    // Hover - Subtle border change
                    "hover:border-[rgba(255,255,255,0.08)]",

                    // Focus - Muted yellow outline
                    "focus:outline-none focus:border-[#C49B3A] focus:ring-[3px] focus:ring-[rgba(196,155,58,0.06)]",

                    // Disabled
                    "disabled:cursor-not-allowed disabled:opacity-50",

                    // File input
                    "file:border-0 file:bg-transparent file:text-[13px] file:font-medium file:text-[#9A9996]",

                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = "Input"

export { Input }
