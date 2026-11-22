"use client";
import { tw } from "@/lib/tailwind";
import { useEffect, useId, useRef, type PointerEvent, type ReactNode } from "react";
import { X } from "lucide-react";
export function PageHeading({ title, description, children, }: {
    title: string;
    description?: string;
    children?: ReactNode;
}) {
    return (<div className="page-heading flex items-center justify-between [gap:24px] [margin-bottom:28px] [&_h1]:[font-size:32px] [&_h1]:[line-height:1.2] [&_h1]:[font-weight:600] [&_h1]:[letter-spacing:-1.1px] [&_h1]:[margin:0_0_9px] [&_p]:[font-size:16px] [&_p]:[color:var(--muted)] [&_p]:[margin:0] max-[900px]:[&_h1]:[font-size:30px] max-[900px]:[&_p]:[font-size:15px] max-[900px]:items-start max-[900px]:[gap:16px] max-[700px]:flex-wrap max-[700px]:[margin-bottom:22px] max-[700px]:[&_h1]:[font-size:30px] max-[700px]:[&_p]:[line-height:1.65]">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children && <div className="heading-actions flex items-center [gap:10px] [flex-shrink:0] max-[700px]:[gap:8px]">{children}</div>}
    </div>);
}
export function Panel({ title, action, children, className = "", }: {
    title: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (<section className={tw(`panel ${className}`)}>
      <div className="panel-heading flex items-center justify-between [gap:12px] [padding:19px_22px] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:var(--border)] [&_h2]:[font-size:18px] [&_h2]:[font-weight:600] [&_h2]:[line-height:1.4] [&_h2]:[margin:0] [&_h2]:[letter-spacing:-0.35px] max-[700px]:[padding:17px_18px] max-[700px]:[&_h2]:[font-size:18px]">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>);
}
export function Modal({ title, onClose, children, className = "", draggable = false }: {
    title: string;
    onClose: () => void;
    children: ReactNode;
    className?: string;
    draggable?: boolean;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const offset = useRef({ x: 0, y: 0 });
    const drag = useRef<{ pointer: number; x: number; y: number } | null>(null);
    const titleId = useId();
    const move = (x: number, y: number) => {
        const dialog = ref.current;
        if (!dialog) return;
        const { left, right, top, bottom } = dialog.getBoundingClientRect();
        const margin = 8;
        const bound = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
        offset.current = {
            x: bound(x, offset.current.x + margin - left, offset.current.x + window.innerWidth - margin - right),
            y: bound(y, offset.current.y + margin - top, offset.current.y + window.innerHeight - margin - bottom),
        };
        dialog.style.setProperty("--dialog-x", `${offset.current.x}px`);
        dialog.style.setProperty("--dialog-y", `${offset.current.y}px`);
    };
    const startDrag = (event: PointerEvent<HTMLElement>) => {
        if (!event.isPrimary || event.button !== 0 || (event.target as Element).closest("button")) return;
        drag.current = { pointer: event.pointerId, x: event.clientX - offset.current.x, y: event.clientY - offset.current.y };
        event.currentTarget.setPointerCapture(event.pointerId);
    };
    useEffect(() => {
        if (!draggable || !ref.current) return;
        const keepInView = () => move(offset.current.x, offset.current.y);
        const observer = new ResizeObserver(keepInView);
        observer.observe(ref.current);
        window.addEventListener("resize", keepInView);
        return () => {
            observer.disconnect();
            window.removeEventListener("resize", keepInView);
        };
    }, [draggable]);
    useEffect(() => {
        const el = ref.current;
        if (!el)
            return;
        const previous = document.activeElement;
        if (!el.open)
            el.showModal();
        return () => {
            if (el.open)
                el.close();
            if (previous instanceof HTMLElement && previous.isConnected)
                previous.focus();
        };
    }, []);
    return (<dialog ref={ref} className={tw(`info-dialog ${className}`)} aria-labelledby={titleId} onCancel={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onClose();
        }} onClick={(event) => {
            if (event.target === event.currentTarget) {
                const bounds = event.currentTarget.getBoundingClientRect();
                if (event.clientX < bounds.left ||
                    event.clientX > bounds.right ||
                    event.clientY < bounds.top ||
                    event.clientY > bounds.bottom)
                    onClose();
            }
        }}>
      <header onPointerDown={draggable ? startDrag : undefined} onPointerMove={draggable ? event => {
          const active = drag.current;
          if (active?.pointer === event.pointerId) move(event.clientX - active.x, event.clientY - active.y);
      } : undefined} onLostPointerCapture={draggable ? () => { drag.current = null; } : undefined}>
        <h2 id={titleId}>{title}</h2>
        <button autoFocus className="icon-button inline-flex items-center justify-center [width:40px] [height:40px] [flex-shrink:0] [border-width:1px] [border-style:solid] [border-color:var(--border)] [border-radius:4px] [background:transparent] [color:var(--muted)] [transition:background_0.18s,_color_0.18s] [&:hover]:[background:var(--raised)] [&:hover]:[color:var(--text)]" onClick={onClose} aria-label="Đóng">
          <X size={20}/>
        </button>
      </header>
      {children}
    </dialog>);
}
export function EmptyState({ title, children, }: {
    title: string;
    children?: ReactNode;
}) {
    return (<div className="empty-state [.quant-panel.compact_&]:[padding:42px_8px]">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>);
}
