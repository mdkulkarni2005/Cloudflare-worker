let source: EventSource | null = null;

type Listener = (event: any) => void;
const listeners = new Set<Listener>();

export function connectInspector() {
  if (source) return;

  source = new EventSource("http://localhost:3000/api/inspect/stream");

  source.onmessage = (e) => {
    const data = JSON.parse(e.data);
    listeners.forEach((cb) => cb(data));
  };

  source.onerror = () => {
    console.warn("Inspector SSE disconnected");
    source?.close();
    source = null;
  };
}

export function onInspectorEvent(cb: Listener) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
