function calculatePortfolioHedge({value,beta,target,stress,price,fee,slip}, multiplier) {
  const inputs = [value,beta,target,stress,price,fee,slip,multiplier];
  if (!inputs.every(Number.isFinite) || value <= 0 || price <= 0 || multiplier <= 0 ||
      target < 0 || target > 100 || stress < -100 || fee < 0 || slip < 0) return null;
  const notional = price*multiplier;
  const theoreticalLots = (-beta*value/notional)*(target/100);
  const rounded = Math.round(Math.abs(theoreticalLots));
  if (!Number.isSafeInteger(rounded)) return null;
  const lots = rounded ? Math.sign(theoreticalLots)*rounded : 0;
  const move = stress/100;
  const before = value*beta*move;
  const futures = lots*notional*move;
  const costs = Math.abs(lots)*(fee+2*slip*multiplier);
  const after = before+futures-costs;
  const residual = beta+lots*notional/value;
  return [before,futures,costs,after,residual].every(Number.isFinite) ? {lots,before,futures,costs,after,residual} : null;
}

const portfolioHedge = (() => {
  const fields = {
    value:'portfolio-value', beta:'portfolio-beta', target:'portfolio-target',
    stress:'portfolio-stress', fee:'ticket-fee', slip:'ticket-slip'
  };
  let active;
  function render() {
    if (!active) return;
    const latest = active.rows.at(-1);
    const inputs = Object.entries(fields).map(([key,id]) => [key,el(id)]);
    const values = Object.fromEntries(inputs.map(([key,input]) => [key,input.valueAsNumber]));
    const costValid = ['fee','slip'].every(key => el(fields[key]).checkValidity() && Number.isFinite(values[key]));
    el('portfolio-cost-assumption').textContent = costValid
      ? 'Chi phí từ Kịch bản vị thế · Phí '+number(values.fee,0)+' ₫/HĐ hai chiều · Trượt '+values.slip.toLocaleString('vi-VN',{maximumFractionDigits:10})+' điểm mỗi chiều.'
      : 'Kiểm tra phí và trượt giá trong Kịch bản vị thế.';
    const result = inputs.every(([,input]) => input.checkValidity()) ?
      calculatePortfolioHedge({...values,price:latest.close},vn30Multiplier) : null;
    const lotSide = result?.lots < 0 ? 'Short' : 'Long';
    el('portfolio-lots').textContent = result ?
      (result.lots ? lotSide+' '+number(Math.abs(result.lots),0)+' HĐ' : '0 HĐ') : 'Kiểm tra đầu vào';
    for (const [id,key] of [['before','before'],['futures-pnl','futures'],['cost','costs'],['after','after']]) {
      el('portfolio-'+id).textContent = result ? number(Math.round(result[key]),0)+' ₫' : '—';
    }
    el('portfolio-residual').textContent = result ? number(result.residual,2) : '—';
  }

  function setContext(quote) {
    const latest = quote.rows.at(-1);
    active = quote;
    const price = latest.close.toLocaleString('vi-VN',{maximumFractionDigits:10});
    el('portfolio-context').textContent = quote.code+' · '+price+' điểm · '+quoteBook.time(latest.time)+' ICT · '+quote.sourceName;
    render();
  }

  for (const id of Object.values(fields)) el(id).addEventListener('input',render);
  return {setContext};
})();
