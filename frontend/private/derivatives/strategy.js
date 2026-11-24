(() => {
  const desk = document.createElement('section');
  desk.id = 'strategy-desk';
  desk.hidden = true;
  desk.setAttribute('aria-label','Mô hình và kiểm định VN30');
  desk.innerHTML = `
    <div class="desk-top">
      <div class="strategy-pick">
        <strong id="strategy-symbol"></strong>
        <button id="strategy-demo" class="desk-btn" type="button">Dùng lại phiên mẫu</button>
      </div>
      <label class="import-label">Nạp nến CSV <input id="strategy-csv" type="file" accept=".csv,text/csv"></label>
    </div>
    <div class="strategy-meta"><span id="strategy-source"></span><span id="strategy-time"></span></div>
    <p id="strategy-coverage" class="strategy-coverage"></p>
    <p id="strategy-error" class="strategy-body" role="status"></p>
    <div class="strategy-flex">
      <section class="panel">
        <div class="strategy-head"><h2 id="strategy-chart-title">Tín hiệu trong phiên</h2><output id="strategy-signal"></output></div>
        <div id="strategy-chart" class="strategy-chart" role="img" aria-label="Giá hoặc basis và ngưỡng của chiến lược"></div>
        <label for="strategy-bar">Nến đang xem <output id="strategy-bar-count"></output></label>
        <input id="strategy-bar" class="replay-slider" type="range" min="0" max="90" value="25" step="1">
        <button id="strategy-play" class="desk-btn" type="button">Phát lại</button>
        <div class="strategy-stat" id="strategy-metrics"></div>
        <details class="strategy-io">
          <summary>Định dạng CSV và quy tắc căn thời gian</summary>
          <p class="strategy-body">Nạp từ 22 đến 20.000 cặp nến đã đóng cho cùng một mã VN30 (mã KRX, ISIN KRX hoặc mã VN30F theo tháng). Ghép futures và VN30 cùng thời điểm, dùng giá theo điểm và timestamp có múi giờ. Cửa sổ mặc định cần 40 nến liên tiếp.</p>
          <pre>symbol,timestamp,futures_close,vn30_close
41I1GC000,2026-11-20T13:01:00+07:00,1824.6,1822.3</pre>
          <button id="strategy-template" class="desk-btn" type="button">Tải CSV mẫu</button>
        </details>
      </section>
      <section class="panel strategy-grid">
        <h2>Quy tắc và quản trị rủi ro</h2>
        <label>Mô hình
          <select id="strategy-method"></select>
        </label>
        <div class="row">
          <label>Cửa sổ dữ liệu (nến)<input id="strategy-window" type="number" min="20" max="240" step="1" value="40"></label>
          <label>Số nến giữ sau khớp<input id="strategy-hold" type="number" min="1" max="30" step="1" value="5"></label>
        </div>
        <p id="strategy-rule" class="strategy-body"></p>
        <p id="strategy-fit" class="strategy-body"></p>
        <details class="strategy-io"><summary>Phương trình và tài liệu gốc</summary>
          <p id="strategy-equation" class="strategy-body"></p>
          <p class="strategy-body"><a href="https://arxiv.org/abs/1411.5062">Leung và Li · Ornstein–Uhlenbeck</a> · <a href="https://users.ssc.wisc.edu/~behansen/718/EngleGranger1987.pdf">Engle–Granger · Error correction</a> · <a href="https://jebs.hvnh.edu.vn/index.php/jebs/article/view/5209">Nghiên cứu VN30 của Học viện Ngân hàng</a></p>
        </details>
        <h2 class="risk-head">Quy mô mô phỏng</h2>
        <div class="row">
          <label>Ngân sách lỗ (VND)<input id="strategy-budget" type="number" min="0" step="any" value="3000000"></label>
          <label>Dừng lỗ (điểm)<input id="strategy-stop" type="number" min="0.1" step="any" value="5"></label>
        </div>
        <label><input id="strategy-trailing-stop" type="checkbox" aria-describedby="strategy-trailing-note"> Dừng bám giá khi phát lại</label>
        <p id="strategy-trailing-note" class="strategy-body">Nếu bật, dùng cùng khoảng dừng và chỉ bám theo giá đóng cửa thuận lợi sau khi khớp vào. Khi chạm ngưỡng, thử thoát ở nến kế tiếp.</p>
        <details class="strategy-risk">
          <summary>Phí, trượt giá và ký quỹ</summary>
          <label>Phí hai chiều mỗi HĐ (VND)<input id="strategy-fee" type="number" min="0" step="any" value="30000"></label>
          <label>Trượt giá mỗi chiều (điểm)<input id="strategy-slip" type="number" min="0" step="any" value="0.2"></label>
          <label>Ký quỹ một HĐ (VND, tùy chọn)<input id="strategy-margin" type="number" min="0" step="any" value="0"></label>
          <label>Vốn khả dụng dành cho ký quỹ (VND)<input id="strategy-capital" type="number" min="0" step="any" value="0"></label>
        </details>
        <div id="strategy-size" class="strategy-result"></div>
        <button id="strategy-brief" class="desk-btn" type="button">Xuất phân tích để hỏi AI</button>
        <small id="strategy-brief-status" role="status"></small>
      </section>
    </div>
    <section class="panel wide" id="strategy-backtest">
      <div class="panelhead"><h2>So sánh chiến lược sau phí</h2><button id="strategy-compare" type="button" class="active">Chạy so sánh</button></div>
      <div class="row"><label>Phạm vi<select id="strategy-range"><option value="holdout">30% nến cuối · kiểm tra theo thời gian</option><option value="all">Toàn bộ dữ liệu đang nạp</option><option value="cursor">Đến nến đang xem</option></select></label></div>
      <p class="strategy-body" id="strategy-range-note"></p>
      <details class="strategy-io"><summary>Giả định khớp và chi phí</summary><p class="strategy-body">Mỗi lượt 1 HĐ. Hai quy tắc QuanTik dùng mục tiêu tham chiếu để lọc tín hiệu theo chi phí. Lệnh thoát theo thời gian giữ hoặc quy tắc dừng. Tín hiệu và dừng lỗ dùng nến đã đóng. Khớp tại giá đóng nến kế tiếp, cộng trượt giá mỗi chiều và trừ phí hai chiều. Lệnh chờ mở hết hiệu lực khi đứt chuỗi. Vị thế đang mở gặp khoảng trống được chốt tại giá đóng đầu tiên có lại. Nến cuối phạm vi chỉ dùng để chốt vị thế còn mở. Giá khớp là ước tính từ nến.</p></details>
      <p class="strategy-body" id="strategy-backtest-status" role="status">Chọn phạm vi và chạy so sánh.</p>
      <div class="scroll" id="strategy-report" hidden><table><thead><tr><th scope="col">Quy tắc</th><th scope="col">Nến xét tín hiệu</th><th scope="col">Lượt chốt</th><th scope="col">Lượt lời</th><th scope="col">P&amp;L ròng (VND)</th><th scope="col">Drawdown (VND)</th><th scope="col">Chốt do gián đoạn / hết dữ liệu</th></tr></thead><tbody id="strategy-report-rows"></tbody></table></div>
      <div id="strategy-equity" class="strategy-chart" hidden role="img" aria-label="P&amp;L mô phỏng tích lũy theo nến"></div>
      <section id="strategy-ledger" class="trade-ledger" hidden aria-labelledby="ledger-title">
        <div class="panelhead"><h3 id="ledger-title" tabindex="-1">Nhật ký khớp mô phỏng</h3><button id="strategy-export-trades" class="desk-btn" type="button">Tải giao dịch CSV</button></div>
        <p id="ledger-summary" class="strategy-body" role="status"></p>
        <div id="ledger-scroll" class="scroll"><table><thead><tr><th scope="col">Tín hiệu (ICT)</th><th scope="col">Khớp vào (ICT)</th><th scope="col">Khớp ra (ICT)</th><th scope="col">Chiều</th><th scope="col">Giá vào</th><th scope="col">Giá ra</th><th scope="col">Ròng (VND)</th><th scope="col">Lý do thoát</th></tr></thead><tbody id="ledger-trades"></tbody></table></div>
        <button id="ledger-more" class="desk-btn" type="button" hidden>Xem thêm giao dịch</button>
      </section>
    </section>
    <div class="strategy-foot"><a href="./?tab=options#option-playbooks">Chiến lược quyền chọn</a><button id="strategy-hedge-link" class="desk-btn" type="button">Phòng hộ vị thế quyền chọn</button><span><a href="https://developers.ssi.com.vn/docs/faq/market-data">Tài liệu feed phái sinh SSI</a></span></div>`;
  el('desk').after(desk);

  const keys = ['window','hold','budget','stop','fee','slip','margin','capital'];
  const fitKeys = ['window','hold','fee','slip'];
  const money = new Intl.NumberFormat('vi-VN',{maximumFractionDigits:0});
  const axis = {gridcolor:'#2a403c',zerolinecolor:'#486961',automargin:true};
  const chartTime = ms => new Date(ms + 7*3600000).toISOString().slice(0,-1);
  let dataset = null, symbol, rows, source, playback = null, lastBrief = null;
  let worker = null, batchId = 0, report = null, displayedTrades = 50, importId = 0;
  const status = el('strategy-error');
  const slider = el('strategy-bar');
  const method = el('strategy-method');
  method.replaceChildren(...Object.entries(futuresMethods).map(([key,item])=>new Option(item.name,key)));

  function download(filename, payload, type) {
    const url = URL.createObjectURL(new Blob([payload],{type}));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }

  function stopPlayback() {
    clearInterval(playback);
    playback = null;
    el('strategy-play').textContent = 'Phát lại';
  }

  function followContract() {
    const next = quoteBook.active(current);
    if (dataset === next) return;
    stopPlayback();
    dataset = next;
    symbol = next.code;
    rows = next.rows;
    source = next.source === 'csv' ? 'CSV do bạn nạp · '+next.sourceName : 'Dữ liệu mô phỏng';
    el('strategy-symbol').textContent = next.alias ? 'VN30'+next.alias+' · '+symbol : symbol;
    slider.max = rows.length-1;
    slider.value = next.source === 'csv' ? rows.length-1 : Math.min(58,rows.length-1);
    const coverage = next.coverage;
    const minutes = coverage.cadence ? number(coverage.cadence/60000, coverage.cadence%60000 ? 2 : 0)+' phút' : 'chưa xác định';
    el('strategy-coverage').textContent = rows.length+' nến · '+coverage.days+' ngày · Nhịp phổ biến '+minutes+
      ' · Chuỗi đều dài nhất '+coverage.longest+' nến · '+coverage.interruptions+' lần lệch nhịp trong ngày (gồm nghỉ giữa phiên).'+
      (coverage.offTick ? ' Có '+coverage.offTick+' giá futures lệch bước 0,1 điểm. Replay dùng giá gốc đã nhập.' : '');
    status.textContent = '';
    invalidateReport();
    draw();
  }

  function draw() {
    if (desk.hidden) return;
    el('strategy-brief-status').textContent='';
    const values = Object.fromEntries(keys.map(key=>[key,el('strategy-'+key).valueAsNumber]));
    const index = slider.valueAsNumber;
    const strategy=method.value, definition=futuresMethods[strategy];
    const latest=rows[index];
    if(!latest) return;
    const validFit=fitKeys.every(key=>el('strategy-'+key).checkValidity()&&Number.isFinite(values[key]));
    const state=validFit?strategyState(rows,index,strategy,values):{error:'Kiểm tra cửa sổ, thời gian giữ và chi phí.'};
    const cutoff=Math.max(0,index-119);
    const displayed=displayBars(rows.slice(cutoff,index+1),dataset.coverage.cadence);
    const x=displayed.map(row=>chartTime(row.time));
    const isRule=Object.hasOwn(relativePriceRules,strategy);
    const signal=state.error?'Chưa đủ dữ liệu':state.side>0?'Kịch bản Long':state.side<0?'Kịch bản Short':
      state.net===null?'Chưa đủ điều kiện vào lệnh':isRule?'Biên tham chiếu chưa vượt phí':'Biên kỳ vọng chưa vượt phí';
    el('strategy-chart-title').textContent=isRule?'Futures và mục tiêu tham chiếu':'Futures và quỹ đạo dự phóng';
    el('strategy-signal').textContent=signal;
    el('strategy-source').textContent=source;
    el('strategy-time').textContent='Nến đang xem '+quoteBook.time(latest.time)+' ICT';
    el('strategy-bar-count').textContent=(index+1)+' / '+rows.length;
    el('strategy-rule').textContent=definition.rule;
    el('strategy-equation').textContent=definition.formula;
    el('strategy-fit').textContent=state.error||state.diagnostic+(isRule ? '' :
      ' · RMSE '+(strategy==='kalman'?'sai lệch quan sát':'trong cửa sổ')+' '+number(state.rmse,3)+' điểm.');
    const unavailable=Boolean(state.error)||state.net===null;
    const approachMetrics=isRule ? [
      ['Mục tiêu tham chiếu',unavailable?'—':number(state.target,2)+' điểm'],
      ['Biên tham chiếu sau chi phí',unavailable?'—':number(state.net,2)+' điểm']
    ] : [
      ['Dịch chuyển dự phóng sau khớp',state.error?'—':number(state.expected,2)+' điểm'],
      ['Biên sau chi phí',state.error?'—':number(state.net,2)+' điểm']
    ];
    const metrics=[
      ['Futures',number(latest.close,dataset.coverage.offTick ? 2 : 1)],['Basis',number(latest.close-latest.spot,2)],
      ...approachMetrics
    ];
    el('strategy-metrics').replaceChildren(...metrics.map(([label,value])=>{
      const div=document.createElement('div'), small=document.createElement('small'), strong=document.createElement('strong');
      small.textContent=label;strong.textContent=value;div.append(small,strong);return div;
    }));
    const traces=[{type:'scatter',mode:dataset.coverage.cadence && index>0 ? 'lines' : 'markers',name:'Futures quan sát',x,y:displayed.map(row=>row.close),line:{color:'#ffad75',width:2.5}}];
    if(state.points) {
      const projected=state.points.map((_,i)=>chartTime(latest.time+i*state.cadence));
      traces.push({type:'scatter',mode:'lines',name:'Dự phóng',x:projected,y:state.points,line:{color:'#5ce2d4',width:2,dash:'dot'}});
      traces.push({type:'scatter',mode:'markers',name:'Mốc khớp và thoát giả định',x:[projected[1],projected.at(-1)],y:[state.points[1],state.points.at(-1)],marker:{size:8,color:'#5ce2d4'}});
    } else if (state.target!==undefined) {
      traces.push({type:'scatter',mode:'lines',name:'Mục tiêu tham chiếu',x:[x[0],x.at(-1)],y:[state.target,state.target],
        line:{color:'#5ce2d4',width:2,dash:'dot'}});
    }
    Plotly.react(el('strategy-chart'),traces,{
      margin:{l:55,r:12,t:14,b:75},paper_bgcolor:'transparent',plot_bgcolor:'transparent',
      legend:{orientation:'h',y:-.35},font:{color:'#b5c6c2'},xaxis:{...axis,type:'date',tickformat:'%H:%M',hoverformat:'%d/%m %H:%M',title:{text:'Giờ Việt Nam (ICT)'}},yaxis:{...axis,title:{text:'Điểm'}},hovermode:'x unified'
    },{responsive:true,displayModeBar:false});
    const sized = keys.slice(2).every(k=>Number.isFinite(values[k])&&el('strategy-'+k).validity.valid)
      ? strategySize(values.budget,values.stop,values.fee,values.slip,values.margin,values.capital) : null;
    const stop = sized && state.side && state.points ? state.points[1] - state.side * values.stop : null;
    el('strategy-size').textContent = sized ? 'Lỗ ước tính mỗi HĐ ' + money.format(sized.loss) + ' ₫. Tối đa ' + money.format(sized.count) +
      ' HĐ' + (sized.marginLimit === null ? ' theo ngân sách lỗ, chưa tính sức mua.' : ' theo ngân sách lỗ và ký quỹ đã nhập.') +
      (stop !== null ? ' Mức dừng giả định ' + number(stop,2) + ' điểm tính từ giá khớp dự phóng.' : '') +
      ' Mức lỗ có thể vượt giả định nếu giá nhảy qua điểm dừng.' : 'Kiểm tra ngân sách, khoảng dừng, phí và ký quỹ.';
    lastBrief = {symbol,source:source.startsWith('CSV')?'CSV do người dùng cung cấp':source,as_of:new Date(latest.time).toISOString(),method:method.value,signal,stats:state,assumptions:{...values,trailingStop:el('strategy-trailing-stop').checked},position_size:sized,stop};
  }

  function invalidateReport() {
    batchId++;
    worker?.terminate();
    worker = null;
    report = null;
    el('strategy-compare').disabled = false;
    for (const id of ['strategy-report','strategy-equity','strategy-ledger']) el(id).hidden=true;
    el('strategy-backtest-status').textContent='Chọn phạm vi và chạy so sánh sau phí.';
    el('strategy-range-note').textContent = el('strategy-range').value === 'holdout'
      ? 'Chấm các chiến lược trên 30% nến cuối, bắt đầu với vị thế bằng 0. Chỉ dùng nến đến thời điểm tín hiệu. Nếu chọn chiến lược hoặc chỉnh tham số sau khi xem kết quả, hãy đánh giá lại trên dữ liệu mới.'
      : 'Tính tín hiệu cuốn chiếu trên nến đã đóng. Chỉ tính giao dịch trong phạm vi đang chọn. Đối chứng đứng ngoài có P&L bằng 0.';
  }

  function showLedger() {
    if (!report) return;
    const trades = report.results[method.value].trades;
    const start = Math.max(0, trades.length-displayedTrades);
    const model = futuresMethods[method.value].name;
    for (const row of el('strategy-report-rows').rows) {
      const selected = row.dataset.method === method.value;
      row.classList.toggle('selected',selected);
      row.querySelector('button').setAttribute('aria-pressed',String(selected));
    }
    const lines = trades.slice(start).reverse().map(trade => {
      const tr = document.createElement('tr');
      const values = [
        quoteBook.time(trade.signalTime),quoteBook.time(trade.entryTime),quoteBook.time(trade.time),
        trade.side === 1 ? 'Long' : 'Short', number(trade.entry,2),number(trade.exit,2),money.format(trade.pnl),trade.reason
      ];
      for (const value of values) {
        const td = tr.insertCell();
        td.textContent = value;
      }
      return tr;
    });
    el('ledger-trades').replaceChildren(...lines);
    el('ledger-scroll').hidden = !trades.length;
    el('ledger-more').hidden = start === 0;
    el('strategy-export-trades').disabled = !trades.length;
    el('ledger-summary').textContent = model+' · '+symbol+' · '+(trades.length
      ? 'Hiện '+lines.length+' / '+trades.length+' lượt, mới nhất trước. Giá vào và ra đã gồm trượt giá.'
      : 'Chưa có lượt khớp trong phạm vi này.');
    el('strategy-ledger').hidden = false;
  }

  function showReport(data,firstSignal,results,config,range) {
    report = {results,config,range,first:rows[firstSignal].time,last:data.at(-1).time};
    displayedTrades = 50;
    const table = el('strategy-report-rows');
    table.replaceChildren(...Object.entries(results).map(([key,result]) => {
      const row = document.createElement('tr');
      row.dataset.method = key;
      const values = [futuresMethods[key].name,result.eligible,result.trades.length,result.wins,money.format(result.net),money.format(result.drawdown),result.forced];
      values.forEach((value,i) => {
        const cell = document.createElement(i ? 'td' : 'th');
        if (!i) {
          cell.scope = 'row';
          const pick = document.createElement('button');
          pick.type = 'button';
          pick.className = 'ledger-model';
          pick.textContent = value;
          pick.setAttribute('aria-label','Xem nhật ký '+value);
          pick.onclick = () => {
            method.value = key;
            displayedTrades = 50;
            showLedger();
            draw();
            el('ledger-title').focus();
          };
          cell.append(pick);
        } else cell.textContent = value;
        row.append(cell);
      });
      return row;
    }));
    el('strategy-compare').disabled=false;
    el('strategy-report').hidden=false;
    el('strategy-equity').hidden=false;
    const scored = data.slice(firstSignal);
    const period = quoteBook.time(scored[0].time)+' – '+quoteBook.time(scored.at(-1).time)+' ICT';
    el('strategy-backtest-status').textContent = symbol+' · '+source+' · '+period+' · '+
      scored.length+' nến đánh giá · '+(range==='holdout' ? firstSignal+' nến trước mốc chia. ' : '')+
      (Object.values(results).every(result=>!result.trades.length) ? 'Chưa có lượt khớp theo giả định đã chọn.' : 'Đối chứng đứng ngoài 0 ₫.');
    const colors=['#ffad75','#5ce2d4','#d2a7f5','#9ce79c','#ffd76a','#84aaff'];
    const x=scored.map(row=>chartTime(row.time));
    Plotly.react(el('strategy-equity'),Object.entries(results).map(([key,result],i)=>({
      type:'scatter',mode:'lines',name:futuresMethods[key].name.split(' · ')[0],x,y:result.equity,
      line:{color:colors[i],width:2,dash:['solid','dash','dot','dashdot','longdash','longdashdot'][i]}
    })),{
      margin:{l:66,r:12,t:15,b:85},font:{color:'#b5c6c2'},paper_bgcolor:'transparent',plot_bgcolor:'transparent',
      legend:{orientation:'h',y:-.35},xaxis:{...axis,type:'date',tickformat:'%H:%M',hoverformat:'%d/%m %H:%M',title:{text:'Giờ Việt Nam (ICT)'}},
      yaxis:{...axis,title:{text:'P&L (VND)'}},hovermode:'x unified'
    },{responsive:true,displayModeBar:false});
    showLedger();
  }

  el('strategy-compare').onclick=()=>{
    stopPlayback();
    invalidateReport();
    const fields=['window','stop','fee','slip','hold'];
    const inputs=fields.map(key=>el('strategy-'+key));
    const config=Object.fromEntries(fields.map((key,i)=>[key,inputs[i].valueAsNumber]));
    config.trailingStop=el('strategy-trailing-stop').checked;
    if (inputs.some(input=>!input.checkValidity()||!Number.isFinite(input.valueAsNumber))) {
      el('strategy-backtest-status').textContent='Kiểm tra cửa sổ, thời gian giữ, ngưỡng và chi phí.';return;
    }
    const range = el('strategy-range').value;
    const data = range==='cursor' ? rows.slice(0,slider.valueAsNumber+1) : rows;
    const firstSignal = range==='holdout' ? Math.floor(data.length*.7) : 0;
    const id = batchId;
    const finish = results => {
      if (id!==batchId) return;
      worker?.terminate();
      worker = null;
      showReport(data,firstSignal,results,config,range);
    };
    const fallback = () => {
      if (id!==batchId) return;
      worker?.terminate();
      worker = null;
      setTimeout(()=>{
        if (id!==batchId) return;
        const results = Object.fromEntries(Object.keys(futuresMethods).map(key =>
          [key,replayStrategy(data,key,config,firstSignal)]));
        finish(results);
      },0);
    };
    el('strategy-compare').disabled=true;
    el('strategy-backtest-status').textContent='Đang kiểm định '+Object.keys(futuresMethods).length+' chiến lược…';
    try {
      worker = new Worker('replay-worker.js');
      worker.onmessage = event => finish(event.data);
      worker.onerror = fallback;
      worker.postMessage({data,firstSignal,config});
    } catch { fallback(); }
  };

  el('ledger-more').onclick=()=>{ displayedTrades+=50; showLedger(); };
  el('strategy-export-trades').onclick=()=>{
    if (!report) return;
    const cfg=report.config;
    const header=['symbol','model','source','source_file','range','range_start_utc','range_end_utc','window_bars','hold_bars','stop_points','slip_points_per_side','quantity','signal_utc','entry_utc','exit_utc','side','entry_fill_points','exit_fill_points','gross_vnd','slippage_vnd','fee_roundtrip_vnd','net_vnd','exit_reason','trailing_stop_enabled','signal_reference_target_points'];
    const iso = time => new Date(time).toISOString();
    const csvCell = value => {
      if (typeof value==='number') return String(value);
      // Keep filenames textual when this CSV is opened in a spreadsheet.
      const text = String(value);
      return '"'+(/^[=+@\-\t\r]/.test(text) ? "'" : '')+text.replaceAll('"','""')+'"';
    };
    const lines = report.results[method.value].trades.map(t=>[
      symbol,method.value,dataset.source,dataset.sourceName,report.range,iso(report.first),iso(report.last),cfg.window,cfg.hold,cfg.stop,cfg.slip,1,
      iso(t.signalTime),iso(t.entryTime),iso(t.time),t.side===1?'Long':'Short',Number(t.entry.toFixed(6)),Number(t.exit.toFixed(6)),
      t.gross,t.slippageCost,t.fee,t.pnl,t.reason,cfg.trailingStop?1:0,t.signalTarget??''
    ].map(csvCell).join(','));
    download('quantik-'+symbol+'-'+method.value+'-'+report.range+'.csv','\uFEFF'+[header.join(','),...lines].join('\r\n')+'\r\n','text/csv;charset=utf-8');
  };

  function importMessage(message) {
    status.textContent=message;
    const quotesStatus=el('quote-import-status');
    if (quotesStatus) quotesStatus.textContent=message;
  }

  el('strategy-demo').onclick = () => {
    importId++;
    dataset = null;
    selectContract(quoteBook.reset(current));
    importMessage('');
  };
  el('strategy-csv').onchange = async event => {
    const input=event.target, file=input.files[0];
    if (!file) return;
    const request=++importId;
    input.value='';
    try {
      if (file.size>4000000) throw new Error('Tệp CSV vượt quá 4 MB.');
      const data=parseStrategyCsv(await file.text());
      if (request!==importId) return;
      selectContract(quoteBook.put(data.symbol,data.rows,file.name));
      importMessage('Đã nạp '+data.rows.length+' cặp nến cho '+data.symbol+' trong phiên làm việc này.');
    } catch(error) {
      if (request===importId) importMessage('Chưa nạp CSV. '+error.message+' Dữ liệu đang xem vẫn còn.');
    }
  };
  el('strategy-template').onclick = () => {
    const template=quoteBook.template(current);
    const lines=template.rows.map(row=>[template.code,new Date(row.time).toISOString(),row.close.toFixed(1),row.spot.toFixed(2)].join(','));
    download('QuanTik-phien-mo-phong.csv','symbol,timestamp,futures_close,vn30_close\n'+lines.join('\n'),'text/csv;charset=utf-8');
  };
  const invalidateAtCursor = () => {if (el('strategy-range').value==='cursor') invalidateReport();};
  slider.oninput = () => { stopPlayback();invalidateAtCursor();draw(); };
  el('strategy-play').onclick = () => {
    if (playback) {stopPlayback();return;}
    if (slider.valueAsNumber === rows.length-1) slider.value = Math.min(rows.length-1,Math.max(0,el('strategy-window').valueAsNumber-1));
    draw();
    el('strategy-play').textContent = 'Tạm dừng';
    playback = setInterval(()=>{
      slider.valueAsNumber += 1;
      invalidateAtCursor();
      draw();
      if (slider.valueAsNumber >= rows.length-1) stopPlayback();
    },500);
  };
  for (const key of [...keys,'range']) el('strategy-'+key).oninput=()=>{invalidateReport();draw();};
  el('strategy-trailing-stop').onchange=()=>{invalidateReport();draw();};
  method.onchange=()=>{displayedTrades=50;showLedger();draw();};
  el('strategy-brief').onclick=()=>{
    if (!lastBrief) return;
    const prompt = 'Giải thích tín hiệu theo các điều kiện đã chọn. Chỉ ra dữ kiện nào là giả định, rủi ro nào chưa được đo và điều gì làm kịch bản mất hiệu lực. Dùng ngữ cảnh sau.\n\n';
    download('quantik-ngu-canh-ai.txt',prompt+JSON.stringify(lastBrief,null,2),'text/plain;charset=utf-8');
    el('strategy-brief-status').textContent='Đã xuất ngữ cảnh và câu hỏi.';
  };
  el('strategy-hedge-link').onclick=()=>{
    navigate('builtin');
    document.getElementById('option-hedge')?.scrollIntoView({block:'start'});
  };

  onQuoteContractChange=followContract;
  onStrategyVisibilityChange=active=>{
    desk.hidden=!active;
    if(active) draw();
    else stopPlayback();
  };
  followContract();

  const params=new URLSearchParams(location.search);
  const options=params.get('tab')==='options';
  const models=params.get('view')==='models'||location.hash==='#strategy-backtest'||location.hash==='#strategy-desk';
  navigate(options?'builtin':models?'strategy':'futures');
  if(models&&!options&&location.hash) requestAnimationFrame(()=>document.getElementById(location.hash.slice(1))?.scrollIntoView());
  if(!options&&!models&&location.hash==='#portfolio-hedge') {
    el('portfolio-hedge').open=true;
    requestAnimationFrame(()=>el('portfolio-summary').focus());
  }
})();
