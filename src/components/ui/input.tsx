import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        className={cn(
          "h-11 w-full rounded-sm border border-line bg-ink px-3 text-sm text-white placeholder:text-muted focus-visible:border-amber focus-visible:outline-none",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
