import * as React from "react";
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => (
    <textarea
      ref={ref}
      className={`w-full rounded-xl border border-gray-300 px-3 py-2 text-[15px] ${className}`}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
export default Textarea;
