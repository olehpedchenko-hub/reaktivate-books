import { useEffect, useState } from "react";
import type { Controller } from "./Controller";

/**
 * Creates a controller once per mount, runs init() on mount and dispose() on
 * unmount. React 18 StrictMode double-invokes this effect in dev: init then
 * dispose then init again. Controllers make that safe by aborting in-flight
 * work in dispose() and guarding late results with an isDisposed flag /
 * AbortSignal, so the double-invoke costs one throwaway request, never a
 * stray render.
 */
export function useController<T extends Controller>(factory: () => T): T {
  const [controller] = useState(factory);
  useEffect(() => {
    controller.init?.();
    return () => controller.dispose?.();
  }, [controller]);
  return controller;
}
