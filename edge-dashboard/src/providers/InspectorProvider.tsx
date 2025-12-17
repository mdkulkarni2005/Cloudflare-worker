"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { connectInspector, onInspectorEvent } from "@/lib/inspectorStream";

type TrafficEvent = any;

const InspectorContext = createContext<{
  events: TrafficEvent[];
  workers: string[];
}>({
  events: [],
  workers: [],
});

export function InspectorProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<TrafficEvent[]>([]);

  useEffect(() => {
    connectInspector();

    return onInspectorEvent((e) => {
      if (e.type === "traffic") {
        setEvents((prev) => [e.payload, ...prev].slice(0, 300));
      }
    });
  }, []);

  const workers = useMemo(() => {
    return Array.from(
      new Set(events.map((e) => e.worker).filter(Boolean))
    );
  }, [events]);

  return (
    <InspectorContext.Provider value={{ events, workers }}>
      {children}
    </InspectorContext.Provider>
  );
}

export function useInspector() {
  return useContext(InspectorContext);
}
