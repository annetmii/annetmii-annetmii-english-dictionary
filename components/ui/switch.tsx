import * as React from "react";

type Props = {
  checked: boolean;
  onCheckedChange?: (v: boolean) => void;
  className?: string;
};
export function Switch({ checked, onCheckedChange, className = "" }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      className={`inline-flex h-6 w-11 items-center rounded-full border transition
        ${checked ? "bg-black" : "bg-gray-300"} ${className}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition
          ${checked ? "translate-x-5" : "translate-x-1"}`}
      />
    </button>
  );
}
export default Switch;
