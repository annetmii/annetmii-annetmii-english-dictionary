import * as React from "react";
type Props = { checked?: boolean; onCheckedChange?: (v:boolean)=>void; className?: string };
export function Switch({ checked=false, onCheckedChange, className }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange && onCheckedChange(!checked)}
      className={(className||"")+" inline-flex items-center w-12 h-6 rounded-full "+(checked?"bg-black":"bg-gray-300")}
    >
      <span className={"h-5 w-5 bg-white rounded-full transition-transform "+(checked?"translate-x-6":"translate-x-1")}></span>
    </button>
  );
}
export default Switch;
