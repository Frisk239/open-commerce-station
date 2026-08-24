"use client";

import { useRef, useState } from "react";

interface FilePickerProps {
  readonly name: string;
  readonly accept: string;
  readonly buttonLabel: string;
  readonly placeholder?: string;
}

export function FilePicker({ name, accept, buttonLabel, placeholder = "No file chosen" }: FilePickerProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  return (
    <label className="mt-3 flex items-center gap-3">
      <button type="button" onClick={() => ref.current?.click()} className="cursor-pointer rounded-full bg-stone-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-800">{buttonLabel}</button>
      <span className="text-sm text-stone-500">{fileName || placeholder}</span>
      <input ref={ref} type="file" name={name} accept={accept} className="sr-only" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} />
    </label>
  );
}
