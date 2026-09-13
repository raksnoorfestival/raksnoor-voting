"use client";

import { useState, useTransition } from "react";
import { setEntryNumber } from "@/actions/admin";

// The running order number, edited in place and saved on blur.
export function EntryNumber({ entryId, number, disabled }: { entryId: string; number: number; disabled: boolean }) {
  const [value, setValue] = useState(String(number));
  const [pending, start] = useTransition();
  const save = () => {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n === number) {
      setValue(String(number));
      return;
    }
    start(() => setEntryNumber(entryId, n));
  };
  return (
    <input
      type="number"
      min={1}
      value={value}
      disabled={disabled || pending}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className="h-9 w-16 rounded-lg border border-neutral-300 bg-white text-center font-bold outline-none focus:border-wine disabled:bg-neutral-100"
      aria-label="Running order number"
    />
  );
}
