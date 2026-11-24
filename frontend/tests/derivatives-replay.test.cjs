const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const engine = readFileSync(resolve(__dirname, '../private/derivatives/strategy-engine.js'), 'utf8');
const market = readFileSync(resolve(__dirname, '../private/derivatives/market-session.js'), 'utf8');
const cadence = 60_000;

function replay(closes, side, trailingStop, minutes = closes.map((_, index) => index)) {
  const start = Date.parse('2026-11-20T13:00:00+07:00');
  const rows = closes.map((close, index) => ({ close, time: start + minutes[index] * cadence }));
  const context = vm.createContext({ rows, side, cadence, trailingStop });
  vm.runInContext(market, context);
  vm.runInContext(engine, context);
  return vm.runInContext(`
    strategyState = (_, i) => ({ side: i === 0 ? side : 0, cadence });
    replayStrategy(rows, 'ou', { hold: 20, stop: 5, fee: 0, slip: 0.2, trailingStop }).trades[0]
  `, context);
}

test('trailing stop uses the best close after entry and fills on the next bar in both directions', () => {
  const long = replay([125, 100, 107, 105, 102, 101, 103], 1, true);
  const short = replay([75, 100, 93, 95, 98, 99, 97], -1, true);
  for (const trade of [long, short]) {
    assert.equal(trade.reason, 'Vượt ngưỡng dừng bám giá');
    assert.equal(trade.time - trade.entryTime, 4 * cadence);
    assert.equal(trade.pnl, 60_000);
  }
});

test('disabled trailing stop leaves fixed stop and data-boundary exits intact', () => {
  const off = replay([125, 100, 107, 105, 102, 101, 103], 1, undefined);
  assert.equal(off.reason, 'Mốc chốt dữ liệu');
  for (const enabled of [false, true]) {
    const fixed = replay([100, 100, 98, 95, 93, 92], 1, enabled);
    assert.equal(fixed.reason, 'Vượt ngưỡng dừng');
    assert.equal(fixed.time - fixed.entryTime, 3 * cadence);
  }
});

test('timestamp gap still forces exit on the first available bar', () => {
  const gap = replay([100, 100, 107, 102, 97, 96], 1, true, [0, 1, 2, 3, 5, 6]);
  assert.equal(gap.reason, 'Nến đầu sau gián đoạn');
  assert.equal(gap.time - gap.entryTime, 4 * cadence);
  assert.equal(gap.exit, 96.8);
});

function strategyFixture(readings) {
  const start = Date.parse('2026-11-20T13:00:00+07:00');
  const rows = readings.map(([close, spot], index) => ({close, spot, time:start+index*cadence}));
  const context = vm.createContext({ rows, cadence, config:{window:20, hold:2, stop:5, fee:30_000, slip:0.2} });
  vm.runInContext(market, context);
  vm.runInContext(engine, context);
  return context;
}

test('confirmed breakout excludes the signal bar from the range and requires VN30 confirmation and room after fees', () => {
  const past = Array.from({length:19}, (_, i) => [1800+[-2,0,2,0][i%4],1800]);
  const context = strategyFixture([...past,[1803,1803]]);
  const long = vm.runInContext("strategyState(rows,19,'confirmedBreakout',config)", context);
  assert.equal(long.side,1);
  assert.equal(long.target,1806);
  assert.equal(long.net,2.3);
  const short = vm.runInContext(`
    strategyState(rows.map(row=>({...row,close:3600-row.close,spot:3600-row.spot})),19,'confirmedBreakout',config)
  `,context);
  assert.equal(short.side,-1);
  assert.equal(short.target,1794);
  assert.equal(vm.runInContext("strategyState(rows,19,'confirmedBreakout',{...config,fee:260_000}).side",context),0);
  const unconfirmed = strategyFixture([...past,[1803,1800]]);
  assert.equal(vm.runInContext("strategyState(rows,19,'confirmedBreakout',config).side",unconfirmed),0);
});

test('basis reentry requires narrowing and a quiet index that updates', () => {
  const past = Array.from({length:19}, (_, i) => {
    const spot = 1800+(i%3)*.1;
    return [spot+(i===18 ? 5 : 2), spot];
  });
  const context = strategyFixture([...past,[1804.1,1800.1]]);
  const short = vm.runInContext("strategyState(rows,19,'basisReentry',config)",context);
  assert.equal(short.side,-1);
  assert.ok(Math.abs(short.target-1803.1)<1e-9);
  assert.equal(vm.runInContext(`
    strategyState(rows.map(row=>({...row,close:3604-row.close,spot:3600-row.spot})),19,'basisReentry',config).side
  `,context),1);
  for(const [close,spot] of [[1806.1,1800.1],[1805,1801]]) {
    const unqualified = strategyFixture([...past,[close,spot]]);
    assert.equal(vm.runInContext("strategyState(rows,19,'basisReentry',config).side",unqualified),0);
  }
  const stale = strategyFixture([...past.map(([close,spot])=>[1800+close-spot,1800]),[1804,1800]]);
  assert.equal(vm.runInContext("strategyState(rows,19,'basisReentry',config).side",stale),0);
});

