"use client";

import { useId, useMemo, useRef, useState, type FormEvent } from "react";
import { GripHorizontal, Plus, X } from "lucide-react";
import type { AgrEquity } from "@/lib/agr-priceboard";
import { money } from "@/lib/portfolio";
import type { Position } from "@/lib/portfolio-engine";
import { Modal } from "./ui";
import s from "./portfolio.module.css";

type Draft = { id: number; symbol: string; quantity: string; cost: string };

const searchText = (text: string) => text.toUpperCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/Đ/g, "D");
const emptyDraft = (id: number): Draft => ({ id, symbol: "", quantity: "100", cost: "" });

export function PositionEditor({ position, catalog, tradingDate, onSave, onClose }: {
  position: Position | "new";
  catalog: ReadonlyMap<string, AgrEquity>;
  tradingDate: string;
  onSave: (positions: Position[]) => void;
  onClose: () => void;
}) {
  const adding = position === "new";
  const [drafts, setDrafts] = useState<Draft[]>(() => adding ? [emptyDraft(0)] : [{
    id: 0, symbol: position.symbol, quantity: String(position.quantity), cost: String(position.cost),
  }]);
  const [error, setError] = useState("");
  const nextId = useRef(1);
  const indexed = useMemo(() => [...catalog.values()]
    .sort((a, b) => a.symbol.localeCompare(b.symbol))
    .map(stock => ({ stock, name: searchText(stock.name) })), [catalog]);

  const update = (id: number, change: Partial<Draft>) => {
    setDrafts(current => current.map(row => row.id === id ? { ...row, ...change } : row));
    setError("");
  };
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const positions = drafts.map((row, index) => {
        const symbol = row.symbol.trim().toUpperCase();
        if (adding && !catalog.has(symbol)) throw new Error(`Dòng ${index + 1}: chọn mã cổ phiếu trong danh sách.`);
        return { symbol, quantity: Number(row.quantity), cost: Number(row.cost) };
      });
      onSave(positions);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không lưu được vị thế.");
    }
  };

  return <Modal title={adding ? "Thêm vị thế" : "Sửa vị thế"} onClose={onClose} className={s.positionDialog} draggable>
    <GripHorizontal className={s.dragIcon} size={19} aria-hidden="true"/>
    <form className={s.form} onSubmit={save}>
      <div className={s.positionRows}>
        {adding && <p className={s.muted}>Tìm mã hoặc tên công ty trên HOSE, HNX và UPCoM. Giá gợi ý từ AGR phiên {tradingDate}. Các lần mua cùng mã được gộp theo giá vốn bình quân.</p>}
        {drafts.map((row, index) => <fieldset className={s.positionRow} key={row.id}>
          {adding && <legend>Lần mua {index + 1}</legend>}
          <div className={s.positionFields}>
            {adding ? <SymbolField row={row} stock={catalog.get(row.symbol.trim().toUpperCase())} indexed={indexed} onChange={change => update(row.id, change)}/>
              : <label className={s.field}>Mã cổ phiếu<input readOnly value={row.symbol}/></label>}
            <label className={s.field}>Khối lượng (cổ phiếu)<input required type="number" min="1" max="10000000" step="1" value={row.quantity} onChange={event => update(row.id, { quantity: event.target.value })}/></label>
            <label className={s.field}>Giá mua (VND/cổ phiếu)<input required type="number" min="0.01" max="100000000" step="any" value={row.cost} onChange={event => update(row.id, { cost: event.target.value })}/></label>
            {adding && drafts.length > 1 && <button type="button" className={`${s.button} ${s.removeRow}`} aria-label={`Xóa dòng ${index + 1}`} onClick={() => {
              setDrafts(current => current.filter(draft => draft.id !== row.id));
              setError("");
            }}><X size={16}/></button>}
          </div>
        </fieldset>)}
      </div>
      <div className={s.positionFooter}>
        {error && <p className={s.error} role="alert">{error}</p>}
        <div className={`${s.actions} ${s.editorActions}`}>
          {adding && <button type="button" className={s.button} onClick={() => {
            const id = nextId.current++;
            setDrafts(current => [...current, emptyDraft(id)]);
          }}><Plus size={16}/>Thêm dòng</button>}
          <div className={s.actions}>
            <button type="button" className={s.button} onClick={onClose}>Hủy</button>
            <button className={`${s.button} ${s.primary}`}>{drafts.length === 1 ? "Lưu vị thế" : `Lưu ${drafts.length} lần mua`}</button>
          </div>
        </div>
      </div>
    </form>
  </Modal>;
}

function SymbolField({ row, stock, indexed, onChange }: {
  row: Draft;
  stock?: AgrEquity;
  indexed: { stock: AgrEquity; name: string }[];
  onChange: (change: Partial<Draft>) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const query = searchText(row.symbol.trim());
  const matches = useMemo(() => {
    const prefix: AgrEquity[] = [], other: AgrEquity[] = [];
    for (const { stock, name } of indexed) {
      if (stock.symbol.startsWith(query)) prefix.push(stock);
      else if (stock.symbol.includes(query) || name.includes(query)) other.push(stock);
    }
    return [...prefix, ...other];
  }, [indexed, query]);
  const select = (stock: AgrEquity) => {
    onChange({ symbol: stock.symbol, ...(!row.cost && stock.price !== null ? { cost: String(stock.price) } : {}) });
    setOpen(false);
  };

  return <div className={`${s.field} ${s.symbolField}`}>
    <label htmlFor={`${id}-input`}>Mã cổ phiếu</label>
    <input id={`${id}-input`} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={open ? `${id}-results` : undefined}
      aria-activedescendant={open && matches[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
      required autoFocus={row.id > 0} autoComplete="off" placeholder="VD: FPT hoặc tên công ty" value={row.symbol}
      onFocus={() => { setOpen(true); setActiveIndex(-1); }} onClick={() => setOpen(true)}
      onBlur={() => { setOpen(false); if (stock && !row.cost && stock.price !== null) onChange({ cost: String(stock.price) }); }}
      onChange={event => { onChange({ symbol: event.target.value }); setOpen(true); setActiveIndex(-1); }}
      onKeyDown={event => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
        } else if (event.key === "Enter" && open) {
          const choice = matches[activeIndex] ?? stock;
          if (!choice) return;
          event.preventDefault();
          select(choice);
        } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          setOpen(true);
          if (!matches.length) return;
          const next = event.key === "ArrowDown" ? (activeIndex + 1) % matches.length : (activeIndex < 0 ? matches.length - 1 : (activeIndex + matches.length - 1) % matches.length);
          setActiveIndex(next);
          requestAnimationFrame(() => { document.getElementById(`${id}-option-${next}`)?.scrollIntoView({ block: "nearest" }); });
        }
      }}/>
    {open && <div className={s.symbolResults} id={`${id}-results`} role="listbox" aria-label="Mã tìm thấy" onMouseDown={event => event.preventDefault()}>
      {matches.map((item, index) => <button type="button" role="option" tabIndex={-1} aria-selected={index === activeIndex} key={item.symbol}
        id={`${id}-option-${index}`} onClick={() => select(item)}>
        <b>{item.symbol}</b><span>{item.name}</span><small>{item.exchange}</small>
      </button>)}
      {!matches.length && <span className={s.noMatches}>Chưa tìm thấy mã phù hợp.</span>}
    </div>}
    {stock && <small>{stock.name} · {stock.exchange}{stock.price !== null && ` · ${money(stock.price)} VND (AGR)`}</small>}
  </div>;
}
