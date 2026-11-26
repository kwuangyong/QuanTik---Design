# Independent Opus re-implementation of ORB15, opposite-side close stop, 5m bars.
import sys, pandas as pd, numpy as np
d = pd.read_csv(sys.argv[1]); d['ts'] = pd.to_datetime(d.t, unit='s') + pd.Timedelta(hours=7)
d['day'] = d.ts.dt.date; d['hm'] = d.ts.dt.hour*100 + d.ts.dt.minute
cost = 2*(0.1 + 0.057)  # 1 tick slippage + commission per side, points round trip
pnl = {}
for day, g in d.groupby('day'):
    g = g[(g.hm >= 900) & (g.hm <= 1425)].reset_index(drop=True)
    rng = g[g.hm < 915]
    if len(rng) < 3 or len(g) < 10: continue
    hi, lo = rng.h.max(), rng.l.min()
    rest = g[g.hm >= 915].reset_index(drop=True)
    pos = 0; entry = None; res = 0.0
    for i in range(len(rest) - 1):
        c = rest.c[i]; nxt = rest.o[i+1]
        if pos == 0 and entry is None and rest.hm[i] <= 1415:
            if c > hi: pos, entry = 1, nxt
            elif c < lo: pos, entry = -1, nxt
        elif pos != 0 and ((pos == 1 and c < lo) or (pos == -1 and c > hi)):
            res = pos*(nxt - entry) - cost; pos = 0; break
    if pos != 0: res = pos*(rest.c.iloc[-1] - entry) - cost
    pnl[day] = res if entry is not None else 0.0
s = pd.Series(pnl); s.index = pd.to_datetime(s.index)
sh = s.mean()/s.std()*np.sqrt(250)
trades = (s != 0).sum()
print(f"days {len(s)} trades {trades} mean/trade {s[s!=0].mean():.2f} pts Sharpe {sh:.2f}")
print(s.groupby(s.index.year).apply(lambda x: round(x.mean()/x.std()*np.sqrt(250),2)).to_dict())
