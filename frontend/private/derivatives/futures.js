const number = (value, digits = 1) => value.toLocaleString('vi-VN', {minimumFractionDigits:digits,maximumFractionDigits:digits});
let current = 0;
let onQuoteContractChange = () => {};
let onStrategyVisibilityChange = () => {};
let previousQuote, activeWorkspace;
const terminalColors = {grid:'#2d4240',dim:'#b0c2be',amber:'#ffad75',cyan:'#5ce2d4',canvas:'#141c1b'};

function quoteTitle(active) {
  return active.alias ? 'VN30'+active.alias : active.code;
}

function quoteBasis(active) {
  const latest = active.rows.at(-1);
  return latest.close-latest.spot;
}

function comparableQuotes(active) {
  const latest = active.rows.at(-1);
  return contracts.map((_,index) => ({...quoteBook.active(index),index})).filter(item => {
    const row = item.rows.at(-1);
    return item.source === active.source && row.time === latest.time && row.spot === latest.spot;
  });
}

function chart() {
  const active = quoteBook.active(current);
  const latest = active.rows.at(-1);
  const peers = comparableQuotes(active).filter(item => item.expiry && item.days > 0);
  const availability = active.source === 'sample' && active.days > 0;
  const curveAvailable = availability && peers.length > 1;
  const view = el('view');
  view.options[2].disabled = !curveAvailable;
  view.options[3].disabled = !availability;
  if (view.selectedOptions[0]?.disabled) view.selectedIndex = 0;
  const mode = view.selectedIndex;
  el('curveSwitch').hidden = mode !== 2;
  const axis = {gridcolor:terminalColors.grid,zerolinecolor:'#526966',automargin:true};
  const layout = {
    margin:{l:53,r:12,t:12,b:55},paper_bgcolor:'transparent',plot_bgcolor:'transparent',
    font:{color:terminalColors.dim},showlegend:mode===0||mode===2,
    legend:{orientation:'h',y:1.03,x:0},xaxis:{...axis},yaxis:{...axis,title:'Điểm'},hovermode:'x unified',
    uirevision:active.code+'-'+latest.time+'-'+mode
  };
  function series(name,x,y,color,dash) {
    return {type:'scatter',mode:'lines',name,x,y,line:{color,width:2.5,dash},hovertemplate:'%{y:.1f} điểm<extra>'+name+'</extra>'};
  }
  let traces, help;
  if (mode < 2) {
    const rows = displayBars(active.rows,active.coverage.cadence);
    const x = rows.map(row => new Date(row.time+7*3600000).toISOString().slice(0,-1));
    traces = mode === 1 ?
      [series('Basis',x,rows.map(row=>row.close===null ? null : row.close-row.spot),terminalColors.cyan)] :
      [series(active.code,x,rows.map(row=>row.close),terminalColors.amber),series('VN30',x,rows.map(row=>row.spot),terminalColors.cyan,'dot')];
    if (mode === 1) {
      traces[0].fill = 'tozeroy';
      traces[0].fillcolor = 'rgba(92,226,212,.10)';
    }
    if (!active.coverage.cadence) for (const trace of traces) trace.mode = 'markers';
    layout.xaxis = {...axis,type:'date',nticks:6,tickformatstops:[
      {dtickrange:[null,86400000],value:'%H:%M'},{dtickrange:[86400000,null],value:'%d/%m/%Y'}
    ],hoverformat:'%d/%m/%Y %H:%M',title:'Giờ Việt Nam (ICT)'};
    help = mode === 1 ? 'Basis = giá futures − chỉ số VN30 (điểm).' : '';
  } else if (mode === 2) {
    const dates = peers.map(item=>item.expiry.split('/').reverse().join('-'));
    traces = [{...series(quoteBook.clock(latest.time),dates,peers.map(item=>item.rows.at(-1).close),terminalColors.amber),
      mode:'lines+markers',marker:{size:peers.map(item=>item.index===current?13:7)}}];
    if (el('compareCurve').checked) traces.push({...series(quoteBook.clock(active.rows[0].time),dates,peers.map(item=>item.rows[0].close),terminalColors.cyan,'dot'),mode:'lines+markers'});
    layout.xaxis = {...axis,type:'date',tickvals:dates,ticktext:peers.map(item=>item.expiry.slice(0,5))};
    help = 'Điểm lớn đánh dấu hợp đồng đang chọn.';
  } else {
    const x = Array.from({length:25},(_,i)=>latest.spot-72+i*6);
    const y = Array.from({length:18},(_,i)=>active.days*i/17);
    traces = [{type:'surface',x,y,z:y.map(d=>x.map(s=>s*Math.exp(.03*d/365))),showscale:false,
      colorscale:[[0,'#275c55'],[.5,'#5ce2d4'],[1,'#ffad75']],
      hovertemplate:'VN30 %{x:.1f}<br>%{y:.0f} ngày<br>Futures %{z:.1f}<extra></extra>'}];
    layout.scene = {xaxis:{title:'VN30 (điểm)'},yaxis:{title:'Ngày còn lại'},zaxis:{title:'Futures (điểm)'},bgcolor:terminalColors.canvas};
    layout.margin = {l:0,r:0,t:0,b:0};
    help = 'Kéo để xoay · F = S × exp[(r − q)T], giả định r = 4%, q = 1%.';
  }
  if (!availability) {
    const reason = 'CSV thiếu ngày đáo hạn để dựng đường cong hoặc giá lý thuyết 3D.';
    help = help ? help+' '+reason : reason;
  }
  if (active.coverage.offTick) help += ' Có '+active.coverage.offTick+' giá futures lệch bước 0,1 điểm. Replay dùng giá gốc trong tệp.';
  if (active.coverage.interruptions) help += ' Có '+active.coverage.interruptions+' đoạn lệch nhịp trong ngày, gồm cả nghỉ giữa phiên.';
  el('help').textContent = help;
  el('help').hidden = !help;
  el('chartTitle').textContent = mode===0 && active.coverage.days>1 ? 'Giá theo thời gian' : view.selectedOptions[0].text;
  el('ticker').textContent = active.code+' · '+(active.expiry ? 'Đáo hạn '+active.expiry : 'Kỳ hạn chưa xác định');
  el('chart').setAttribute('aria-label',el('chartTitle').textContent+' '+active.code+' · '+quoteBook.time(latest.time));
  Plotly.react(el('chart'),traces,layout,{responsive:true,displayModeBar:false,scrollZoom:false});
}

