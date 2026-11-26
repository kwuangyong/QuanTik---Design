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
  },
  kalman: {
    name:'Kalman Basis Filter · State Space',
    rule:'Tách basis tiềm ẩn khỏi nhiễu quan sát. Trạng thái hồi về trung vị của cửa sổ trước tín hiệu với bán rã giả định 5 nến. Chỉ số VN30 được giữ cố định khi quy đổi đường dự phóng sang futures.',
    formula:'Xₜ = m + φ(Xₜ₋₁ − m) + wₜ; Bₜ = Xₜ + vₜ. φ = 2^(−1/5). R là phương sai nhiễu giả định từ MAD của ΔB, Q = R/4. Kₜ = Pₜ⁻/(Pₜ⁻ + R).'
  },
  confirmedBreakout: {
    name:'Phá biên có xác nhận · QuanTik',
    rule:'Xét giá futures đóng ngoài biên của các nến trước. Trong 3 nến gần nhất, VN30 phải cùng chiều và dịch chuyển ít nhất bằng nửa mức dịch chuyển futures. Loại tín hiệu khi khoảng cách còn lại tới mục tiêu tham chiếu không đủ bù chi phí.',
    formula:'Biên [L, U] lấy từ giá đóng trước nến tín hiệu. Long khi F > U, Δ₃F > 0 và Δ₃S ≥ max(0,1; 0,5 × Δ₃F); Short đối xứng. Mục tiêu tham chiếu cách biên bị phá một độ rộng U − L.'
  },
  orb: {
    name:'Phá biên mở cửa 15 phút · Đã kiểm định',
    rule:'Biên mở cửa là cao/thấp của 09:00–09:15. Nến đóng trên biên trên thì Long, dưới biên dưới thì Short, khớp ở nến kế tiếp; tối đa một lệnh mỗi phiên, không vào sau 14:15. Thoát khi giá đóng quay qua cạnh đối diện của biên, hoặc đóng hết lúc 14:25, không giữ qua ATC. Kiểm định ngoài mẫu trên VN30F1M 2018–2026 (nến 5 phút, sau phí và trượt 1 bước): Sharpe ≈ 1,5–1,7, t ≈ 3,8–5, tỉ lệ thắng ≈ 41%. Edge đang suy giảm (2024: Sharpe ≈ 0,5): tạm dừng khi t 250 phiên < 1 hoặc kỳ vọng < 0,3 điểm/lệnh.',
    formula:'H, L = max(high), min(low) của 09:00–09:15. Long khi Cₜ > H, Short khi Cₜ < L. Dừng khi Cₜ < L (Long) hoặc Cₜ > H (Short). P&L = (thoát − vào) × hướng × 100.000 − phí − 2 × trượt.'
  },
  basisReentry: {
    name:'Hồi basis khi VN30 đi ngang · QuanTik',
    rule:'Chờ basis lệch xa trung vị rồi bắt đầu thu hẹp. Chỉ xét khi VN30 có cập nhật giá trong 3 nến gần nhất và mức dịch chuyển ròng thấp. Nếu basis dương so với trung vị, xét Short; nếu âm, xét Long.',
    formula:'m = median(B quá khứ); z = (B − m) / max(0,1; 1,4826 × MAD). Cần |z| ≥ 2 và basis đang thu hẹp về m. VN30 đi ngang khi |Δ₃S| ≤ max(0,1; median(|Δ₃S quá khứ|)). Biên giả định là 50% × |B − m|.'
  }
};

function median(values) {
  const sorted = values.slice().sort((a,b)=>a-b);
  const middle = Math.floor(sorted.length/2);
  return sorted.length%2 ? sorted[middle] : (sorted[middle-1]+sorted[middle])/2;
}

