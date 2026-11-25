import pandas as pd,numpy as np,json
import os; B=os.environ.get('QUANTIK_RESEARCH_DIR', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'work')) + '/'
C=pd.read_pickle(B+'data/W_C.pkl');H=pd.read_pickle(B+'data/W_H.pkl');V=pd.read_pickle(B+'data/W_V.pkl')
items=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'frontend', 'src', 'content', 'agr-equities.json')))['items']
ex={x[0]:x[2] for x in items}
Cf=C.ffill(limit=10)
r=Cf.pct_change(fill_method=None)
lim=pd.Series({s:{'HOSE':.07,'HNX':.10,'UPCOM':.15}[ex[s]] for s in C.columns})
print('n syms',C.shape[1],'obs',C.notna().sum().sum())
for k in (1.05,):
    big=(r.abs()>lim*k)
    print('jumps>limit*1.05',big.sum().sum(),' by exch',big.sum().groupby(lim.index.map(ex)).sum().to_dict())
big2=(r.abs()>0.1575)
print('>15.75%',big2.sum().sum())
bb=big2.stack();bb=bb[bb]
x=r.stack()[bb.index].sort_values()
print(x.head(15));print(x.tail(15))
print(pd.Series([d.year for d,_ in bb.index]).value_counts().sort_index().to_dict())
# prices low?
print((C.iloc[-1]).describe())
