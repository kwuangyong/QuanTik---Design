# Independent Opus check: rank IC of 63d idiosyncratic vol vs next-week return.
import sys, glob, os, numpy as np, pandas as pd
D = sys.argv[1]
def load(f):
    x = pd.read_csv(f); x['date'] = pd.to_datetime(x.t, unit='s').dt.normalize(); x = x.drop_duplicates('date', keep='last'); return x.set_index('date')
idx = load(sys.argv[2]).c.pct_change()
close, val = {}, {}
for f in glob.glob(os.path.join(D, '*.csv')):
    s = os.path.basename(f)[:-4]
    if 'VNINDEX' in s.upper(): continue
    try: x = load(f)
    except Exception: continue
    if len(x) < 300: continue
    close[s] = x.c; val[s] = x.c * 1000 * x.v
C = pd.DataFrame(close).sort_index(); V = pd.DataFrame(val).reindex(C.index)
R = C.pct_change().where(lambda r: r.abs() < .16)          # drop data glitches beyond any price limit
m = idx.reindex(C.index)
beta = R.rolling(63).cov(m).div(m.rolling(63).var(), axis=0)
resid = R.sub(beta.mul(m, axis=0))
ivol = resid.rolling(63).std()
adv = V.rolling(20).mean()
fwd = C.shift(-6) / C.shift(-1) - 1                         # enter T+1 close, hold 5 sessions
fridays = C.index[(C.index.dayofweek == 4) & (C.index >= '2017-06-01')]
ics = {}
for d in fridays:
    ok = (adv.loc[d] >= 1e9) & ivol.loc[d].notna() & fwd.loc[d].notna()
    if ok.sum() < 50: continue
    ics[d] = ivol.loc[d][ok].rank().corr(fwd.loc[d][ok].rank())
s = pd.Series(ics)
def nw_t(x, L=4):
    x = x - x.mean(); n = len(x); g0 = (x*x).mean(); v = g0 + 2*sum((1-l/(L+1))*(x[l:].values*x[:-l].values).mean() for l in range(1, L+1))
    return (x.mean()+0) if False else None, np.sqrt(v/n)
for name, part in [('2017-2020', s[:'2020']), ('2021-2026', s['2021':])]:
    se = nw_t(part)[1]; print(name, 'weeks', len(part), 'mean IC %.3f' % part.mean(), 'NW t %.1f' % (part.mean()/se))
