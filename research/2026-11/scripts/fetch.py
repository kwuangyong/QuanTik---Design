import requests,time,pandas as pd
B="https://api.dnse.com.vn/chart-api/v2/ohlcs/"
now=int(time.time())
def fetch(kind,sym,r,f,t):
    d=requests.get(B+kind,params={'from':f,'to':t,'symbol':sym,'resolution':r},timeout=120).json()
    return pd.DataFrame({k:d[k] for k in 'tohlcv'})
for kind,sym,tag in [('derivative','VN30F1M','f1'),('derivative','VN30F2M','f2'),('index','VN30','idx')]:
  for r in ['1D','1H','15','5','1']:
    s=1.5e9 if False else 1540000000
    parts=[];step=86400*180 if r=='1' else 86400*365*8
    a=s
    while a<now:
        parts.append(fetch(kind,sym,r,a,min(a+step,now)));a+=step;time.sleep(.4)
    df=pd.concat(parts).drop_duplicates('t').sort_values('t')
    df.to_csv(f"data/vn30f/{tag}_{r}.csv",index=False);print(tag,r,len(df))
