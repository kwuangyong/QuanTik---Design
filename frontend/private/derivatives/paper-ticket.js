const paperTicket = (() => {
  const journalKey = 'quantik.positions.v1';
  const fields = ['qty','entry','exitPrice','ticket-fee','ticket-slip'];
  let context, result;
  function readJournal() {
    try {
      const stored = JSON.parse(localStorage.getItem(journalKey));
      if (!Array.isArray(stored)) return [];
      return stored.filter(item => item && typeof item.name === 'string' && typeof item.code === 'string' &&
        typeof item.id === 'string' && Number.isFinite(item.savedAt) && Number.isFinite(new Date(item.savedAt).getTime()) &&
        Number.isFinite(item.asOf) && Number.isFinite(new Date(item.asOf).getTime()) && item.values &&
        ['side','qty','entry','exit','fee','slip','gross','net'].every(key => Number.isFinite(item.values[key])));
    } catch { return []; }
  }
  let scenarios = readJournal();

  function currency(value, signed = false) {
    return (signed && value > 0 ? '+' : '') + number(value,0) + ' ₫';
  }

  function calculate() {
    const [qty,entry,exit,fee,slip] = fields.map(id => el(id).valueAsNumber);
    const side = el('dir').value === 'Short' ? -1 : 1;
    const valid = fields.every(id => el(id).checkValidity() && Number.isFinite(el(id).valueAsNumber));
    const gross = Math.round((exit-entry)*10)*qty*vn30Multiplier*side/10;
    const costs = qty*(fee + 2*slip*vn30Multiplier);
    const rawTicks = (entry + side*(fee/vn30Multiplier + 2*slip))*10;
    const breakeven = (side > 0 ? Math.ceil(rawTicks-1e-8) : Math.floor(rawTicks+1e-8))/10;
    const net = gross-costs;
    result = valid && [gross,costs,net,breakeven].every(Number.isFinite) ? {qty,entry,exit,fee,slip,side,gross,costs,net,breakeven} : null;
    el('profit').textContent = result ? currency(net,true) : 'Kiểm tra đầu vào';
    el('profit').dataset.sign = result ? Math.sign(net) : '0';
    el('ticket-gross').textContent = result ? currency(gross,true) : '—';
    el('ticket-cost').textContent = result ? currency(costs) : '—';
    el('ticket-even').textContent = result && breakeven > 0 ? number(breakeven)+' điểm' : '—';
    el('ticket-save').disabled = !result;
  }

  function setContext(active, resetPrices) {
    const latest = active.rows.at(-1);
    const price = Math.round(latest.close*10)/10;
    context = {code:active.code,source:active.source,sourceName:active.sourceName,asOf:latest.time,price};
    el('ticket-context').textContent = context.code+' · '+quoteBook.time(context.asOf)+' ICT · '+context.sourceName+
      (Math.abs(latest.close-price)>1e-7 ? ' · Giá điền sẵn làm tròn theo bước 0,1 điểm.' : '');
    if (resetPrices || !el('entry').value) {
      el('entry').value = price.toFixed(1);
      el('exitPrice').value = (price + 3).toFixed(1);
    }
    el('ticket-message').textContent = '';
    calculate();
  }

  async function persist(edit, message) {
    function write() {
      const updated = edit(readJournal());
      localStorage.setItem(journalKey,JSON.stringify(updated));
      scenarios = updated;
      renderJournal();
      el('ticket-message').textContent = message;
      return true;
    }
    try {
      return navigator.locks ? await navigator.locks.request(journalKey,write) : write();
    } catch {
      el('ticket-message').textContent = 'Trình duyệt chưa lưu được sổ kịch bản.';
      return false;
    }
  }

  function renderJournal() {
    const container = el('ticket-journal');
    if (!scenarios.length) {
      container.textContent = 'Chưa có kịch bản đã lưu.';
      return;
    }
    container.replaceChildren(...scenarios.map(item => {
      const article = document.createElement('article');
      article.className = 'terminal-journal-row';
      const heading = document.createElement('h3');
      heading.textContent = item.name;
      const date = document.createElement('p');
      date.textContent = 'Lưu '+quoteBook.time(item.savedAt)+' · '+item.code+' · '+item.sourceName+' · Giá tại '+quoteBook.time(item.asOf);
      const details = document.createElement('p');
      const v = item.values;
      details.textContent = (v.side < 0 ? 'Short' : 'Long')+' × '+v.qty+' HĐ · '+number(v.entry)+' → '+number(v.exit)+' điểm · Phí '+currency(v.fee)+'/HĐ · Trượt '+number(v.slip,2)+' điểm/chiều';
      const values = document.createElement('strong');
      values.textContent = 'Trước phí và trượt giá '+currency(v.gross,true)+' · Sau chi phí '+currency(v.net,true);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Xóa';
      remove.setAttribute('aria-label','Xóa kịch bản '+item.name);
      remove.onclick = async () => {
        if (await persist(current => current.filter(scenario => scenario.id !== item.id),'Đã xóa kịch bản.')) {
          (container.querySelector('button') || el('ticket-name')).focus();
        }
      };
      article.append(heading,date,details,values,remove);
      return article;
    }));
  }

  el('ticket-save').onclick = async () => {
    if (!result || !context) return;
    const input = el('ticket-name');
    const name = input.value.trim();
    if (!name) {
      el('ticket-message').textContent = 'Nhập tên trước khi lưu kịch bản.';
      input.focus();
      return;
    }
    const item = {...context,id:crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),name,savedAt:Date.now(),values:result};
    if (await persist(current => [item,...current],'Đã lưu kịch bản trong trình duyệt.')) input.value = '';
  };
  for (const id of [...fields,'dir']) el(id).oninput = () => {
    el('ticket-message').textContent = '';
    calculate();
  };
  window.addEventListener('storage',event => {
    if (event.key===journalKey || event.key===null) {
      scenarios = readJournal();
      renderJournal();
    }
  });
  return {setContext,renderJournal};
})();
