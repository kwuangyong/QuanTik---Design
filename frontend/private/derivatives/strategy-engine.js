function parseStrategyCsv(text) {
  const lines = text.replace(/^\ufeff/, '').trim().split(/\r?\n/);
  if (lines.length < 23 || lines.length > 20001) throw new Error('Cần từ 22 đến 20.000 dòng dữ liệu.');
  const columns = lines.shift().split(',').map(value => value.trim());
  if (columns.join(',') !== 'symbol,timestamp,futures_close,vn30_close') {
    throw new Error('Cột phải theo thứ tự symbol,timestamp,futures_close,vn30_close.');
  }
  const tradingCode = /^(?:VN30F\d{2}(?:0[1-9]|1[0-2])|41I1[A-Z0-9][1-9ABC][A-Z0-9]{3}|VN41I1[A-Z0-9][1-9ABC][A-Z0-9]{3}\d)$/;
  const timestamp = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:[0-5]\d)$/;
  const decimal = /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
  let symbol, previous = -Infinity;
  const rows = lines.map((line, index) => {
    const [code, stamp, closeText, spotText, ...extra] = line.split(',').map(value => value.trim());
    const time = Date.parse(stamp);
    const close = Number(closeText), spot = Number(spotText);
    if (/^(?:VN30)?F[12][MQ]$/.test(code)) {
      throw new Error('Dòng ' + (index + 2) + ' dùng bí danh kỳ hạn. Hãy nhập mã của một hợp đồng cụ thể.');
    }
    if (!tradingCode.test(code)) {
      throw new Error('Dòng ' + (index+2) + ' cần mã hợp đồng VN30 cụ thể, ví dụ 41I1GC000 hoặc VN30F2505.');
    }
    if (symbol && symbol !== code) throw new Error('Dòng ' + (index+2) + ' đổi mã. Mỗi tệp chỉ chứa một hợp đồng.');
    if (!timestamp.test(stamp || '') || !Number.isFinite(time) || time <= previous ||
        new Date(stamp.slice(0,10)+'T00:00:00Z').toISOString().slice(0,10) !== stamp.slice(0,10)) {
      throw new Error('Dòng ' + (index+2) + ' cần thời điểm có múi giờ, theo thứ tự tăng và không trùng.');
    }
    if (extra.length || !decimal.test(closeText) || !decimal.test(spotText) || close <= 0 || spot <= 0 ||
        !Number.isSafeInteger(Math.round(close*vn30Multiplier)) || !Number.isSafeInteger(Math.round(spot*vn30Multiplier))) {
      throw new Error('Dòng ' + (index+2) + ' cần hai giá đóng cửa dương tính bằng điểm.');
    }
    symbol = code;
    previous = time;
    return {time, close, spot};
  });
  return {symbol, rows};
}

const futuresMethods = {
  ou: {
    name:'Ornstein–Uhlenbeck · Basis',
    rule:'Ước lượng mức cân bằng và tốc độ hồi quy của basis. Dự phóng giá futures theo basis, với VN30 giả định giữ nguyên. Chỉ xét tín hiệu khi hệ số tự hồi quy nằm trong (0, 1).',
    formula:'B(t+1) = a + φ × B(t) + ε, với B = F − S.'
  },
  ecm: {
    name:'Hiệu chỉnh sai số · Futures/VN30',
    rule:'Ước lượng riêng biến động futures và VN30 theo basis cùng hai biến động trễ. Mô phỏng đồng thời hai chuỗi để thấy phần chênh có xu hướng khép lại hay không.',
    formula:'ΔF(t+1), ΔS(t+1) = hằng số + hệ số × [F(t) − S(t), ΔF(t), ΔS(t)].'
  },
  ar: {
    name:'Tự hồi quy AR(1) · Biến động futures',
    rule:'Ước lượng mức độ tiếp diễn hoặc đảo chiều của biến động từng nến từ dữ liệu futures. Hệ số |φ| ≥ 1 khiến mô hình không đủ điều kiện.',
    formula:'ΔF(t+1) = a + φ × ΔF(t) + ε.'
  }
};

function dot(a,b) {
  return a.reduce((sum,value,i)=>sum+value*b[i],0);
}

