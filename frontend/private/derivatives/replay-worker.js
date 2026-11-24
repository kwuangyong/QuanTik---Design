importScripts('market-session.js','strategy-engine.js');

self.onmessage = ({data: {data, firstSignal, config}}) => {
  const results = {};
  for (const method of Object.keys(futuresMethods)) {
    results[method] = replayStrategy(data, method, config, firstSignal);
  }
  self.postMessage(results);
};
