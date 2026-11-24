(() => {
  const lab = el('lab');
  const panel = document.createElement('section');
  panel.id = 'option-hedge';
  panel.className = 'panel wide';
  panel.innerHTML = `
    <h2>Phòng hộ Delta bằng VN30 Futures</h2>
    <p class="strategy-body">Định giá lại danh mục khi tài sản cơ sở đổi giá. Số HĐ futures được làm tròn đến hợp đồng gần nhất.</p>
    <div id="hedge-controls" class="hedge-controls">
      <div class="row">
        <label>Vị thế quyền chọn (+ mua / − bán)<input id="hedge-count" type="number" min="-10000" max="10000" step="1" value="4"></label>
        <label>Hệ số quyền chọn giả định (VND/điểm)<input id="hedge-multiplier" type="number" min="1" max="10000000" step="any" value="100000"></label>
        <label>Futures đổi điểm khi cơ sở đổi 1 điểm<input id="hedge-link" type="number" min="0.01" max="10" step="any" value="1"></label>
        <label>Thay đổi basis khi stress (điểm)<input id="hedge-basis" type="number" min="-1000" max="1000" step="any" value="0"></label>
      </div>
    </div>
    <p id="hedge-summary" class="strategy-body hedge-summary" aria-live="polite"></p>
    <div id="hedge-chart" class="strategy-chart" role="img" aria-label="Lãi lỗ kịch bản trước và sau phòng hộ Delta"></div>
    <p class="strategy-body">Cam · P&amp;L quyền chọn. Xanh · P&amp;L sau phòng hộ. Giữ nguyên kỳ hạn và biến động, giả định futures dịch chuyển tuyến tính, trước phí và ký quỹ.</p>`;
  lab.insertBefore(panel,el('pricing-footer'));

  function drawHedge() {
    if (lab.hidden) return;
    const {spot,warrant,error,evaluate} = readOptionInputs();
    const summary = el('hedge-summary');
    const graph = el('hedge-chart');
    el('hedge-controls').hidden = warrant;
    graph.hidden = true;
    graph.nextElementSibling.hidden = true;
    if (warrant) {
      summary.textContent='Chứng quyền lấy cổ phiếu làm cơ sở. Phòng hộ bằng chỉ số cần thêm beta và quy đổi độ nhạy giữa cổ phiếu với VN30. Chọn quyền chọn chỉ số hoặc trên futures để thử công cụ này.';
      return;
    }
    const ids = ['count','multiplier','link','basis'].map(key=>el('hedge-'+key));
    if (error || ids.some(input=>!input.validity.valid||!Number.isFinite(input.valueAsNumber))) {
      summary.textContent=error || 'Kiểm tra số hợp đồng, hệ số và độ nhạy trong từng ô.';
      return;
    }
    const [count,multiplier,link,basis] = ids.map(input=>input.valueAsNumber);
    const step=Math.max(spot*.0005,.001);
    const delta=(evaluate(spot+step)-evaluate(spot-step))/(2*step);
    const hedge=hedgeContracts(count,multiplier,delta,link);
    const x=Array.from({length:61},(_,i)=>(i-30)/3);
    const underlying=x.map(pct=>spot*(1+pct/100));
    const entry=evaluate(spot);
    const unhedged=underlying.map(value=>(evaluate(value)-entry)*count*multiplier);
    const hedged=unhedged.map((pnl,i)=>pnl+hedge.futures*vn30Multiplier*((underlying[i]-spot)*link+basis));
    const orientation=hedge.futures>0?'Long ':hedge.futures<0?'Short ':'';
    summary.textContent='Phòng hộ mô phỏng: '+orientation+number(Math.abs(hedge.futures),0)+' HĐ futures. Delta quy đổi trước phòng hộ '+number(hedge.exposure,0)+' VND/điểm, còn lại '+number(hedge.residual,0)+' VND/điểm.';
    graph.hidden=false;
    graph.nextElementSibling.hidden=false;
    const series=(name,y,color)=>({type:'scatter',mode:'lines',name,x,y,line:{color,width:2.5},hovertemplate:'%{y:,.0f} VND<extra>'+name+'</extra>'});
    const axis={gridcolor:'#2c4141',zerolinecolor:'#45615f',automargin:true};
    Plotly.react(graph,[series('Quyền chọn',unhedged,'#ffad75'),series('Đã phòng hộ',hedged,'#5ce2d4')],{
      paper_bgcolor:'transparent',plot_bgcolor:'transparent',margin:{l:60,r:10,t:14,b:45},font:{color:'#b7c7c3'},
      xaxis:{...axis,title:'Thay đổi giá cơ sở (%)'},yaxis:{...axis,title:'P&L giả định (VND)'},showlegend:false,hovermode:'x unified'
    },{responsive:true,displayModeBar:false});
  }
  let frame;
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(drawHedge);};
  lab.addEventListener('input',schedule);
  new MutationObserver(schedule).observe(lab,{attributes:true,attributeFilter:['hidden']});
  schedule();
})();
