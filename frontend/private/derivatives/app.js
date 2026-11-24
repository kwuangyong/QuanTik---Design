const el = id => document.getElementById(id);
const optionProducts = {
  index: {
    model: 'Black–Scholes–Merton', asset: 'Chỉ số VN30 (điểm)', unit: 'điểm',
    note: 'Quyền chọn chỉ số kiểu châu Âu mẫu. HNX đã giới thiệu sản phẩm VN30 dự kiến.',
    defaults: {spot: 1822.3, strike: 1820, days: 90, vol: 22, rate: 4, yield: 0}
  },
  future: {
    model: 'Black–76', asset: 'Giá futures cơ sở (điểm)', unit: 'điểm',
    note: 'Kịch bản quyền chọn châu Âu trên một hợp đồng tương lai. Nhập giá futures làm đầu vào.',
    defaults: {spot: 1824.6, strike: 1820, days: 60, vol: 22, rate: 4, yield: 0}
  },
  warrant: {
    model: 'Asian · Khớp hai mômen', asset: 'Giá cổ phiếu cơ sở (VND)', unit: 'VND/CW',
    note: 'Chứng quyền mua thanh toán theo bình quân 5 giá đóng cửa, chia theo tỷ lệ chuyển đổi. Nhập giá và thông số điều chỉnh từ bản cáo bạch hoặc công bố mới nhất.',
    defaults: {spot: 27600, strike: 27000, days: 90, vol: 30, rate: 4, yield: 0}
  }
};
const fixingInputs = [7, 6, 5, 2, 1].map((days, i) => {
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = '<label>Phiên ' + (i + 1) + ' · ngày trước đáo hạn<input class="fixing-day" type="number" min="1" max="365" value="' + days +
    '"></label><label>Giá đóng cửa (VND)<input class="fixing-close" type="number" min="0.1" max="10000000" step="any" placeholder="Chưa đến phiên"></label>';
  el('fixings').append(row);
  return {day: row.querySelector('.fixing-day'), close: row.querySelector('.fixing-close')};
});

function readOptionInputs() {
  const product = el('model').value;
  const warrant = product === 'warrant';
  const future = product === 'future';
  const put = !warrant && el('side').value === 'Put';
  const days = el('days').valueAsNumber;
  const strike = el('strike').valueAsNumber;
  const spot = el('spot').valueAsNumber;
  const vol = el('vol').valueAsNumber / 100;
  const rate = el('rate').valueAsNumber / 100;
  const yieldRate = future ? 0 : el('yield').valueAsNumber / 100;
  const ratio = warrant ? el('ratio').valueAsNumber : 1;
  let error;
  const numeric = ['spot', 'strike', 'rate', ...(!future ? ['yield'] : []), ...(warrant ? ['ratio'] : [])];
  if (numeric.some(id => !Number.isFinite(el(id).valueAsNumber) || !el(id).validity.valid)) {
    error = 'Kiểm tra giá, lãi suất và tỷ lệ chuyển đổi theo giới hạn của từng ô.';
  }
  let fixings = [];
  if (warrant) {
    fixings = fixingInputs.map(({day, close}) => {
      const time = Math.max(0, days - day.valueAsNumber) / 365;
      close.disabled = time > 0;
      close.placeholder = time > 0 ? 'Chưa đến phiên' : 'Nhập giá đã chốt';
      if (!day.validity.valid || !Number.isFinite(time)) error = 'Nhập số ngày hợp lệ cho từng phiên.';
      else if (time === 0 && (!close.validity.valid || !Number.isFinite(close.valueAsNumber))) error = 'Nhập giá đóng cửa của tất cả các phiên đã chốt.';
      return {time, close: close.valueAsNumber};
    });
    if (new Set(fixingInputs.map(({day}) => day.valueAsNumber)).size !== 5) error = 'Năm phiên phải có số ngày trước đáo hạn khác nhau.';
  }
  const evaluate = (s, v = vol, t = days / 365) => warrant
    ? warrantPrice(s, strike, v, t, rate, yieldRate, ratio, fixings)
    : price(s, strike, v, t, future, put, rate, yieldRate);
  return {spot, strike, put, vol, days, warrant, future, product, error, evaluate, fixings, ratio, rate, yieldRate};
}

function surfaceColor(value) {
  const stops = [[39,92,85], [92,226,212], [255,173,117]];
  const t = Math.min(1, Math.max(0, value)) * 2;
  const i = Math.min(1, Math.floor(t));
  return 'rgb(' + stops[i].map((v,k) => Math.round(v + (stops[i+1][k] - v) * (t - i))).join(',') + ')';
}