function confirmedBreakout(bars) {
  const latest = bars.at(-1), anchor = bars.at(-4);
  const past = bars.slice(0,-1);
  const high = Math.max(...past.map(bar=>bar.close));
  const low = Math.min(...past.map(bar=>bar.close));
  const direction = latest.close>high ? 1 : latest.close<low ? -1 : 0;
  const futuresMove = direction*(latest.close-anchor.close);
  const spotMove = direction*(latest.spot-anchor.spot);
  const diagnostic = 'Biên giá đóng '+low.toFixed(2)+' – '+high.toFixed(2)+' điểm.';
  if (!direction || high===low || futuresMove<=0 || spotMove+1e-9<Math.max(.1,futuresMove/2)) {
    return {diagnostic:diagnostic+' Chưa có phá biên với VN30 xác nhận.'};
  }
  const target = direction===1 ? high+(high-low) : low-(high-low);
  if (target<=0 || direction*(target-latest.close)<=0) {
    return {diagnostic:diagnostic+' Giá đã vượt mục tiêu tham chiếu.'};
  }
  return {target,direction,diagnostic:diagnostic+' VN30 dịch chuyển cùng chiều '+spotMove.toFixed(2)+' điểm trong 3 nến.'};
}

function basisReentry(bars) {
  const basis = bar => bar.close-bar.spot;
  const past = bars.slice(0,-1);
  const spreads = past.map(basis);
  const center = median(spreads);
  const scale = Math.max(.1, 1.4826*median(spreads.map(value=>Math.abs(value-center))));
  const latest = bars.at(-1);
  const gap = basis(latest)-center;
  const previousGap = spreads.at(-1)-center;
  const z = gap/scale;
  const spotMoves = past.slice(3).map((bar,i)=>Math.abs(bar.spot-past[i].spot));
  const recent = bars.slice(-4);
  const updated = recent.some(bar=>bar.spot!==recent[0].spot);
  const quiet = Math.abs(latest.spot-recent[0].spot)<=Math.max(.1,median(spotMoves))+1e-9;
  const folding = gap*previousGap>0 && Math.abs(gap)<Math.abs(previousGap);
  const diagnostic = 'Basis trung vị '+center.toFixed(2)+' điểm · z '+z.toFixed(2)+'.';
  if (!updated || !quiet || !folding || Math.abs(z)<2-1e-9) {
    return {diagnostic:diagnostic+' Chưa có co hẹp đủ điều kiện.'};
  }
  const target = latest.close-gap/2;
  if (target<=0) return {diagnostic:diagnostic+' Mục tiêu tham chiếu ngoài miền giá.'};
  return {target,direction:-Math.sign(gap),diagnostic};
}

const relativePriceRules = {confirmedBreakout, basisReentry};

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

function kalmanBasis(bars, horizon) {
  const latest = bars.at(-1);
  const observed = bars.map(bar=>bar.close-bar.spot);
  const past = observed.slice(0,-1);
  const center = median(past);
  const changes = past.slice(1).map((value,i)=>value-past[i]);
  const typicalChange = median(changes);
  const observationVariance = Math.max(.1,1.4826*median(changes.map(value=>Math.abs(value-typicalChange))))**2;
  const processVariance = observationVariance/4;
  const phi = Math.pow(2,-1/5);

  let estimate = center, variance = observationVariance, squaredInnovation = 0, signalInnovation;
  for (const value of observed) {
    const prior = center+phi*(estimate-center);
    const priorVariance = phi*phi*variance+processVariance;
    const innovation = value-prior;
    const innovationVariance = priorVariance+observationVariance;
    const gain = priorVariance/innovationVariance;
    estimate = prior+gain*innovation;
    variance = (1-gain)*priorVariance;
    squaredInnovation += innovation**2;
    signalInnovation = innovation/Math.sqrt(innovationVariance);
  }
  const points = [latest.close];
  for (let step=1; step<=horizon+1; step++) {
    points.push(latest.spot+center+phi**step*(estimate-center));
  }
  if (points.some(point=>!Number.isFinite(point)||point<=0)) return {error:'Quỹ đạo Kalman không hợp lệ.'};
  const diagnostic = 'Basis ẩn '+estimate.toFixed(2)+' ± '+Math.sqrt(variance).toFixed(2)+
    ' điểm (1σ theo mô hình) · Mức cân bằng '+center.toFixed(2)+' · Sai lệch quan sát chuẩn hóa '+signalInnovation.toFixed(2)+'.';
  return {points,diagnostic,rmse:Math.sqrt(squaredInnovation/observed.length)};
}

