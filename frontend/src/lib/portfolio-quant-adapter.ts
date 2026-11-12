import { getAnalysisVisuals } from "./mock-data";
export function quantModel(symbol: string) {
  const report = getAnalysisVisuals(symbol);
  if (!report) throw new Error(`Thiếu dữ liệu Quant mẫu cho ${symbol}.`);
  const { alpha, beta, omega, volatility } = report.garch;
  const last = volatility.at(-1)?.valuePct;
  if (![alpha,beta,omega,last].every(v => typeof v === "number" && Number.isFinite(v)) || alpha < 0 || beta < 0 || alpha + beta >= 1 || omega <= 0 || !last || last <= 0) throw new Error(`Tham số GARCH mẫu không hợp lệ: ${symbol}.`);
  // Fixture dùng đơn vị phần trăm: phương sai và omega phải chia 100².
  return { alpha, beta, omega: omega / 10000, variance: (last / 100) ** 2, hmm: report.hmm.probabilities, source: "Tham số GARCH/HMM minh họa từ phân tích Quant" };
}
