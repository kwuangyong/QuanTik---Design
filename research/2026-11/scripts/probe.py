import requests,time,datetime as dt
B="https://api.dnse.com.vn/chart-api/v2/ohlcs/"
def get(kind,sym,r,f,t):
    return requests.get(B+kind,params=dict(**{'from':f,'to':t},symbol=sym,resolution=r),timeout=30).json()
now=int(time.time())
for kind,sym in [('derivative','VN30F1M'),('index','VN30'),('derivative','VN30F2M')]:
  for r in ['1D','1H','15','5','1']:
    # find earliest by requesting wide range
    d=get(kind,sym,r,now-86400*365*8,now); time.sleep(.4)
    t=d.get('t',[])
    print(kind,sym,r,len(t),dt.datetime.utcfromtimestamp(t[0]) if t else None, d.get('nextTime'))
