function normal(x) {
  const a = Math.abs(x);
  const t = 1 / (1 + 0.2316419 * a);
  const p = Math.exp(-a * a / 2) / Math.sqrt(2 * Math.PI) * t *
    (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}

function blackPrice(forward, strike, totalVol, discount, put) {
  if (strike <= 0 || totalVol < 1e-8) {
    return discount * Math.max(0, put ? strike - forward : forward - strike);
  }
  const d1 = Math.log(forward / strike) / totalVol + totalVol / 2;
  const d2 = d1 - totalVol;
  const premium = put
    ? strike * normal(-d2) - forward * normal(-d1)
    : forward * normal(d1) - strike * normal(d2);
  return discount * Math.max(0, premium);
}

function price(spot, strike, vol, years, future, put, rate, yieldRate) {
  const forward = future ? spot : spot * Math.exp((rate - yieldRate) * years);
  return blackPrice(forward, strike, vol * Math.sqrt(years), Math.exp(-rate * years), put);
}

function warrantPrice(spot, strike, vol, years, rate, yieldRate, ratio, fixings) {
  // Condition on known fixings. Approximate the remaining contribution to the
  // five-day average by matching its first two moments under risk-neutral GBM.
  let fixedSum = 0;
  const remaining = [];
  for (const fixing of fixings) {
    if (fixing.time === 0) fixedSum += fixing.close;
    else remaining.push({time: fixing.time, forward: spot * Math.exp((rate - yieldRate) * fixing.time) / fixings.length});
  }
  const adjustedStrike = strike - fixedSum / fixings.length;
  const discount = Math.exp(-rate * years);
  if (!remaining.length) return discount * Math.max(0, -adjustedStrike) / ratio;

  const mean = remaining.reduce((sum, item) => sum + item.forward, 0);
  let variance = 0;
  for (const a of remaining) {
    for (const b of remaining) {
      variance += a.forward * b.forward * Math.expm1(vol * vol * Math.min(a.time, b.time));
    }
  }
  const totalVol = Math.sqrt(Math.log1p(variance / (mean * mean)));
  return blackPrice(mean, adjustedStrike, totalVol, discount, false) / ratio;
}

function simulateWarrant(spot, strike, vol, years, rate, yieldRate, ratio, fixings, pairs = 10000) {
  const fixed = fixings.filter(x => x.time === 0).reduce((sum, x) => sum + x.close, 0);
  const times = fixings.filter(x => x.time > 0).map(x => x.time).sort((a,b) => a-b);
  const discount = Math.exp(-rate * years) / ratio;
  const payoff = sum => discount * Math.max(0, sum / fixings.length - strike);
  if (!times.length) return {mean:payoff(fixed), stderr:0};

  // Fixed seed for replay. Estimate uncertainty from independent pair means.
  let seed = 10007;
  function uniform() {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return (seed + 0.5) / 4294967296;
  }
  const steps = times.map((time, i) => {
    const dt = time - (times[i-1] ?? 0);
    return {drift:(rate-yieldRate-.5*vol*vol)*dt, scale:vol*Math.sqrt(dt)};
  });
  let mean = 0, squaredDeviation = 0;
  for (let i = 1; i <= pairs; i++) {
    let high = spot, low = spot, sumHigh = fixed, sumLow = fixed;
    for (const {drift, scale} of steps) {
      const shock = scale * Math.sqrt(-2*Math.log(uniform())) * Math.cos(2*Math.PI*uniform());
      high *= Math.exp(drift + shock);
      low *= Math.exp(drift - shock);
      sumHigh += high;
      sumLow += low;
    }
    const result = (payoff(sumHigh) + payoff(sumLow)) / 2;
    const delta = result - mean;
    mean += delta / i;
    squaredDeviation += delta * (result - mean);
  }
  return {mean, stderr:Math.sqrt(squaredDeviation / (pairs-1) / pairs)};
}

// Sensitivities are per calendar day or one percentage point, in premium points.
function vanillaRisk(underlying, strike, vol, years, rate, dividend, future, put) {
  const discount = Math.exp(-rate*years);
  const forward = future ? underlying : underlying*Math.exp((rate-dividend)*years);
  const scale = future ? discount : Math.exp(-dividend*years);
  const root = Math.sqrt(years);
  const d1 = Math.log(forward/strike)/(vol*root) + vol*root/2;
  const d2 = d1-vol*root;
  const density = Math.exp(-d1*d1/2)/Math.sqrt(2*Math.PI);
  const sign = put ? -1 : 1;
  const premium = blackPrice(forward,strike,vol*root,discount,put);
  const thetaCarry = future ? rate*premium :
    sign*(dividend*underlying*scale*normal(sign*d1)-rate*strike*discount*normal(sign*d2));
  return {
    theta:(thetaCarry-underlying*scale*density*vol/(2*root))/365,
    rho:(future ? -years*premium : sign*years*strike*discount*normal(sign*d2))/100,
    vanna:-scale*density*d2/(vol*100),
    vomma:underlying*scale*density*root*d1*d2/(vol*10000)
  };
}
