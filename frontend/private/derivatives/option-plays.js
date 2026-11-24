const optionPlaybooks = {
  bull: {name:'Bull Call Spread', intent:'Giả định giá tăng vừa phải. Chân Call bán giới hạn lợi nhuận.', legs:[[0,false,1],[1,false,-1]]},
  bear: {name:'Bear Put Spread', intent:'Giả định giá giảm vừa phải. Chân Put bán giới hạn lợi nhuận.', legs:[[0,true,1],[-1,true,-1]]},
  straddle: {name:'Long Straddle', intent:'Cần giá dịch chuyển đủ xa theo một trong hai hướng để bù hai khoản phí quyền chọn.', legs:[[0,false,1],[0,true,1]]},
  strangle: {name:'Long Strangle', intent:'Mua Put và Call ở hai strike khác nhau để thử kịch bản biến động lớn.', legs:[[-1,true,1],[1,false,1]]},
  butterfly: {name:'Call Butterfly', intent:'P&L khi đáo hạn đạt đỉnh quanh strike giữa.', legs:[[-1,false,1],[0,false,-2],[1,false,1]]},
  condor: {name:'Short Iron Condor', intent:'Giả định giá đáo hạn nằm trong vùng giữa hai strike bán. Hai chân mua giới hạn lỗ.', legs:[[-2,true,1],[-1,true,-1],[1,false,-1],[2,false,1]]}
};

function optionPayoff(legs, spot) {
  return legs.reduce((sum,[strike,put,quantity])=>sum+quantity*Math.max(0,put?strike-spot:spot-strike),0);
}

function expiryProfile(legs,premium) {
  const strikes=[0,...new Set(legs.map(([strike])=>strike))].sort((a,b)=>a-b);
  const values=strikes.map(spot=>optionPayoff(legs,spot)-premium);
  const finalSlope=legs.reduce((sum,[,put,quantity])=>put?sum:sum+quantity,0);
  const roots=[];
  let flatZero=false;
  const eps=1e-8;
  for(let i=1;i<strikes.length;i++) {
    const prev=values[i-1],curr=values[i];
    if(Math.abs(prev)<eps && Math.abs(curr)<eps) flatZero=true;
    else if(Math.abs(prev)<eps) roots.push(strikes[i-1]);
    else if(prev*curr<0) roots.push(strikes[i-1]+(strikes[i]-strikes[i-1])*(-prev)/(curr-prev));
  }
  const terminal=values.at(-1);
  if(Math.abs(terminal)<eps) {
    if(!finalSlope) flatZero=true;
    else roots.push(strikes.at(-1));
  } else if(terminal*finalSlope<0) roots.push(strikes.at(-1)-terminal/finalSlope);
  return {
    lower:finalSlope<0?-Infinity:Math.min(...values),
    upper:finalSlope>0?Infinity:Math.max(...values),
    roots,flatZero
  };
}

