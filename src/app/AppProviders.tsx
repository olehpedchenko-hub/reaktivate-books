import type { ReactNode } from "react";
import { DiProvider } from "../core/di/DiContext";
import { createContainer } from "../core/di/Container";

// Constructed once at module load, not via useState: the container is a
// singleton for the app's lifetime, and building it doesn't need a render.
const container = createContainer();

export function AppProviders({ children }: { children: ReactNode }) {
  return <DiProvider container={container}>{children}</DiProvider>;
}
