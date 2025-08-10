import * as React from "react";
export function DropdownMenu({ children }: { children: React.ReactNode }) { return <div className="relative inline-block">{children}</div>; }
export function DropdownMenuTrigger({ asChild=false, children }: any) { return children; }
export function DropdownMenuContent({ children, align="end" }: any) {
  return <div className="absolute right-0 mt-2 min-w-[200px] rounded-xl border bg-white shadow">{children}</div>;
}
export function DropdownMenuItem({ children, onClick }: any) {
  return <button onClick={onClick} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">{children}</button>;
}