function render() {
  if (el('lab').hidden) return;
  const {spot, strike, put, vol, days, warrant, future, product, error, evaluate, fixings, ratio} = readOptionInputs();
  const config = optionProducts[product];
  const fmt = (x, n = 2) => x.toLocaleString('vi-VN', {minimumFractionDigits: n, maximumFractionDigits: n});
  el('warrant-inputs').hidden = !warrant;
  el('side-label').hidden = warrant;
  el('dividend-label').hidden = future;
  el('asset').textContent = config.asset;
  el('vVal').textContent = fmt(vol * 100, 0) + '%';
  el('dVal').textContent = days + ' ngày';
  el('kind').textContent = warrant ? 'CALL · CW' : put ? 'PUT' : 'CALL';
  el('name').textContent = config.model;
  el('product-note').textContent = config.note;
  el('pricing-footer').textContent = warrant
    ? 'ACT/365 · VND trên mỗi chứng quyền · Giả định chi trả tại đáo hạn, trước thuế và phí.'
    : 'ACT/365 · Giá lý thuyết tính bằng điểm · Giả định biến động và lãi suất không đổi.';

  const canvas = el('surface');
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  el('advanced-risk').hidden = warrant || Boolean(error);
  if (!warrant && !error) {
    const risk = vanillaRisk(spot,strike,vol,days/365,rate,yieldRate,future,put);
    const fields = [['Theta',risk.theta,'điểm / ngày'],['Rho',risk.rho,'điểm / 1 điểm % lãi suất'],
      ['Vanna',risk.vanna,'Delta / 1 điểm % biến động'],['Vomma',risk.vomma,'điểm / (điểm % biến động)²']];
    el('risk-values').innerHTML = fields.map(([label,value,unit]) =>
      '<div class="metric">'+label+'<b>'+fmt(value,5)+'</b><small>'+unit+'</small></div>').join('');
  }
  if (error) {
    el('metrics').textContent = error;
    return;
  }
  const center = evaluate(spot);
  const step = Math.max(spot * .0005, .001);
  const high = evaluate(spot + step), low = evaluate(spot - step);
  const metrics = [
    ['Giá lý thuyết', fmt(center), config.unit],
    ['Delta', fmt((high - low) / (2 * step), 3), future ? 'theo giá futures' : 'theo giá cơ sở'],
    ['Gamma', fmt((high + low - 2 * center) / (step * step), 6), 'mỗi đơn vị giá cơ sở'],
    ['Vega', fmt((evaluate(spot, vol+.0001) - evaluate(spot, vol-.0001)) * 50), config.unit + ' / 1 điểm % biến động']
  ];
  if (warrant && fixings.every(item => item.time === 0)) {
    const avg = fixings.reduce((sum, item) => sum + item.close, 0) / fixings.length;
    metrics.push(['Giá thanh toán bình quân', fmt(avg), 'VND/cổ phiếu'], ['Chi trả khi đáo hạn', fmt(Math.max(0, avg - strike) / ratio), config.unit]);
  }
  el('metrics').innerHTML = metrics.map(([label,value,unit]) =>
    '<div class="metric">' + label + '<b>' + value + '</b><small>' + unit + '</small></div>').join('');

  const n = 26;
  const values = Array.from({length:n+1}, (_, i) =>
    Array.from({length:n+1}, (_, j) => evaluate(spot * (.87+.26*i/n), vol * (.5+j/n))));
  const min = Math.min(...values.flat()), max = Math.max(...values.flat());
  const normalized = (i,j) => (values[i][j] - min) / Math.max(.00001, max-min);
  const point = (x,y,z) => [w*(.50+.43*x-.43*y), h*(.40+.21*x+.25*y-.32*z)];
  function path(points,fill,stroke) {
    ctx.beginPath();
    points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
    if (fill) {ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
    ctx.strokeStyle=stroke;
    ctx.stroke();
  }
  for(let i=0;i<=10;i++) {
    const a = i / 10;
    path([point(a,0,0),point(a,1,0)],null,'#2c4141');
    path([point(0,a,0),point(1,a,0)],null,'#2c4141');
  }
  for(let i=0;i<n;i++) for(let j=0;j<n;j++) {
    const corners = [[i,j],[i+1,j],[i+1,j+1],[i,j+1]];
    const color = corners.reduce((sum,[x,y]) => sum + normalized(x,y), 0) / 4;
    path(corners.map(([x,y]) => point(x/n,y/n,normalized(x,y))),surfaceColor(color),'rgba(10,19,17,.42)');
  }
  ctx.fillStyle='#b0c2be';
  ctx.font='13px monospace';
  ctx.textAlign='center';
  ctx.fillText('Biến động (%)',w*.76,h*.88);
  ctx.fillText(future?'Giá futures':'Giá cơ sở',w*.24,h*.88);
}

let activeOptionProduct = el('model').value;
el('lab').addEventListener('input', event => {
  if (event.target === el('model')) {
    for (const key of Object.keys(optionProducts[activeOptionProduct].defaults)) {
      optionProducts[activeOptionProduct].defaults[key] = el(key).value;
    }
    activeOptionProduct = el('model').value;
    for (const [key, value] of Object.entries(optionProducts[activeOptionProduct].defaults)) el(key).value = value;
  }
  if (event.target.id !== 'scenario-elapsed') render();
});
try {el('code').value=localStorage.getItem('quantik-draft')??el('code').value;} catch {}
el('save').onclick=()=>{
  try {
    localStorage.setItem('quantik-draft',el('code').value);
    el('msg').textContent='Đã lưu trên thiết bị';
  } catch {el('msg').textContent='Trình duyệt chưa cho phép lưu';}
};
window.addEventListener('resize',render);
