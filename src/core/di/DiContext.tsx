import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { Container } from "./Container";

const DiContext = createContext<Container | null>(null);

export function DiProvider({
  container,
  children,
}: {
  container: Container;
  children: ReactNode;
}) {
  return <DiContext.Provider value={container}>{children}</DiContext.Provider>;
}

export function useDi(): Container {
  const container = useContext(DiContext);
  if (!container) {
    throw new Error("useDi must be used within a DiProvider");
  }
  return container;
}
