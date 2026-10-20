"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ToastKind = "" | "good" | "bad";
interface ToastItem {
  id: number;
  text: string;
  kind: ToastKind;
  leaving: boolean;
}

const SHOW_MS = 1900;
const MAX_VISIBLE = 2;

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  }, []);

  const toast = useCallback(
    (text: string, kind: ToastKind = "") => {
      const id = nextId.current++;
      setToasts((list) => [...list, { id, text, kind, leaving: false }].slice(-MAX_VISIBLE));
      later(() => setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t))), SHOW_MS);
      later(() => setToasts((list) => list.filter((t) => t.id !== id)), SHOW_MS + 260);
    },
    [later]
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  return { toasts, toast };
}

export function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind} ${t.leaving ? "out" : ""}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