function linearFit(features, response) {
  // Modified Gram-Schmidt with relative rank checks. Features contain no intercept.
  const n=response.length, p=features[0].length;
  if (n<=p+2) return null;
  const mean=response.reduce((sum,y)=>sum+y,0)/n;
  const means=features[0].map((_,j)=>features.reduce((sum,row)=>sum+row[j],0)/n);
  const columns=means.map((center,j)=>features.map(row=>row[j]-center));
  const q=[];
  const r=Array.from({length:p},()=>Array(p).fill(0));
  for(let j=0;j<p;j++) {
    const v=columns[j].slice(), norm=Math.sqrt(dot(v,v));
    for(let k=0;k<j;k++) {
      r[k][j]=dot(q[k],v);
      for(let i=0;i<n;i++) v[i]-=r[k][j]*q[k][i];
    }
    r[j][j]=Math.sqrt(dot(v,v));
    if(r[j][j]<=Math.max(1e-9,norm*1e-6)) return null;
    q.push(v.map(x=>x/r[j][j]));
  }
  const target=response.map(y=>y-mean);
  const beta=Array(p).fill(0);
  for(let j=p-1;j>=0;j--) beta[j]=(dot(q[j],target)-dot(r[j],beta))/r[j][j];
  const intercept=mean-dot(beta,means);
  const predict=x=>intercept+dot(beta,x);
  const rmse=Math.sqrt(features.reduce((sum,x,i)=>sum+(response[i]-predict(x))**2,0)/(n-p-1));
  return {intercept,beta,rmse,predict};
}

function stableEcm(futures,spot) {
  // State is [basis, change in futures, change in spot]. The roots of its
  // characteristic polynomial must lie inside the unit circle (Schur test).
  const [a,b,c]=futures.map((value,i)=>value-spot[i]+(i===0?1:0));
  const [d,e,f]=futures, [g,h,i]=spot;
  const trace=a+e+i;
  const minors=a*e-b*d+a*i-c*g+e*i-f*h;
  const determinant=a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g);
  let coefficients=[1,-trace,minors,-determinant];
  while(coefficients.length>1) {
    const ratio=coefficients.at(-1)/coefficients[0];
    if(!Number.isFinite(ratio)||Math.abs(ratio)>=1-1e-8) return false;
    const degree=coefficients.length-1;
    coefficients=coefficients.slice(0,-1).map((value,j)=>value-ratio*coefficients[degree-j]);
  }
  return true;
}

function fittedForecast(bars, method, horizon) {
  const latest=bars.at(-1);
  const basis=bar=>bar.close-bar.spot;
  const futureDiff=bars.slice(1).map((bar,i)=>bar.close-bars[i].close);
  const spotDiff=bars.slice(1).map((bar,i)=>bar.spot-bars[i].spot);
  const points=[latest.close];
  let diagnostic, rmse;
  if(method==='ou') {
    const fit=linearFit(bars.slice(0,-1).map(bar=>[basis(bar)]),bars.slice(1).map(basis));
    const phi=fit?.beta[0];
    if(!(phi>0&&phi<1)) return {error:'Không đủ căn cứ hồi quy OU trong cửa sổ hiện tại (cần 0 < φ < 1).'};
    const equilibrium=fit.intercept/(1-phi);
    const halfLife=Math.log(.5)/Math.log(phi);
    if(halfLife>bars.length) return {error:'Bán rã ước lượng dài hơn cửa sổ dữ liệu.'};
    let spread=basis(latest);
    for(let i=0;i<=horizon;i++) {spread=fit.predict([spread]);points.push(latest.spot+spread);}
    diagnostic='Basis cân bằng '+equilibrium.toFixed(2)+' điểm · φ '+phi.toFixed(3)+' · bán rã '+halfLife.toFixed(1)+' nến.';
    rmse=fit.rmse;
  } else if(method==='ar') {
    const fit=linearFit(futureDiff.slice(0,-1).map(x=>[x]),futureDiff.slice(1));
    const phi=fit?.beta[0];
    if(!(Math.abs(phi)<1)) return {error:'AR(1) thiếu biến thiên hoặc hệ số không ổn định (cần |φ| < 1).'};
    let change=futureDiff.at(-1);
    for(let i=0;i<=horizon;i++) {change=fit.predict([change]);points.push(points.at(-1)+change);}
    diagnostic='φ '+phi.toFixed(3)+' · biến động cân bằng '+(fit.intercept/(1-phi)).toFixed(3)+' điểm/nến.';
    rmse=fit.rmse;
  } else {
    const features=futureDiff.slice(0,-1).map((change,i)=>[basis(bars[i+1]),change,spotDiff[i]]);
    const futuresFit=linearFit(features,futureDiff.slice(1));
    const spotFit=linearFit(features,spotDiff.slice(1));
    if(!futuresFit||!spotFit) return {error:'Thiếu biến thiên độc lập để ước lượng hai phương trình.'};
    const correction=futuresFit.beta[0]-spotFit.beta[0];
    if(!(correction<0)||!stableEcm(futuresFit.beta,spotFit.beta)) {
      return {error:'Quan hệ hiệu chỉnh basis chưa ổn định trong cửa sổ hiện tại.'};
    }
    let f=latest.close,s=latest.spot,df=futureDiff.at(-1),ds=spotDiff.at(-1);
    for(let i=0;i<=horizon;i++) {
      const current=[f-s,df,ds];
      df=futuresFit.predict(current);ds=spotFit.predict(current);
      f+=df;s+=ds;points.push(f);
    }
    diagnostic='Hệ số basis · Futures '+futuresFit.beta[0].toFixed(3)+' · VN30 '+spotFit.beta[0].toFixed(3)+'. Hệ số cân bằng cố định 1:1.';
    rmse=futuresFit.rmse;
  }
  if(points.some(point=>!Number.isFinite(point)||point<=0)) return {error:'Quỹ đạo dự phóng không hợp lệ.'};
  return {points,diagnostic,rmse};
}

