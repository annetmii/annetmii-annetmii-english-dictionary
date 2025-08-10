"use client";
import * as React from "react";
import { clsx } from "clsx";
export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default"|"outline"|"ghost", size?: "sm"|"md"|"lg" }>(
  ({ className, variant="default", size="md", ...props }, ref) => (
    <button
      ref={ref}
      className={clsx(
        "rounded-xl px-3 py-2 text-sm transition border",
        variant==="default" && "bg-black text-white border-black",
        variant==="outline" && "bg-white text-black border-gray-300",
        variant==="ghost" && "bg-transparent border-transparent text-black",
        size==="sm" && "px-2 py-1.5 text-sm",
        className
      )}
      {...props}
    />
  )
);
Button.displayName="Button";
export default Button;
