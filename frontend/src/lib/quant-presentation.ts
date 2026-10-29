import type { ReportSection } from './api/analysis';
import { moduleGuides, record } from './quant-reader';

// Presentation guard: never turn a failed/disabled output into a usable signal.
export function readableMetrics(section?: ReportSection): Record<string, unknown> {
  if (!section || section.status !== 'AVAILABLE') return {};
  const clean = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(clean);
    if (!value || typeof value !== 'object') return value;
    const data = record(value);
    if (data.error || data.disabled === true) return {};
    if (data.available === false) return { available: false, reason: data.reason };
    return Object.fromEntries(Object.entries(data).map(([key, child]) => [key, clean(child)]));
  };
  return record(clean(section.metrics));
}
export function moduleAvailability(name: string, section?: ReportSection): string {
  if (!section) return 'Thiếu dữ liệu';
  if (section.status === 'DISABLED') return 'Đã tắt';
  if (section.status === 'UNAVAILABLE') return 'Thiếu dữ liệu';
  const metrics = readableMetrics(section);
  const values = (moduleGuides[name]?.metrics || []).map(([, path]) => path.split('.').reduce<unknown>((v, key) => record(v)[key], metrics));
  const valid = values.filter(v => typeof v === 'boolean' || typeof v === 'string' || typeof v === 'number' && Number.isFinite(v) || Array.isArray(v) && v.length > 0).length;
  if (name === 'commentary') return 'Tổng hợp báo cáo';
  if (!valid) return 'Thiếu dữ liệu';
  return valid < values.length ? 'Dữ liệu một phần' : 'Có dữ liệu';
}
