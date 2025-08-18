import * as React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline";
  size?: "sm" | "md";
};
export const Button = React.forwardRef<HTMLButtonElement, Props>(
  ({ className = "", variant = "default", size = "md", ...props }, ref) => {
    const v =
      variant === "outline"
        ? "border border-gray-300 bg-white hover:bg-gray-50"
        : "bg-black text-white hover:bg-gray-800";
    const s = size === "sm" ? "px-3 py-1.5 text-sm rounded-xl" : "px-4 py-2 rounded-xl";
    return (
      <button ref={ref} className={`${v} ${s} ${className}`} {...props} />
    );
  }
);
Button.displayName = "Button";
export default Button;
