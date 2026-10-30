"use client";
import type { AnalysisReport } from "@/lib/api/analysis";
import { moduleAvailability } from "@/lib/quant-presentation";
import type { CSSProperties } from "react";
import styles from "./quant-reader.module.css";
export const quantModuleItems = [["statistics","Hiệu suất"],["distribution","Phân phối"],["arima","ARIMA"],["garch","GARCH"],["hmm","HMM"],["technical","Kỹ thuật"],["directional_alpha","Alpha"],["context","Thị trường & ngành"],["agreement","Đồng thuận"],["simulation_risk","Monte Carlo"],["costs","Chi phí"],["trade_plan","Kế hoạch vị thế"],["liquidity","Thanh khoản"],["data_quality","Dữ liệu"],["decision","Quyết định"],["commentary","Nhận định"]] as const;
export function QuantModuleNavigation({selected,onSelect,sections}: {selected:string;onSelect:(name:string)=>void;sections:AnalysisReport["sections"]}) {
 const colors = ["var(--positive)", "var(--neutral)", "var(--quant-blue,#8daaf2)", "var(--accent)"];
 return <nav aria-label="Điều hướng module" className={styles.moduleGrid}>{quantModuleItems.map(([name,label],index)=><button type="button" key={name} aria-label={label} aria-pressed={selected===name} onClick={()=>onSelect(name)} className={styles.moduleButton} style={{"--module-color":colors[index % colors.length]} as CSSProperties}><span className={styles.moduleNumber}>{String(index+1).padStart(2,"0")} /</span><span className={styles.moduleLabel}>{label}</span><span className={styles.moduleStatus}>{moduleAvailability(name,sections[name])}</span></button>)}</nav>;
}
