"use client";
import * as React from "react";

type DialogProps = {
  open: boolean;
  onOpenChange?: (o: boolean) => void;
  children: React.ReactNode;
  className?: string;
};
export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null;
  return (
    <div
      onClick={() => onOpenChange?.(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

export function DialogContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`w-[92vw] max-w-md rounded-2xl bg-white p-4 shadow-xl ${className}`}>{children}</div>;
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-2">{children}</div>;
}
export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-3 flex justify-end gap-2">{children}</div>;
}
export function DialogTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold">{children}</h3>;
}
export function DialogDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-600">{children}</p>;
}

export default Dialog;