test('QuanTik breakout uses a past signal, persists its reference target and fills at next close', () => {
  const past = Array.from({length:19}, (_, i) => [1800+[-2,0,2,0][i%4],1800]);
  const context = strategyFixture([...past,[1803,1803],[1803.5,1803.2],[1804,1803.5],[1805.5,1804]]);
  const trade = vm.runInContext("replayStrategy(rows,'confirmedBreakout',config,19).trades[0]", context);
  assert.equal(trade.entryTime-trade.signalTime,cadence);
  assert.equal(trade.signalTarget,1806);
  assert.equal(trade.entry,1803.7);
  assert.equal(trade.exit,1805.3);
  assert.equal(trade.pnl,130_000);
  assert.equal(vm.runInContext(`
    const gapped=rows.map((row,index)=>index<20 ? row : {...row,time:row.time+cadence});
    replayStrategy(gapped,'confirmedBreakout',config,19).trades.length
  `,context),0);
});

test('asymmetric volatility trade has different payoff caps and two breakevens', () => {
  const plays = readFileSync(resolve(__dirname, '../private/derivatives/option-plays.js'), 'utf8');
  const context = vm.createContext({});
  vm.runInContext(plays.split('\n(() => {')[0], context);
  const result = vm.runInContext(`
    const legs = optionPlaybooks.asymmetric.legs.map(([offset,put,quantity])=>[1800+35*offset,put,quantity]);
    expiryProfile(legs,20)
  `,context);
  assert.equal(result.lower,-20);
  assert.equal(result.upper,50);
  assert.deepEqual([...result.roots],[1780,1820]);
  assert.equal(vm.runInContext('optionPayoff(legs,1700)-20',context),15);
});

test('Kalman basis projects a decaying shock without consuming future data', () => {
  const past = Array.from({length:19}, () => [1802,1800]);
  const context = strategyFixture([...past,[1810,1800],[1790,1800]]);
  const run = expression => vm.runInContext(expression,context);
  const result = run("strategyState(rows,19,'kalman',{...config,fee:0,slip:0})");
  assert.equal(result.side,-1);
  assert.ok(result.points[1]>1802 && result.points[1]<1810);
  assert.ok(result.points.at(-1)<result.points[1]);
  assert.ok(Number.isFinite(result.rmse));
  assert.deepEqual(run("strategyState(rows.slice(0,20),19,'kalman',{...config,fee:0,slip:0})"),result);
  assert.equal(run("strategyState(rows,19,'kalman',{...config,fee:900_000}).side"),0);
  assert.equal(run("strategyState(rows,18,'kalman',config).error.includes('20 nến')"),true);
});

test('Merton prices converge to BSM without jumps and agree with a reference value', () => {
  const script = readFileSync(resolve(__dirname,'../private/derivatives/option-pricing.js'),'utf8');
  const context = vm.createContext({});
  vm.runInContext(script,context);
  const inputs = {spot:1822.3,strike:1820,vol:.22,years:90/365,rate:.04,yieldRate:.01,put:false,
    intensity:2,jumpMean:-.05,jumpVol:.08};
  const bsm = context.price(inputs.spot,inputs.strike,inputs.vol,inputs.years,false,false,inputs.rate,inputs.yieldRate);
  assert.equal(context.mertonPrice({...inputs,intensity:0}),bsm);
  assert.ok(Math.abs(context.mertonPrice({...inputs,jumpMean:0,jumpVol:0})-bsm)<1e-8);
  // Independent Gaussian CDF via erfc and Poisson sum at the default scenario.
  assert.ok(Math.abs(context.mertonPrice(inputs)-98.55903763160524)<0.001);
  const extreme = {...inputs,years:1,intensity:20,jumpMean:.5,jumpVol:.5};
  const call = context.mertonPrice(extreme);
  const put = context.mertonPrice({...extreme,put:true});
  const parity = extreme.spot*Math.exp(-extreme.yieldRate)-extreme.strike*Math.exp(-extreme.rate);
  assert.ok(Math.abs(call-put-parity)<1e-8);
});
