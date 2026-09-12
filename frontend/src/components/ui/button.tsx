import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

// Тонкая «волосяная» рамка на залитых кнопках, как в iOS: чуть темнит край в
// светлой теме, чуть светлит в темной.
const hairline = "border border-black/[0.08] dark:border-white/10";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: `${hairline} bg-primary text-primary-foreground hover:bg-primary-dark`,
        ai: `${hairline} bg-ai text-ai-foreground hover:bg-ai/90`,
        destructive: `${hairline} bg-destructive text-destructive-foreground hover:bg-destructive/90`,
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: `${hairline} bg-secondary text-secondary-foreground hover:bg-secondary/80`,
        ghost: "shadow-none hover:bg-accent hover:text-accent-foreground",
        link: "shadow-none text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-3.5",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  ),
);
Button.displayName = "Button";