(() => {
  const lab=el('lab'), panel=document.createElement('section');
  panel.id='option-playbooks';
  panel.className='panel wide';
  panel.innerHTML=`
    <div class="panelhead"><h2>Chiến lược quyền chọn nhiều chân</h2><small>Kịch bản định giá</small></div>
    <div class="row play-controls">
      <label>Chiến lược<select id="play-method"></select></label>
      <label>Khoảng cách strike (điểm)<input id="play-width" type="number" min="0.1" step="any" value="35"></label>
      <label>Phí ròng tự nhập (điểm)<input id="play-premium" type="number" step="any" placeholder="Theo mô hình"></label>
    </div>
    <div class="row play-controls">
      <label>Ngày đánh giá <output id="play-day-label"></output><input id="play-day" type="range" min="0" value="15"></label>
      <label>Cú sốc biến động <output id="play-iv-label"></output><input id="play-iv" type="range" min="-20" max="20" value="0"></label>
    </div>
    <p class="strategy-body" id="play-intent"></p>
    <p class="strategy-body" id="play-summary" aria-live="polite"></p>
    <div id="play-legs" class="scroll"></div>
    <div id="play-chart" class="strategy-chart" role="img" aria-label="Lãi lỗ chiến lược nhiều chân theo giá cơ sở"></div>
    <p class="strategy-body">Cam · Ngày đánh giá. Xanh nét đứt · Đáo hạn. Giá, phí quyền chọn và P&amp;L tính theo điểm trên một bộ vị thế, trước phí giao dịch. Strike giữa lấy từ ô Giá thực hiện ở phần định giá.</p>
  `;
  lab.insertBefore(panel,el('option-hedge'));
  el('play-method').replaceChildren(...Object.entries(optionPlaybooks).map(([id,book])=>new Option(book.name,id)));
  const fmt=new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2});
  const status=el('play-summary'), chart=el('play-chart');

  function renderPlay() {
    if(lab.hidden) return;
    const inputs=readOptionInputs();
    panel.hidden=inputs.warrant;
    if(panel.hidden) return;
    const {spot,strike,vol,days,rate,yieldRate,future,error}=inputs;
    const playbook=optionPlaybooks[el('play-method').value];
    el('play-intent').textContent=playbook.intent;
    const width=el('play-width').valueAsNumber;
    const legs=playbook.legs.map(([offset,put,quantity])=>[strike+offset*width,put,quantity]);
    const premiumInput=el('play-premium');
    const elapsed=el('play-day');
    elapsed.max=days;
    const day=elapsed.valueAsNumber;
    const requestedVol=(vol*100+el('play-iv').valueAsNumber)/100;
    const scenarioVol=Math.max(.01,requestedVol);
    el('play-day-label').textContent=day===days?'Đáo hạn':'+'+day+' ngày';
    el('play-iv-label').textContent=fmt.format(scenarioVol*100)+'% IV';
    const invalid=error||!el('play-width').validity.valid||!Number.isFinite(width)||
      !premiumInput.validity.valid||legs.some(([k])=>!(k>0));
    chart.hidden=Boolean(invalid);
    el('play-legs').hidden=Boolean(invalid);
    if(invalid) {
      status.textContent=error||'Điều chỉnh khoảng cách để tất cả strike lớn hơn 0. Kiểm tra phí tự nhập.';
      return;
    }
    const priceLegs=(s,sigma,t)=>legs.reduce((sum,[k,put,n])=>sum+n*price(s,k,sigma,t,future,put,rate,yieldRate),0);
    const estimated=priceLegs(spot,vol,days/365);
    const premium=premiumInput.value===''?estimated:premiumInput.valueAsNumber;
    const payoff=s=>optionPayoff(legs,s)-premium;
    const outcome=s=>day===days?payoff(s):priceLegs(s,scenarioVol,(days-day)/365)-premium;
    const summary=expiryProfile(legs,premium);
    const best=summary.upper===Infinity?'không giới hạn':fmt.format(summary.upper)+' điểm';
    const worst=fmt.format(summary.lower)+' điểm';
    const breaks=summary.flatZero?'có vùng P&L bằng 0':summary.roots.length?summary.roots.map(x=>fmt.format(x)).join(' / ')+' điểm':'không có';
    status.textContent=(premiumInput.value===''?'Phí ròng theo mô hình ':'Phí ròng tự nhập ')+fmt.format(premium)+
      ' điểm (dương: trả, âm: thu). Đáo hạn · P&L thấp nhất '+worst+' · cao nhất '+best+' · hòa vốn '+breaks+'.';
    el('play-legs').innerHTML='<table><thead><tr><th scope="col">Chân</th><th scope="col">Strike</th><th scope="col">Giá mô hình (điểm)</th></tr></thead><tbody>'+
      legs.map(([k,put,n])=>'<tr><td>'+(n>0?'Mua ':'Bán ')+Math.abs(n)+' '+(put?'Put':'Call')+'</td><td>'+fmt.format(k)+'</td><td>'+fmt.format(price(spot,k,vol,days/365,future,put,rate,yieldRate))+'</td></tr>').join('')+'</tbody></table>';
    const anchors=[spot,...legs.map(([k])=>k),...summary.roots];
    const lo=Math.max(.01,Math.min(...anchors)*.9), hi=Math.max(...anchors)*1.1;
    const x=[...new Set([...Array.from({length:91},(_,i)=>lo+(hi-lo)*i/90),...anchors])].sort((a,b)=>a-b);
    const axis={gridcolor:'#2c4141',zerolinecolor:'#45615f',automargin:true};
    const trace=(name,color,dash,y)=>({type:'scatter',mode:'lines',name,x,y,line:{color,dash,width:2.5}});
    Plotly.react(chart,[trace('Ngày đánh giá','#ffad75','solid',x.map(outcome)),trace('Đáo hạn','#5ce2d4','dot',x.map(payoff))],{
      margin:{l:55,r:12,t:14,b:44},paper_bgcolor:'transparent',plot_bgcolor:'transparent',
      showlegend:false,font:{color:'#b7c7c3'},xaxis:{...axis,title:future?'Giá futures (điểm)':'Chỉ số cơ sở (điểm)'},
      yaxis:{...axis,title:'P&L (điểm)'},hovermode:'x unified'
    },{responsive:true,displayModeBar:false});
  }
  let frame;
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(renderPlay);};
  lab.addEventListener('input',schedule);
  new MutationObserver(schedule).observe(lab,{attributes:true,attributeFilter:['hidden']});
  schedule();
  if(location.hash==='#option-playbooks'&&!lab.hidden) requestAnimationFrame(()=>panel.scrollIntoView());
})();
