// Cumulative standard normal, West (2005) double-precision Hart algorithm (|error| < 1e-14).
function normal(x) {
  const a = Math.abs(x);
  let c;
  if (a > 37) c = 0;
  else {
    const e = Math.exp(-a * a / 2);
    if (a < 7.07106781186547) {
      let b = 3.52624965998911e-02 * a + 0.700383064443688;
      b = b * a + 6.37396220353165; b = b * a + 33.912866078383; b = b * a + 112.079291497871;
      b = b * a + 221.213596169931; b = b * a + 220.206867912376;
      c = e * b;
      b = 8.83883476483184e-02 * a + 1.75566716318264;
      b = b * a + 16.064177579207; b = b * a + 86.7807322029461; b = b * a + 296.564248779674;
      b = b * a + 637.333633378831; b = b * a + 793.826512519948; b = b * a + 440.413735824752;
      c /= b;
    } else {
      let b = a + 0.65; b = a + 4 / b; b = a + 3 / b; b = a + 2 / b; b = a + 1 / b;
      c = e / b / 2.506628274631;
    }
  }
  return x > 0 ? 1 - c : c;
}

// Implied volatility by bracketed bisection on a price that increases with volatility.
// Returns null when the target lies outside the no-arbitrage range of the model.
function solveVolatility(priceAt, target, low = 1e-4, high = 5) {
  if (!(target > 0) || !Number.isFinite(target)) return null;
  let lo = low, hi = high, flo = priceAt(lo) - target, fhi = priceAt(hi) - target;
  if (!(flo <= 0 && fhi >= 0)) return null;
  for (let i = 0; i < 100 && hi - lo > 1e-7; i++) {
    const mid = (lo + hi) / 2, f = priceAt(mid) - target;
    if (f > 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
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

function mertonPrice({spot, strike, vol, years, rate, yieldRate, put, intensity, jumpMean, jumpVol}) {
  // Under risk-neutral dynamics, compensate for the average multiplicative jump.
  const meanCount = intensity*years;
  const logExpectedJump = jumpMean+jumpVol**2/2;
  const forward = spot*Math.exp((rate-yieldRate)*years);
  const discount = Math.exp(-rate*years);
  if (meanCount===0) return blackPrice(forward,strike,vol*Math.sqrt(years),discount,put);

  const adjustedForward = forward*Math.exp(-meanCount*Math.expm1(logExpectedJump));
  // Also track the asset-weighted Poisson tail for large positive jumps.
  // Checking just the count probability can miss significant value in that tail.
  const tiltedCount = meanCount*Math.exp(logExpectedJump);
  let weight = Math.exp(-meanCount), tiltedWeight = Math.exp(-tiltedCount);
  let paid = 0, countMass = 0, tiltedMass = 0;
  for (let jumps=0; jumps<256; jumps++) {
    const conditionalForward = adjustedForward*Math.exp(jumps*logExpectedJump);
    const totalVol = Math.sqrt(vol**2*years+jumps*jumpVol**2);
    paid += weight*blackPrice(conditionalForward,strike,totalVol,discount,put);
    countMass += weight;
    tiltedMass += tiltedWeight;
    if (countMass>=1-1e-13 && tiltedMass>=1-1e-13) return paid;
    weight *= meanCount/(jumps+1);
    tiltedWeight *= tiltedCount/(jumps+1);
  }
  return NaN;
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
