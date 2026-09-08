export function trackDocumentListeners(document: Document): { count(): number } {
  const live = new Set<unknown>();
  const realAdd = document.addEventListener.bind(document);
  const realRemove = document.removeEventListener.bind(document);
  document.addEventListener = ((type: string, listener: unknown, ...rest: unknown[]) => {
    if (type === "mousemove" || type === "mouseup") {
      live.add(listener);
    }
    return (realAdd as (...args: unknown[]) => unknown)(type, listener, ...rest);
  }) as typeof document.addEventListener;
  document.removeEventListener = ((type: string, listener: unknown, ...rest: unknown[]) => {
    live.delete(listener);
    return (realRemove as (...args: unknown[]) => unknown)(type, listener, ...rest);
  }) as typeof document.removeEventListener;
  return { count: () => live.size };
}
