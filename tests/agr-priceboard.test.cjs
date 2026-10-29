const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { buildSync } = require('esbuild');
function load(file) {
  const output = buildSync({ entryPoints: [path.join(__dirname, '../frontend/src', file)], bundle: true, platform: 'node', format: 'cjs', write: false });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', output.outputFiles[0].text)(require, module, module.exports);
  return module.exports;
}
const { AGR_TOPICS, expandAgrIndexRecord, toAgrIndices, toAgrStock, mergeAgrRecord, connectAgrPriceboard } = load('lib/agr-priceboard.ts');
const snapshot = { symbol: 'FPT', exchange: 'HOSE', FullName: 'FPT Corp', reference: 58000, closePrice: 58200, totalTrading: 3733300, totalTradingValue: 217764840000, bidPrice1: '58100.0', bidVol1: 16800, foreignRemain: 359373728, ts: 100, s: 10, tradingdate: '16/10/2026' };

test('AGR: converts VND and turnover units, preserves share quantities and auction prices', () => {
  const stock = toAgrStock(snapshot);
  assert.equal(stock.price, 58.2);
  assert.equal(stock.value, 217764.84);
  assert.equal(stock.volume, 3733300);
  assert.equal(stock.foreignRoom, 359373728);
  assert.equal(stock.quantScore, null);
  assert.equal(stock.bid[0].price, 58.1);
  assert.ok(Math.abs(stock.change - 0.3448275862068966) < 1e-10);
  const auction = toAgrStock({ ...snapshot, bidPrice1: 'ATC' });
  assert.equal(auction.bid[0].price, null);
  assert.equal(auction.bid[0].priceLabel, 'ATC');
  assert.equal(toAgrStock({ ...snapshot, exchange: 'XHNF' }), null);
  assert.equal(toAgrStock({ ...snapshot, symbol: 'CFPT2601' }), null);
});
test('AGR: merges sparse events, zeroes, stale snapshots and new-session sequences', () => {
  const merged = mergeAgrRecord(snapshot, { SB: 'FPT', CP: 59000, V1: 0, s: 11, ts: 101 });
  assert.equal(toAgrStock(merged).price, 59);
  assert.equal(toAgrStock(merged).bid[0].volume, 0);
  assert.equal(toAgrStock(merged).volume, 3733300);
  assert.equal(mergeAgrRecord(merged, snapshot).closePrice, 59000);
  assert.equal(mergeAgrRecord(merged, { SB: 'FPT', CP: 60000, TD: '19/10/2026', s: 1, ts: 200 }).closePrice, 60000);
  const earlyEvent = mergeAgrRecord(undefined, { SB: 'FPT', CP: 59000, ts: 101 });
  assert.equal(toAgrStock(mergeAgrRecord(earlyEvent, snapshot)).price, 59);
});
test('AGR: Engine.IO handshake, subscription acknowledgement, events and cleanup', () => {
  const sent = [], received = [], indices = []; let ready = 0, reset = 0, disconnected = 0, closed = 0;
  const socket = { readyState: 1, send: frame => sent.push(frame), close: () => { closed++; socket.onclose?.(); } };
  const stop = connectAgrPriceboard({ onReady: () => ready++, onRecords: rows => received.push(...rows), onIndices: rows => indices.push(...rows), onDisconnect: () => disconnected++, onReset: () => reset++ }, url => { assert.match(url, /EIO=3/); return socket; });
  const message = data => socket.onmessage({ data });
  message('0{"pingInterval":25000,"pingTimeout":60000}'); message('40');
  assert.equal(ready, 0);
  const subscription = JSON.parse(sent[0].slice(3));
  assert.deepEqual(subscription[1].data.args, AGR_TOPICS);
  assert.ok(AGR_TOPICS.includes('idx:30'));
  message('430[{"statusCode":200}]'); assert.equal(ready, 1);
  message('42["i",{"a":"u","d":[{"SB":"FPT","CP":59000}]}]');
  message('42["idx",{"a":"u","d":[{"MC":"HOSE","MI":1705.91,"IPC":0.45}]}]');
  message('42["initday",{}]'); message('42bad-json');
  assert.equal(received[0].CP, 59000); assert.equal(reset, 1);
  assert.equal(indices[0].MI, 1705.91);
  stop(); assert.equal(closed, 1); assert.equal(disconnected, 0); assert.equal(socket.onmessage, null);
});
test('AGR indices: maps all four identities, preserves point/percent units and sparse/stale updates', () => {
  assert.deepEqual(toAgrIndices(new Map()).map(row => row.value), [null, null, null, null]);
  const rows = new Map();
  for (const [MC, MI, IPC] of [['10', '1705.91', '0.45'], ['30', '1855.41', '0.63'], ['04', '124.87', '0.58'], ['02', '259.13', '-0.06']]) {
    const row = expandAgrIndexRecord({ MC, MI, IPC, t: 100 }); rows.set(row.marketCode, row);
  }
  assert.deepEqual(toAgrIndices(rows), [
    { name: 'VN-INDEX', value: 1705.91, change: 0.45 }, { name: 'VN30', value: 1855.41, change: 0.63 },
    { name: 'UPCOM', value: 124.87, change: 0.58 }, { name: 'HNX-INDEX', value: 259.13, change: -0.06 },
  ]);
  const patch = expandAgrIndexRecord({ MC: 'HOSE', MI: '1710', t: 101 });
  rows.set('HOSE', mergeAgrRecord(rows.get('HOSE'), patch));
  assert.deepEqual(toAgrIndices(rows)[0], { name: 'VN-INDEX', value: 1710, change: 0.45 });
  rows.set('HOSE', mergeAgrRecord(rows.get('HOSE'), expandAgrIndexRecord({ marketCode: 'HOSE', marketIndex: '1700', ts: 99 })));
  assert.equal(toAgrIndices(rows)[0].value, 1710);
  rows.set('HOSE', mergeAgrRecord(rows.get('HOSE'), expandAgrIndexRecord({ MC: 'HOSE', IPC: 0, t: 102 })));
  assert.equal(toAgrIndices(rows)[0].change, 0);
});
test('AGR snapshot route returns 502 for invalid upstream and does not leak upstream errors', async () => {
  const { GET } = load('app/api/market/agr/route.ts');
  const previous = global.fetch;
  try {
    global.fetch = async url => Response.json({ s: 'ok', d: url.endsWith('/instruments') ? [snapshot] : [{ marketCode: 'HOSE', marketIndex: '1705.91', indexPercentChange: '0.45' }] });
    const result = await GET(); assert.equal(result.status, 200);
    assert.equal((await result.json()).indices[0].marketIndex, '1705.91');
    global.fetch = async url => { if (url.endsWith('/instruments')) return Response.json({ s: 'ok', d: [snapshot] }); throw new Error('index source unavailable'); };
    const partial = await GET(); assert.equal(partial.status, 200);
    assert.equal((await partial.json()).indices, null);
    global.fetch = async () => Response.json({ s: 'error', d: [] });
    assert.equal((await GET()).status, 502);
    global.fetch = async () => { throw new Error('private upstream details'); };
    assert.doesNotMatch(await (await GET()).text(), /private upstream details/);
  } finally { global.fetch = previous; }
});