function sparkline(canvas, rows, active) {
  const context = canvas.getContext('2d');
  if (!context) return;
  const values = rows.slice(-90).map(row => row.close);
  const upper = Math.max(...values), lower = Math.min(...values);
  const width = canvas.width, height = canvas.height;
  const points = values.map((value,index) => [
    (width-6)*index/Math.max(values.length-1,1)+3,
    upper > lower ? height-6-(height-12)*(value-lower)/(upper-lower) : height/2
  ]);
  context.beginPath();
  context.moveTo(...points[0]);
  for (const point of points.slice(1)) context.lineTo(...point);
  if (points.length===1) context.lineTo(width-3,points[0][1]);
  context.strokeStyle = active ? terminalColors.amber : terminalColors.cyan;
  context.lineWidth = 2.5;
  context.stroke();
  context.lineTo(width-3,height);
  context.lineTo(3,height);
  context.closePath();
  const fill = context.createLinearGradient(0,0,0,height);
  fill.addColorStop(0,active ? 'rgba(255,173,117,.25)' : 'rgba(92,226,212,.21)');
  fill.addColorStop(1,'transparent');
  context.fillStyle = fill;
  context.fill();
}

function renderQuoteCards(index) {
  el('cards').replaceChildren(...contracts.map((_,i) => {
    const active = quoteBook.active(i);
    const row = active.rows.at(-1);
    const button = document.createElement('button');
    button.className = 'contract';
    button.type = 'button';
    button.dataset.id = i;
    button.dataset.source = active.source;
    button.setAttribute('aria-pressed',String(i===index));
    const top = document.createElement('span');
    top.className = 'terminal-contract-top';
    const name = document.createElement('strong');
    name.textContent = quoteTitle(active);
    const source = document.createElement('small');
    source.textContent = active.source === 'csv' ? 'CSV' : 'Mô phỏng';
    top.append(name,source);
    const identity = document.createElement('small');
    identity.className = 'terminal-contract-identity';
    identity.textContent = active.alias ? active.code+' · '+active.expiry : quoteBook.clock(row.time)+' ICT';
    const price = document.createElement('b');
    price.textContent = number(row.close,active.coverage.offTick ? 2 : 1);
    const basis = document.createElement('small');
    basis.className = 'terminal-contract-basis';
    basis.textContent = 'Basis '+(quoteBasis(active)>0?'+':'')+number(quoteBasis(active),2)+' điểm';
    const canvas = document.createElement('canvas');
    canvas.className = 'terminal-spark';
    canvas.width = 192;
    canvas.height = 64;
    canvas.setAttribute('aria-hidden','true');
    sparkline(canvas,active.rows,i===index);
    button.append(top,identity,price,basis,canvas);
    return button;
  }));
}

