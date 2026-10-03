import type { TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-sm border border-line bg-ink px-3 py-2 text-sm text-white placeholder:text-muted focus-visible:border-amber focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}
