const vn30Multiplier = 100000;
const spotClose = 1822.3;
const contracts = [
  {alias:'F1M', code:'41I1GC000', expiry:'17/12/2026', days:27,  last:1824.6},
  {alias:'F2M', code:'41I1H1000', expiry:'21/01/2027', days:62,  last:1829.4},
  {alias:'F1Q', code:'41I1H3000', expiry:'18/03/2027', days:118, last:1834.1},
  {alias:'F2Q', code:'41I1H6000', expiry:'17/06/2027', days:209, last:1848.3}
];

function sample(i, contractIndex) {
  const phase = i / 90;
  const spot = spotClose - 11 * (1-phase) + Math.sin(i*.13)*3*(1-phase) + Math.sin(i*.71)*1.7*(1-phase);
  const price = spot + contracts[contractIndex].last - spotClose
    + (1-phase) * (Math.cos(i*.28 + contractIndex)*2 + contractIndex);
  return {spot: Math.round(spot*100)/100, price: Math.round(price*10)/10};
}

function simulationDay(timestamp) {
  return Math.floor((timestamp+7*3600000)/86400000);
}

function replayCoverage(rows) {
  const counts = new Map();
  const days = new Set(rows.map(row => simulationDay(row.time)));
  for (let i = 1; i < rows.length; i++) {
    const previous = rows[i-1], current = rows[i];
    if (simulationDay(previous.time) === simulationDay(current.time)) {
      const step = current.time - previous.time;
      counts.set(step, (counts.get(step) || 0) + 1);
    }
  }
  const cadence = Array.from(counts).sort((a,b) => b[1]-a[1] || a[0]-b[0])[0]?.[0];
  let interruptions = 0, longest = rows.length ? 1 : 0, run = longest;
  for (let i = 1; i < rows.length; i++) {
    const previous = rows[i-1], current = rows[i];
    const sameDay = simulationDay(previous.time) === simulationDay(current.time);
    if (sameDay && current.time-previous.time === cadence) {
      run++;
    } else {
      if (sameDay) interruptions++;
      run = 1;
    }
    longest = Math.max(longest, run);
  }
  const offTick = rows.filter(row => Math.abs(row.close*10 - Math.round(row.close*10)) > 1e-7).length;
  return {cadence, days:days.size, interruptions, longest, offTick};
}

function displayBars(rows, cadence) {
  const points = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i], previous = rows[i-1];
    if (previous && (simulationDay(row.time)!==simulationDay(previous.time) || row.time-previous.time!==cadence)) {
      points.push({time:row.time, close:null, spot:null});
    }
    points.push(row);
  }
  return points;
}

const quoteBook = (() => {
  const tz = 'Asia/Ho_Chi_Minh';
  const dateTime = new Intl.DateTimeFormat('vi-VN', {timeZone:tz, day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', hourCycle:'h23'});
  const clock = new Intl.DateTimeFormat('vi-VN', {timeZone:tz, hour:'2-digit', minute:'2-digit', hourCycle:'h23'});
  const start = Date.parse('2026-11-20T13:00:00+07:00');
  const samples = contracts.map((contract, index) => ({
    ...contract, source:'sample', sourceName:'Phiên mẫu',
    rows:Array.from({length:91}, (_, i) => {
      const {price, spot} = sample(i, index);
      return {time:start + i*60000, close:price, spot};
    })
  }));
  for (const entry of samples) entry.coverage = replayCoverage(entry.rows);
  const sessions = samples.slice();

  function put(code, rows, fileName) {
    let index = sessions.findIndex(entry => entry.code===code && entry.source==='csv');
    if (index===-1) index = contracts.findIndex(contract => contract.code===code);
    if (index === -1) {
      index = contracts.length;
      contracts.push({code});
    }
    // The four CSV columns do not certify the expiry, rolling alias, or days remaining.
    sessions[index] = {code, rows, coverage:replayCoverage(rows), source:'csv', sourceName:fileName, alias:null, expiry:null, days:null};
    return index;
  }

  function reset(index) {
    if (index < samples.length) {
      sessions[index] = samples[index];
      return index;
    }
    contracts.splice(index, 1);
    sessions.splice(index, 1);
    const availableSample = sessions.findIndex(entry => entry.source==='sample');
    if (availableSample!==-1) return availableSample;
    // All four sample slots are displaying imports. Keep the first CSV
    // independently selectable when re-opening the sample quote.
    contracts.push({code:sessions[0].code});
    sessions.push(sessions[0]);
    sessions[0] = samples[0];
    return 0;
  }

  return {
    active: index => sessions[index],
    template: index => samples[index] || samples[0],
    put, reset,
    time: time => dateTime.format(time),
    clock: time => clock.format(time)
  };
})();