function strategyState(rows,cursor,method,config) {
  const {window,hold,fee,slip}=config;
  if(!rows[cursor]||cursor<window-1) return {error:'Cần '+window+' nến liên tiếp cùng ngày để ước lượng.'};
  const bars=rows.slice(cursor-window+1,cursor+1);
  const latest=bars.at(-1), cadence=latest.time-bars.at(-2).time;
  if(bars.some((bar,i)=>simulationDay(bar.time)!==simulationDay(latest.time)||
    (i && bar.time-bars[i-1].time!==cadence))) return {error:'Cửa sổ có khoảng trống hoặc đổi phiên. Cần '+window+' nến cách đều.'};
  const forecast=fittedForecast(bars,method,hold);
  if(forecast.error) return forecast;
  const expected=forecast.points.at(-1)-forecast.points[1];
  const cost=fee/vn30Multiplier+2*slip;
  const side=Math.abs(expected)>cost?Math.sign(expected):0;
  return {...forecast,cadence,expected,cost,side,net:Math.abs(expected)-cost,latest,n:bars.length};
}

function replayStrategy(rows,method,config,firstSignal=0) {
  const {hold,stop,fee,slip}=config;
  let position=null,pending=null,pendingExit='',net=0,wins=0,peak=0,drawdown=0,forced=0,eligible=0;
  const equity=[],trades=[];
  function close(row,reason) {
    const fill=row.close-position.side*slip;
    const gross=Math.round((row.close-position.entryQuote)*position.side*vn30Multiplier);
    const slippageCost=2*slip*vn30Multiplier;
    const pnl=gross-slippageCost-fee;
    net+=pnl;
    if(pnl>0) wins++;
    if(reason==='Mốc chốt dữ liệu'||reason==='Nến đầu sau gián đoạn') forced++;
    trades.push({signalTime:position.signalTime,entryTime:position.entryTime,time:row.time,side:position.side,
      entry:position.fill,exit:fill,gross,fee,slippageCost,pnl,reason});
    position=null;
  }
  for(let i=firstSignal;i<rows.length;i++) {
    const row=rows[i],previous=rows[i-1];
    const step=previous?row.time-previous.time:0;
    const sameDay=previous&&simulationDay(previous.time)===simulationDay(row.time);
    const end=i===rows.length-1;
    // A missing bar is first observable on arrival of the next timestamp.
    // Do not use tomorrow's data to liquidate at yesterday's price.
    if(position&&(!sameDay||step!==position.cadence)) close(row,'Nến đầu sau gián đoạn');
    else if(pendingExit&&position) close(row,pendingExit);
    if(!end&&sameDay&&pending&&step===pending.cadence) {
      position={...pending,fill:row.close+pending.side*slip,entryQuote:row.close,entryTime:row.time,index:i};
    }
    pending=null;pendingExit='';
    if(!position&&!end) {
      const state=strategyState(rows,i,method,config);
      if(!state.error) {
        eligible++;
        if(state.side) pending={side:state.side,cadence:state.cadence,signalTime:row.time};
      }
    } else if(position) {
      if(end) close(row,'Mốc chốt dữ liệu');
      else if ((row.close-position.fill)*position.side<=-stop) pendingExit='Vượt ngưỡng dừng';
      else if (i-position.index>=hold-1) pendingExit='Hết thời gian giữ';
    }
    const marked=position?net+Math.round((row.close-position.entryQuote)*position.side*vn30Multiplier)
      -2*slip*vn30Multiplier-fee:net;
    peak=Math.max(peak,marked);
    drawdown=Math.max(drawdown,peak-marked);
    equity.push(marked);
  }
  return {net,wins,drawdown,trades,equity,forced,eligible};
}

function strategySize(budget, stopPoints, fee, slippage, marginPerContract, availableMargin) {
  const loss = (stopPoints + 2 * slippage) * vn30Multiplier + fee;
  const riskLimit = Math.floor(budget / loss);
  const marginLimit = marginPerContract > 0 ? Math.floor(availableMargin / marginPerContract) : null;
  const count = marginLimit === null ? riskLimit : Math.min(riskLimit, marginLimit);
  return {loss, count, marginLimit};
}

function hedgeContracts(signedCount, optionMultiplier, delta, futuresDelta) {
  const exposure = signedCount * optionMultiplier * delta;
  const futures = Math.round(-exposure / (vn30Multiplier * futuresDelta)) || 0;
  return {exposure, futures, residual: exposure + futures * vn30Multiplier * futuresDelta};
}
