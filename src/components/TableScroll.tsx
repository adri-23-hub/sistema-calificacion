"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Mantiene las columnas legibles sin ensanchar la página en teléfonos o tablets. */
export default function TableScroll({ children, label = "Tabla de datos" }: { children: ReactNode; label?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setOverflows(element.scrollWidth > element.clientWidth + 1));
    observer.observe(element);
    const table = element.querySelector("table");
    if (table) observer.observe(table);
    return () => observer.disconnect();
  }, [children]);

  return (
    <div className="min-w-0 max-w-full">
      {overflows && <p className="table-scroll-hint mb-2 text-xs text-slate-400">↔ Desliza la tabla para ver todas las columnas.</p>}
      <div ref={container} className="table-scroll" role="region" aria-label={label} tabIndex={overflows ? 0 : undefined}>
        {children}
      </div>
    </div>
  );
}
