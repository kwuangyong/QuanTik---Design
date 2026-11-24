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
