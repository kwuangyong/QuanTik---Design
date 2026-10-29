"use client";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import katex from 'katex';
import { getTerm, glossary, type TermDefinition } from '@/content/legacy/glossary';
import { usePreferences } from './preferences';
import quantStyles from './quant-reader.module.css';
export function Formula({ latex }: {
    latex: string;
}) {
    const html = useMemo(() => katex.renderToString(latex || String.raw `\text{Chưa xác định}`, {
        throwOnError: false, trust: false, displayMode: true, output: 'htmlAndMathml',
    }), [latex]);
    return <div className="term-formula overflow-x-auto [padding:9px_2px] [font-size:14px] [max-width:100%]" dangerouslySetInnerHTML={{ __html: html }}/>;
}
// The five sections and every content field retain the old TermHint text.
export function TermContent({ term, vietnamese = false }: {
    term: TermDefinition;
    vietnamese?: boolean;
}) {
    const noteSize = vietnamese ? "[font-size:13px]!" : "[font-size:11px]!";
    return <>
    <div className="term-title [&_strong]:[font-size:15px] [&_strong]:[color:var(--term-accent)]"><strong>{vietnamese ? term.vi : term.en}</strong></div><small>{vietnamese ? "Định nghĩa và cách đọc" : term.vi}</small>
    <h4>01 · Lý thuyết</h4><p>{term.short}</p>
    <h4>02 · Công thức</h4><Formula latex={term.formulaLatex}/><p className={`term-note preserve-lines [color:var(--term-dim)] ${noteSize} [white-space:pre-wrap]`}>{term.variables}</p>
    <p className={`term-note preserve-lines [color:var(--term-dim)] ${noteSize} [white-space:pre-wrap]`}><b>Tham số:</b> {term.parameters}</p>
    <h4>03 · Ví dụ minh họa</h4><p>{term.example}</p>
    <h4>04 · Ngưỡng và điều kiện</h4><p className={`term-note preserve-lines [color:var(--term-dim)] ${noteSize} [white-space:pre-wrap]`}>{term.conditions || term.interpretation || 'Không có ngưỡng chung. Đối chiếu cửa sổ, đơn vị và cấu hình của mô hình đang dùng.'}</p><small>Ngưỡng tài liệu là tham khảo; cấu hình pipeline và mục tiêu kiểm định quyết định ngưỡng thực.</small>
    <h4>05 · Cách sử dụng</h4><p className={`term-note [color:var(--term-dim)] ${noteSize}`}>{term.usage}</p><p className={`term-note [color:var(--term-dim)] ${noteSize}`}>{term.limitations}</p>
  </>;
}
export default function TermHint({ id, children, definition }: {
    id: string;
    children?: ReactNode;
    definition?: TermDefinition;
}) {
    const term = definition ?? getTerm(id);
    const { theme } = usePreferences();
    const anchor = useRef<HTMLButtonElement>(null), popup = useRef<HTMLDivElement>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [mode, setMode] = useState<'hover' | 'pinned' | null>(null);
    const [position, setPosition] = useState<CSSProperties>({ left: 12, top: 12 });
    const [host, setHost] = useState<Element | null>(null);
    const uid = useId();
    const cancel = () => {
        if (timer.current)
            clearTimeout(timer.current);
    };
    const close = () => { cancel(); setMode(null); };
    const announce = () => document.dispatchEvent(new CustomEvent('quant-term-open', { detail: uid }));
    const hide = () => { cancel(); timer.current = setTimeout(() => setMode(m => m === 'pinned' ? m : null), 180); };
    const show = () => { cancel(); timer.current = setTimeout(() => { announce(); setMode(m => m === 'pinned' ? m : 'hover'); }, 250); };
    useEffect(() => {
        const anotherOpened = (event: Event) => { if ((event as CustomEvent).detail !== uid) close(); };
        document.addEventListener('quant-term-open', anotherOpened);
        return () => document.removeEventListener('quant-term-open', anotherOpened);
    }, [uid]);
    useEffect(() => () => {
        if (timer.current)
            clearTimeout(timer.current);
    }, []);
    useLayoutEffect(() => {
        if (!mode)
            return;
        // A tooltip opened in a modal must remain in that modal's top layer.
        setHost(anchor.current?.closest('dialog[open]') ?? document.body);
        const place = () => {
            const r = anchor.current?.getBoundingClientRect();
            if (!r)
                return;
            const width = Math.min(390, window.innerWidth - 24);
            const height = popup.current?.offsetHeight ?? 220;
            setPosition({ left: Math.max(12, Math.min(r.left, window.innerWidth - width - 12)), top: Math.max(12, Math.min(r.bottom + 8, window.innerHeight - height - 12)), width, maxHeight: window.innerHeight - 24 });
        };
        place();
        const frame = requestAnimationFrame(place);
        // Measure again after the portal mounts or its wrapped content changes.
        // Otherwise the initial 220px estimate can leave a long popup offscreen.
        const resize = new ResizeObserver(place);
        if (popup.current)
            resize.observe(popup.current);
        window.addEventListener('resize', place);
        document.addEventListener('scroll', place, true);
        const dismiss = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                close();
            }
        };
        const outside = (e: PointerEvent) => {
            if (!popup.current?.contains(e.target as Node) && !anchor.current?.contains(e.target as Node))
                close();
        };
        document.addEventListener('keydown', dismiss, true);
        document.addEventListener('pointerdown', outside);
        return () => { cancelAnimationFrame(frame); resize.disconnect(); window.removeEventListener('resize', place); document.removeEventListener('scroll', place, true); document.removeEventListener('keydown', dismiss, true); document.removeEventListener('pointerdown', outside); };
    }, [mode, host]);
    if (!term)
        return <>{children || id}</>;
    return <><button ref={anchor} type="button" className="term-trigger inline [border-width:0] [padding:0] [background:none] [color:inherit] [font:inherit] [line-height:inherit] [text-align:inherit] [text-decoration:underline_dotted] [text-underline-offset:4px] [cursor:help] [.stock-table_&]:inline [.stock-table_&]:[border-width:0] [.stock-table_&]:[padding:0] [.stock-table_&]:[background:none] [.stock-table_&]:[color:inherit] [.stock-table_&]:[font:inherit] [.stock-table_&]:[line-height:inherit] [.stock-table_&]:[text-align:inherit] [.stock-table_&]:[text-decoration:underline_dotted] [.stock-table_&]:[text-underline-offset:4px] [.stock-table_&]:[cursor:help] [&:hover]:[color:var(--accent,_#ff914d)] [&:hover]:[text-decoration-style:solid] [&:focus-visible]:[color:var(--accent,_#ff914d)] [&:focus-visible]:[text-decoration-style:solid]" aria-describedby={mode ? uid : undefined} onPointerEnter={show} onPointerLeave={hide} onFocus={show} onBlur={hide} onClick={e => { e.preventDefault(); e.stopPropagation(); cancel(); announce(); setMode(m => m === 'pinned' ? null : 'pinned'); }}>{children || term.en}</button>
    {mode && host && createPortal(<div ref={popup} id={uid} className={`term-popover ${anchor.current?.closest(".quant-report") ? quantStyles.popover : ""} [color:var(--term-text)] [font:12px/1.6_var(--font-mono),_ui-monospace,_Consolas,_monospace] text-left [white-space:normal] fixed [z-index:300] box-border [background:var(--term-panel)] [border-width:1px] [border-style:solid] [border-color:var(--term-accent)] [border-radius:4px] [box-shadow:0_15px_50px_#0007] [padding:18px] overflow-auto [overscroll-behavior:contain] [&_small]:[color:var(--term-dim)] [&_small]:[font-size:10px] [&_p]:[margin:10px_0] [&_p]:[font-size:12px] [.info-dialog_&_p]:[margin:10px_0] [.info-dialog_&_p]:[font-size:12px] [.info-dialog_&_p]:[line-height:1.6] [.info-dialog_&_p]:[color:var(--term-text)] [&_h4]:[font-size:12px] [&_h4]:[color:var(--term-accent)] [&_h4]:[margin:15px_0_5px]`} data-theme={theme} data-quant-report={Boolean(anchor.current?.closest(".quant-report"))} style={position} role="tooltip" onPointerEnter={cancel} onPointerLeave={hide} onClick={e => e.stopPropagation()}>
      {anchor.current?.closest(".quant-report") && <button type="button" aria-label="Đóng giải thích thuật ngữ" onClick={close} className="mb-3 rounded border border-[var(--border)] px-3 py-2 text-[13px]">Đóng ×</button>}
      <TermContent term={term} vietnamese={Boolean(anchor.current?.closest(".quant-report"))}/>
    </div>, host)}
  </>;
}
const aliases = glossary.map(term => ({ text: term.en, id: term.id }));
aliases.push(...[['HMM', 'hmm'], ['AnnRet', 'annual_return'], ['MaxDD', 'max_drawdown'], ['Max drawdown', 'max_drawdown'], ['Monte Carlo', 'monte_carlo'], ['MC', 'monte_carlo'], ['Quant Factor', 'quant_factor'], ['Quant Factors', 'quant_factor'], ['Quant', 'quant_score'], ['RR', 'risk_reward']].map(([text, id]) => ({ text, id })));
const unique = [...new Map(aliases.map(a => [a.text.toLowerCase(), a])).values()].sort((a, b) => b.text.length - a.text.length);
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pattern = new RegExp(`(?<![a-z0-9_])(${unique.map(a => escape(a.text)).join('|')})(?![a-z0-9_])`, 'gi');
const lookup = new Map(unique.map(a => [a.text.toLowerCase(), a.id]));
export function AnnotatedText({ text }: {
    text: string;
}) {
    const chunks: ReactNode[] = [];
    let cursor = 0;
    for (const match of text.matchAll(pattern)) {
        if (match.index > cursor)
            chunks.push(text.slice(cursor, match.index));
        chunks.push(<TermHint key={match.index} id={lookup.get(match[0].toLowerCase())!}>{match[0]}</TermHint>);
        cursor = match.index + match[0].length;
    }
    if (cursor < text.length)
        chunks.push(text.slice(cursor));
    return <>{chunks}</>;
}