function renderQuoteSummary(active) {
  const latest = active.rows.at(-1);
  const basis = quoteBasis(active);
  const facts = [
    ['Futures',number(latest.close,active.coverage.offTick ? 2 : 1)+' điểm'],
    ['VN30',number(latest.spot,2)+' điểm'],
    ['Basis',(basis>0?'+':'')+number(basis,2)+' điểm'],
    ['Thời điểm dữ liệu',quoteBook.time(latest.time)+' ICT']
  ];
  el('quote-facts').replaceChildren(...facts.map(([name,value]) => {
    const div = document.createElement('div');
    const title = document.createElement('dt');
    title.textContent = name;
    const actual = document.createElement('dd');
    actual.textContent = value;
    div.append(title,actual);
    return div;
  }));
  el('quotes-time').textContent = quoteBook.time(latest.time)+' ICT';
  el('comparison-note').textContent = active.source === 'csv' ?
    'Đối chiếu các tệp CSV có cùng mốc giờ và mức VN30. Nguồn gốc giá do người nạp cung cấp. CSV thiếu ngày đáo hạn.' :
    'Cùng phiên mô phỏng và giá VN30. Basis năm = (Futures / VN30 − 1) × 365 / số ngày còn lại.';
  el('quotes').replaceChildren(...comparableQuotes(active).map(item => {
    const row = item.rows.at(-1);
    const tr = document.createElement('tr');
    if (item.index===current) tr.className = 'selected';
    const id = document.createElement('th');
    id.scope = 'row';
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.id = item.index;
    button.textContent = item.code;
    id.append(button);
    tr.append(id);
    const annualBasis = item.days > 0 ? number((row.close/row.spot-1)*36500/item.days,2)+'%' : '—';
    for (const value of [item.expiry || '—',number(row.close,item.coverage.offTick ? 2 : 1),number(row.close-row.spot,2),annualBasis,number(row.close-latest.close,2)]) {
      const cell = document.createElement('td');
      cell.textContent = value;
      tr.append(cell);
    }
    return tr;
  }));
}

function updateWorkspaceSource(active = quoteBook.active(current)) {
  const source = el('workspace-source');
  source.textContent = activeWorkspace==='builtin' ? 'Tham số nhập tay' : activeWorkspace==='custom' ? 'Bản nháp cục bộ' :
    active.source==='csv' ? 'CSV · '+active.sourceName : 'Dữ liệu mô phỏng';
  source.dataset.source = activeWorkspace==='builtin' || activeWorkspace==='custom' ? activeWorkspace : active.source;
}

function selectContract(index) {
  const active = quoteBook.active(index);
  if (!active?.rows.length) return;
  current = index;
  el('quote-import-status').textContent = '';
  const latest = active.rows.at(-1);
  const context = [active.code,active.source,active.sourceName,latest.time,latest.close].join('|');
  renderQuoteCards(index);
  renderQuoteSummary(active);
  paperTicket.setContext(active,previousQuote !== context);
  portfolioHedge.setContext(active);
  previousQuote = context;
  if (!el('desk').hidden) chart();
  updateWorkspaceSource(active);
  onQuoteContractChange(active.code);
}

function setTabSelected(id,selected) {
  const button = el(id);
  button.classList.toggle('active',selected);
  button.setAttribute('aria-pressed',String(selected));
}

function navigate(tab) {
  activeWorkspace = tab;
  const isFutures = tab==='futures' || tab==='strategy';
  const hasModels = tab==='strategy';
  el('futures-workspace').classList.toggle('replay-mode',hasModels);
  el('futures-workspace').hidden = !isFutures;
  el('desk').hidden = tab!=='futures';
  el('editor').hidden = tab!=='custom';
  el('lab').hidden = tab!=='builtin';
  el('quotes-import').parentElement.hidden = hasModels;
  for (const key of ['builtin','custom']) setTabSelected(key,tab===key);
  setTabSelected('futures',isFutures);
  setTabSelected('futures-quotes',!hasModels);
  setTabSelected('futures-models',hasModels);
  onStrategyVisibilityChange(hasModels);
  updateWorkspaceSource();
  if (tab==='futures') chart();
  if (tab==='builtin') render();
}

for (const key of ['futures','builtin','custom']) el(key).onclick = () => navigate(key);
el('futures-quotes').onclick = () => navigate('futures');
el('futures-models').onclick = () => navigate('strategy');
el('quotes-import').onclick = () => {
  el('strategy-csv').click();
};
el('quotes-template').onclick = () => el('strategy-template').click();
el('futures-workspace').onclick = event => {
  const target = event.target.closest('[data-id]');
  if (!target) return;
  const where = target.classList.contains('contract') ? 'cards' : 'quotes';
  selectContract(Number(target.dataset.id));
  if (event.detail===0) el(where).querySelector('[data-id="'+target.dataset.id+'"]')?.focus();
};
el('compareCurve').onchange = chart;
el('view').onchange = chart;
selectContract(0);
paperTicket.renderJournal();
