"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const WAITING_COLOR = "#b91c1c";
const READY_COLOR = "#15803d";
const NEW_ORDER_COLOR = "#b91c1c";
const NEW_ORDER_COLOR_LIGHT = "#dc2626";
const READY_BTN_COLOR = "#b91c1c";
const READY_BTN_COLOR_LIGHT = "#dc2626";
const DONE_BTN_COLOR = "#15803d";
const DONE_BTN_COLOR_LIGHT = "#16a34a";

const CYCLE_START = 44;
const CYCLE_END = 53;
const NEW_ORDER_FLASH_MS = 280;
const BUTTON_FLASH_DELAY_MS = 1000;

type ReadyItem = { id: number; orderNumber: number };

type State = {
  waiting: number[];
  ready: ReadyItem[];
  nextOrder: number;
  nextId: number;
};

const initialState: State = {
  waiting: [CYCLE_START, CYCLE_START + 1],
  ready: [{ id: 1, orderNumber: CYCLE_START + 2 }],
  nextOrder: CYCLE_START + 3,
  nextId: 2,
};

export default function DashboardPreview() {
  const [state, setState] = useState<State>(initialState);
  const [flashNewOrder, setFlashNewOrder] = useState(false);
  const [flashReadyOrderNumber, setFlashReadyOrderNumber] = useState<number | null>(null);
  const [flashDoneId, setFlashDoneId] = useState<number | null>(null);
  const stepRef = useRef<"add" | "ready" | "done">("add");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      const step = stepRef.current;

      if (step === "add") {
        stepRef.current = "ready";
        setState((prev) => {
          if (prev.nextOrder > CYCLE_END) return prev;
          setFlashNewOrder(true);
          setTimeout(() => setFlashNewOrder(false), NEW_ORDER_FLASH_MS);
          return {
            ...prev,
            waiting: [...prev.waiting, prev.nextOrder],
            nextOrder: prev.nextOrder + 1,
          };
        });
        return;
      }

      if (step === "ready") {
        setState((prev) => {
          if (prev.waiting.length === 0) {
            stepRef.current = "done";
            return prev;
          }
          const first = prev.waiting[0];
          setFlashReadyOrderNumber(first);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            setState((p) => {
              if (p.waiting.length === 0) return p;
              const [f, ...rest] = p.waiting;
              return {
                ...p,
                waiting: rest,
                ready: [...p.ready, { id: p.nextId, orderNumber: f }],
                nextId: p.nextId + 1,
              };
            });
            setFlashReadyOrderNumber(null);
            stepRef.current = "done";
            timeoutRef.current = null;
          }, BUTTON_FLASH_DELAY_MS);
          return prev;
        });
        return;
      }

      // done
      setState((prev) => {
        if (prev.ready.length === 0) {
          stepRef.current = "add";
          return prev;
        }
        const firstId = prev.ready[0].id;
        setFlashDoneId(firstId);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setState((p) => ({
            ...p,
            ready: p.ready.slice(1),
          }));
          setFlashDoneId(null);
          stepRef.current = "add";
          timeoutRef.current = null;
        }, BUTTON_FLASH_DELAY_MS);
        return prev;
      });
    }, 2400);

    return () => {
      clearInterval(id);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Loop: reset when both columns empty
  useEffect(() => {
    if (state.waiting.length === 0 && state.ready.length === 0) {
      stepRef.current = "add";
      setState(initialState);
      setFlashReadyOrderNumber(null);
      setFlashDoneId(null);
    }
  }, [state.waiting.length, state.ready.length]);

  const { waiting, ready } = state;

  return (
    <Link
      href="/dashboard"
      className="block w-[80%] min-w-[280px] max-w-full cursor-pointer rounded-xl ring-1 ring-zinc-700 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.4)] transition-shadow hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] hover:ring-zinc-500"
      aria-label="Go to free dashboard"
    >
      <div
        className="relative flex h-[280px] flex-col overflow-hidden rounded-xl"
        style={{ backgroundColor: "#27272a" }}
      >
        <div className="shrink-0 border-b border-zinc-600 px-2 py-1 text-center text-[9px] font-semibold text-zinc-300">
          YOUR BUSINESS
        </div>
        <div className="flex min-h-0 flex-1">
          {/* WAITING - header never flashes */}
          <div className="min-w-0 flex-1 border-r border-zinc-600">
            <div
              className="shrink-0 px-1.5 py-0.5 text-center text-[8px] font-bold uppercase tracking-wide text-white"
              style={{ backgroundColor: WAITING_COLOR }}
            >
              Waiting
            </div>
            <div className="h-full space-y-0.5 overflow-y-auto p-1">
              {[...waiting].sort((a, b) => a - b).map((n) => (
                <div
                  key={`w-${n}`}
                  className="flex items-center justify-between rounded border border-zinc-600 bg-zinc-800 px-1.5 py-0.5"
                >
                  <span className="truncate text-[10px] font-bold text-white">
                    #{String(n).padStart(3, "0")}
                  </span>
                  <span
                    className="shrink-0 rounded px-1 py-0.5 text-[8px] font-medium text-white transition-colors duration-200"
                    style={{
                      backgroundColor: flashReadyOrderNumber === n ? READY_BTN_COLOR_LIGHT : READY_BTN_COLOR,
                    }}
                  >
                    Ready
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* QR column + New order button */}
          <div className="flex shrink-0 flex-col items-center justify-center gap-2 border-r border-zinc-600 bg-zinc-800/50 px-1.5 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded border border-zinc-600 bg-white">
              <div className="grid grid-cols-4 gap-px" aria-hidden>
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className="h-1 w-1 bg-zinc-800" />
                ))}
              </div>
            </div>
            <span className="text-[7px] text-zinc-500">Scan to wait</span>
            <div
              className="rounded px-2.5 py-1 text-[9px] font-bold uppercase text-white transition-colors duration-200"
              style={{ backgroundColor: flashNewOrder ? NEW_ORDER_COLOR_LIGHT : NEW_ORDER_COLOR }}
            >
              New order
            </div>
          </div>
          {/* READY - header never flashes */}
          <div className="min-w-0 flex-1">
            <div
              className="shrink-0 px-1.5 py-0.5 text-center text-[8px] font-bold uppercase tracking-wide text-white"
              style={{ backgroundColor: READY_COLOR }}
            >
              Ready
            </div>
            <div className="h-full space-y-0.5 overflow-y-auto p-1">
              {ready.map((item) => (
                <div
                  key={`r-${item.id}`}
                  className="flex items-center justify-between rounded border border-zinc-600 bg-zinc-800 px-1.5 py-0.5"
                >
                  <span className="truncate text-[10px] font-bold text-white">
                    #{String(item.orderNumber).padStart(3, "0")}
                  </span>
                  <span
                    className="shrink-0 rounded px-1 py-0.5 text-[8px] font-medium text-white transition-colors duration-200"
                    style={{
                      backgroundColor: flashDoneId === item.id ? DONE_BTN_COLOR_LIGHT : DONE_BTN_COLOR,
                    }}
                  >
                    Done
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="shrink-0 border-t border-zinc-600 px-2 py-0.5 text-center text-[8px] text-zinc-500">
          QReady.io
        </div>
      </div>
    </Link>
  );
}
