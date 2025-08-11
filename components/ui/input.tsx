"use client";
import * as React from "react";
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
  ref={ref}
  className={`w-full border rounded-xl px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 ${className||""}`}
  {...props}
/>
  )
);
Input.displayName="Input";
export default Input;
