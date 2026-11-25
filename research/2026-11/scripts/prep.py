import json,glob,os,numpy as np,pandas as pd
import os; B=os.environ.get('QUANTIK_RESEARCH_DIR', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'work')) + '/'
items=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'frontend', 'src', 'content', 'agr-equities.json')))['items']
exch={x[0]:x[2] for x in items}
idx=pd.read_csv(B+'data/VNINDEX.csv'); idx['d']=pd.to_datetime(idx.t,unit='s').dt.normalize()
idx=idx.drop_duplicates('d').set_index('d').sort_index()
dates=idx.index
C={};H={};L={};V={};O={}
for s in exch:
    f=B+f'data/{s}.csv'
    if not os.path.exists(f): continue
    d=pd.read_csv(f)
    if len(d)<30: continue
    d['d']=pd.to_datetime(d.t,unit='s').dt.normalize()
    d=d.drop_duplicates('d').set_index('d').sort_index()
    d=d[d.c>0]
    C[s]=d.c;H[s]=d.h;L[s]=d.l;V[s]=d.v;O[s]=d.o
def W(D): return pd.DataFrame(D).reindex(dates)
C,H,L,V,O=map(W,(C,H,L,V,O))
for n,x in zip('CHLVO',(C,H,L,V,O)): x.to_pickle(B+f'data/W_{n}.pkl')
idx.to_pickle(B+'data/VNI.pkl')
print(C.shape,dates[0],dates[-1])
