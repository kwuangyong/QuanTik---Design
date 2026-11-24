/* The workspace and exports use the same contract selected in futures.js. */
(() => {
  const editor = el('editor');
  const code = el('code');
  const sampleCode = `import json
import sys
from math import exp
from pathlib import Path

def analyze(snapshot):
    spot = snapshot["spot"]
    futures = snapshot["futures_price"]
    days = snapshot.get("days_to_expiry")
    carry = snapshot["risk_free_rate"] - snapshot["dividend_yield"]
    fair = spot * exp(carry * days / 365) if days is not None else None
    return {
        "symbol": snapshot["symbol"],
        "basis_points_index": round(futures - spot, 2),
        "fair_value": round(fair, 2) if fair is not None else None,
        "market_minus_fair": round(futures - fair, 2) if fair is not None else None,
    }

if __name__ == "__main__":
    data = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    print(json.dumps(analyze(data), ensure_ascii=False, indent=2))
`;

  // A saved draft, including an intentionally empty one, belongs to the user.
  try {
    if (localStorage.getItem('quantik-draft') === null && code.value === code.defaultValue) {
      code.value = sampleCode;
    }
  } catch { /* Preserve the current editor when storage access is restricted. */ }

  const context = document.createElement('section');
  context.className = 'notebook-context';
  context.innerHTML = `<div class="panelhead"><h3>Dữ liệu đầu vào</h3><small id="notebook-symbol"></small></div>
    <dl id="notebook-fields"></dl>
    <details><summary>Xem snapshot JSON</summary><pre id="notebook-json"></pre></details>
    <div class="notebook-actions"><button type="button" id="notebook-export-data">Tải snapshot .json</button><button type="button" id="notebook-export-code">Tải bản nháp .py</button></div>
    <small id="notebook-command"></small>`;
  editor.append(context);

  function snapshot() {
    const contract = quoteBook.active(current);
    const last = contract.rows.at(-1);
    return {
      schema_version: 2,
      source: contract.source === 'csv' ? 'user_csv' : 'quantik_simulated',
      source_name: contract.sourceName,
      as_of: new Date(last.time).toISOString(),
      symbol: contract.code,
      alias: contract.alias ? 'VN30' + contract.alias : null,
      expiry: contract.expiry ? contract.expiry.split('/').reverse().join('-') : null,
      days_to_expiry: contract.days,
      spot: last.spot,
      futures_price: last.close,
      price_unit: 'index_points',
      risk_free_rate: 0.04,
      dividend_yield: 0.01,
      day_count: 'ACT/365',
    };
  }

  function update() {
    const data = snapshot();
    el('notebook-symbol').textContent = data.symbol;
    const fields = [
      ['Nguồn', data.source === 'user_csv' ? 'CSV · '+data.source_name : 'Phiên mô phỏng'],
      ['Thời điểm',quoteBook.time(Date.parse(data.as_of))+' ICT'],
      ['Kỳ hạn', data.alias || data.symbol],
      ['Đáo hạn', quoteBook.active(current).expiry || 'CSV chưa có ngày đáo hạn'],
      ['VN30', number(data.spot) + ' điểm'],
      ['Futures', number(data.futures_price) + ' điểm'],
    ];
    el('notebook-fields').replaceChildren(...fields.map(([name, value]) => {
      const group = document.createElement('div');
      const label = document.createElement('dt');
      const display = document.createElement('dd');
      label.textContent = name;
      display.textContent = value;
      group.append(label, display);
      return group;
    }));
    el('notebook-json').textContent = JSON.stringify(data, null, 2);
    el('notebook-command').textContent =
      'Lệnh chạy trên máy sau khi tải hai tệp vào cùng thư mục · python ' +
      data.symbol + '.py ' + data.symbol + '.json';
  }

  function download(extension, contents, mime) {
    const url = URL.createObjectURL(new Blob([contents], {type: mime}));
    const link = document.createElement('a');
    link.download = snapshot().symbol + extension;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  el('notebook-export-data').addEventListener('click', () =>
    download('.json', JSON.stringify(snapshot(), null, 2) + '\n', 'application/json'));
  el('notebook-export-code').addEventListener('click', () =>
    download('.py', code.value, 'text/plain;charset=utf-8'));
  new MutationObserver(() => { if (!editor.hidden) update(); })
    .observe(editor, {attributes: true, attributeFilter: ['hidden']});
  update();
})();