function fittedForecast(bars, method, horizon) {
  if (method==='kalman') return kalmanBasis(bars,horizon);
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

const ORB_RANGE_START = 9*60, ORB_RANGE_MINUTES = 15, ORB_LAST_ENTRY = 14*60+15, ORB_FLAT = 14*60+25;
/** Minutes after midnight in Vietnam time (UTC+7, no DST). */
function ictMinutes(time) { return ((Math.floor(time/60000)+7*60)%1440+1440)%1440; }
function sessionRows(rows,cursor) {
  const day = simulationDay(rows[cursor].time);
  let start = cursor;
  while (start>0 && simulationDay(rows[start-1].time)===day) start--;
  return rows.slice(start,cursor+1);
}
function openingRange(bars) {
  const range = bars.filter(bar => { const m = ictMinutes(bar.time); return m>=ORB_RANGE_START && m<ORB_RANGE_START+ORB_RANGE_MINUTES; });
  if (!range.length) return null;
  return {high:Math.max(...range.map(bar=>bar.high ?? bar.close)), low:Math.min(...range.map(bar=>bar.low ?? bar.close))};
}
function orbState(rows,cursor,config) {
  const bars = sessionRows(rows,cursor), latest = rows[cursor], minute = ictMinutes(latest.time);
  const cadence = bars.length>1 ? latest.time-bars.at(-2).time : null;
  const range = openingRange(bars);
  const cost = config.fee/vn30Multiplier+2*config.slip;
  if (!range || minute<ORB_RANGE_START+ORB_RANGE_MINUTES) return {error:'Chờ đủ biên mở cửa 09:00–09:15 của phiên.'};
  const diagnostic = 'Biên mở cửa '+range.low.toFixed(1)+' – '+range.high.toFixed(1)+' điểm.';
  const side = minute>ORB_LAST_ENTRY ? 0 : latest.close>range.high ? 1 : latest.close<range.low ? -1 : 0;
  return {diagnostic:diagnostic+(side ? '' : ' Chưa có nến đóng ngoài biên trong giờ được vào lệnh.'),direction:side,side,cost,cadence,latest,n:bars.length,
    target:side ? latest.close+side*(range.high-range.low) : undefined,net:side ? range.high-range.low-cost : null,range};
}
/** Faithful replay of the validated opening-range rule; fills at the next bar close with slippage. */
function replayOpeningRange(rows,config,firstSignal=0) {
  const {fee,slip}=config;
  let net=0,wins=0,peak=0,drawdown=0,forced=0,eligible=0;
  const trades=[],equity=[];
  let day=null,range=null,position=null,pending=null,traded=false;
  const settle=(row,reason)=>{
    const gross=Math.round((row.close-position.entryQuote)*position.side*vn30Multiplier);
    const slippageCost=2*slip*vn30Multiplier, pnl=gross-slippageCost-fee;
    net+=pnl; if(pnl>0) wins++; if(reason==='Mốc chốt dữ liệu') forced++;
    trades.push({signalTime:position.signalTime,entryTime:position.entryTime,time:row.time,side:position.side,entry:position.fill,
      exit:row.close-position.side*slip,gross,fee,slippageCost,pnl,reason,signalTarget:null});
    position=null;
  };
  for(let i=0;i<rows.length;i++) {
    const row=rows[i], minute=ictMinutes(row.time), today=simulationDay(row.time);
    if(today!==day) {
      if(position) settle(rows[i-1],'Đóng cuối phiên');
      day=today; range=null; pending=null; traded=false;
    }
    if(i>=firstSignal) {
      if(pending && !position) { position={...pending,fill:row.close+pending.side*slip,entryQuote:row.close,entryTime:row.time}; pending=null; traded=true; }
      else if(pending==='exit' && position) { settle(row,'Đóng qua cạnh đối diện'); pending=null; }
    }
    if(minute>=ORB_RANGE_START && minute<ORB_RANGE_START+ORB_RANGE_MINUTES) {
      range=range||{high:-Infinity,low:Infinity};
      range.high=Math.max(range.high,row.high ?? row.close); range.low=Math.min(range.low,row.low ?? row.close);
    } else if(range && i>=firstSignal && minute>=ORB_RANGE_START+ORB_RANGE_MINUTES) {
      const next=rows[i+1], sameDayNext=next && simulationDay(next.time)===today;
      if(position && (minute>=ORB_FLAT || !sameDayNext)) settle(row, sameDayNext||next ? 'Đóng trước ATC' : 'Mốc chốt dữ liệu');
      else if(position && pending!=='exit' && ((position.side===1 && row.close<range.low) || (position.side===-1 && row.close>range.high))) pending='exit';
      else if(!position && !pending && !traded && minute<=ORB_LAST_ENTRY && sameDayNext) {
        eligible++;
        const side=row.close>range.high ? 1 : row.close<range.low ? -1 : 0;
        if(side) pending={side,signalTime:row.time};
      }
    }
    const marked=position?net+Math.round((row.close-position.entryQuote)*position.side*vn30Multiplier)-2*slip*vn30Multiplier-fee:net;
    peak=Math.max(peak,marked); drawdown=Math.max(drawdown,peak-marked); equity.push(marked);
  }
  if(position) settle(rows.at(-1),'Mốc chốt dữ liệu');
  return {net,wins,drawdown,trades,equity,forced,eligible};
}

function strategyState(rows,cursor,method,config) {
  if (method==='orb') return rows[cursor] ? orbState(rows,cursor,config) : {error:'Chưa có dữ liệu.'};
  const {window,hold,fee,slip}=config;
  if(!rows[cursor]||cursor<window-1) return {error:'Cần '+window+' nến liên tiếp cùng ngày để ước lượng.'};
  const bars=rows.slice(cursor-window+1,cursor+1);
  const latest=bars.at(-1), cadence=latest.time-bars.at(-2).time;
  if(bars.some((bar,i)=>simulationDay(bar.time)!==simulationDay(latest.time)||
    (i && bar.time-bars[i-1].time!==cadence))) return {error:'Cửa sổ có khoảng trống hoặc đổi phiên. Cần '+window+' nến cách đều.'};
  const cost=fee/vn30Multiplier+2*slip;
  if (Object.hasOwn(relativePriceRules,method)) {
    const setup=relativePriceRules[method](bars);
    const distance=setup.target===undefined ? null : setup.target-latest.close;
    const net=distance===null ? null : Math.abs(distance)-cost;
    return {...setup,cadence,cost,net,side:net>1e-9 ? setup.direction : 0,latest,n:bars.length};
  }
  const forecast=fittedForecast(bars,method,hold);
  if(forecast.error) return forecast;
  const expected=forecast.points.at(-1)-forecast.points[1];
  const side=Math.abs(expected)>cost?Math.sign(expected):0;
  return {...forecast,cadence,expected,cost,side,net:Math.abs(expected)-cost,latest,n:bars.length};
}

function replayStrategy(rows,method,config,firstSignal=0) {
  if (method==='orb') return replayOpeningRange(rows,config,firstSignal);
  const {hold,stop,fee,slip,trailingStop=false}=config;
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
      entry:position.fill,exit:fill,gross,fee,slippageCost,pnl,reason,signalTarget:position.signalTarget});
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
      position={...pending,fill:row.close+pending.side*slip,entryQuote:row.close,entryTime:row.time,index:i,bestMove:0};
    }
    pending=null;pendingExit='';
    if(!position&&!end) {
      const state=strategyState(rows,i,method,config);
      if(!state.error) {
        eligible++;
        if(state.side) pending={side:state.side,cadence:state.cadence,signalTime:row.time,signalTarget:state.target};
      }
    } else if(position) {
      if(end) close(row,'Mốc chốt dữ liệu');
      else {
        const move = (row.close-position.entryQuote)*position.side;
        if (trailingStop && i>position.index) position.bestMove = Math.max(position.bestMove,move);
        if ((row.close-position.fill)*position.side<=-stop) pendingExit='Vượt ngưỡng dừng';
        else if (trailingStop && position.bestMove>0 && position.bestMove-move>=stop) pendingExit='Vượt ngưỡng dừng bám giá';
        else if (i-position.index>=hold-1) pendingExit='Hết thời gian giữ';
      }
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
