"use client";
import * as React from "react";
export function Dialog({ open, onOpenChange, children }: { open:boolean; onOpenChange:(v:boolean)=>void; children: React.ReactNode }) {
  React.useEffect(()=>{ function onKey(e:KeyboardEvent){ if(e.key==="Escape") onOpenChange(false);} window.addEventListener("keydown", onKey); return ()=>window.removeEventListener("keydown", onKey); },[onOpenChange]);
  return open ? <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/30" onClick={()=>onOpenChange(false)} />
    {children}
  </div> : null;
}
export function DialogContent({ className, children }: any) {
  return <div className={`relative z-10 w-[90%] max-w-md rounded-2xl bg-white border shadow ${className||""}`}>{children}</div>;
}
export function DialogHeader({ children }: any) { return <div className="p-4 border-b">{children}</div>; }
export function DialogFooter({ className, children }: any) { return <div className={`p-4 flex justify-end gap-2 ${className||""}`}>{children}</div>; }
export function DialogTitle({ children }: any) { return <h3 className="font-semibold text-lg">{children}</h3>; }
export function DialogDescription({ children }: any) { return <p className="text-sm text-gray-600 mt-1">{children}</p>; }
