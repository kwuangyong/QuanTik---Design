import numpy as np, pandas as pd
from scipy import stats as st
D='data/vn30f/'
TICK=0.1; COMM=(3000+2700)/1e5; HOLD=2550/1e5; MARG=0.20; MULT=1e5
AM=[f"{h:02d}:{m:02d}" for h in (9,10) for m in range(0,60,5)]+[f"11:{m:02d}" for m in range(0,30,5)]
AM=[x for x in AM if x>='09:00']
PM=[f"13:{m:02d}" for m in range(0,60,5)]+[f"14:{m:02d}" for m in range(0,30,5)]
LAB=AM+PM  # continuous bars 09:00..14:25
def load5(tag):
    d=pd.read_csv(f'{D}{tag}_5.csv'); d['dt']=pd.to_datetime(d.t,unit='s')+pd.Timedelta(hours=7)
    d['date']=d.dt.dt.normalize(); d['lab']=d.dt.dt.strftime('%H:%M'); return d
def third_thu(y,mo):
    d=pd.date_range(f'{y}-{mo:02d}-01',periods=31,freq='D'); d=d[d.month==mo]; return d[d.dayofweek==3][2]
def build():
    f=load5('f1'); days=sorted(f.date.unique()); days=pd.DatetimeIndex(days)
    def piv(col,fill):
        p=f[f.lab.isin(LAB)].pivot_table(index='date',columns='lab',values=col,aggfunc='last').reindex(index=days,columns=LAB)
        return p
    C=piv('c',0); O=piv('o',0); H=piv('h',0); L=piv('l',0)
    # fill missing bars: close ffill along day then across, open = prev close
    C=C.ffill(axis=1).bfill(axis=1); O=O.fillna(C.shift(1,axis=1)).fillna(C); H=H.fillna(C); L=L.fillna(C)
    atc=f[f.lab=='14:45'].set_index('date').c.reindex(days)
    close=atc.fillna(C['14:25'])
    f2=pd.read_csv(D+'f2_1D.csv'); f2['date']=pd.to_datetime(f2.t,unit='s').dt.normalize(); c2=f2.drop_duplicates('date',keep='last').set_index('date').c.reindex(days)
    pc=close.shift(); pc2=c2.shift(); op=O['09:00']
    g1=(op-pc).abs(); g2=(op-pc2).abs()
    roll=pd.Series(False,index=days)
    for y in range(2018,2027):
        for mo in range(1,13):
            e=third_thu(y,mo)
            if e<days[0] or e>=days[-1]: continue
            E=days[days<=e][-1]; nxt=days[days>E]
            if len(nxt): roll[nxt[0]]=True
    ref=pc.where(~roll,pc2)
    day=pd.DataFrame({'open':op,'close':close,'ref':ref,'pc':pc,'roll':roll})
    day['gap']=day.open-day.ref; day['ret']=day.close-day.ref; day['intra']=C['14:25']-op
    day['dow']=days.dayofweek
    cal=pd.Series(days,index=days); day['nights']=(cal-cal.shift()).dt.days.fillna(1)
    day['adjC']=day.ret.fillna(0).cumsum()+day.close.iloc[0]
    day['sigp']=day.adjC-(day.close-C['14:25'])
    # expiry flag: day before roll
    day['expiry']=day.roll.shift(-1,fill_value=False)
    return day,O,H,L,C
def cost_pts(slip_ticks=1): return COMM+slip_ticks*TICK   # per side
# ---------- statistics
def nw_t(x,lag=5):
    x=np.asarray(x,float); n=len(x); m=x.mean(); e=x-m; v=e@e/n
    for k in range(1,lag+1):
        w=1-k/(lag+1); v+=2*w*(e[k:]@e[:-k])/n
    return m/np.sqrt(v/n)
def boot(x,reps=2000,bl=10,seed=1):
    x=np.asarray(x,float); n=len(x); rng=np.random.default_rng(seed); out=np.empty(reps); sr=np.empty(reps)
    p=1/bl
    for r in range(reps):
        idx=np.empty(n,int); idx[0]=rng.integers(n)
        jump=rng.random(n)<p; nxt=rng.integers(n,size=n)
        for i in range(1,n): idx[i]=nxt[i] if jump[i] else (idx[i-1]+1)%n
        s=x[idx]; out[r]=s.mean(); sr[r]=s.mean()/s.std()*np.sqrt(252) if s.std()>0 else 0
    return np.percentile(sr,[2.5,97.5]),np.percentile(out,[2.5,97.5])
def sharpe(x): x=np.asarray(x,float); return x.mean()/x.std()*np.sqrt(252) if x.std()>0 else 0.0
def maxdd(r): c=np.cumsum(r); return (c-np.maximum.accumulate(np.r_[0,c])[1:]).min()
def dsr(x,N,srvar):
    """x daily returns; N trials; srvar variance of daily SRs across trials"""
    x=np.asarray(x,float); T=len(x); sr=x.mean()/x.std(); sk=st.skew(x); ku=st.kurtosis(x,fisher=False)
    g=0.5772156649; sr0=np.sqrt(srvar)*((1-g)*st.norm.ppf(1-1/N)+g*st.norm.ppf(1-1/(N*np.e)))
    z=(sr-sr0)*np.sqrt(T-1)/np.sqrt(1-sk*sr+(ku-1)/4*sr**2)
    return st.norm.cdf(z),sr0*np.sqrt(252)
def summarize(pnl_day,trades,price_day,name,boots=True):
    """pnl_day: daily pnl pts per 1 contract (zeros when flat); price_day: price for ROM"""
    r=(pnl_day/(MARG*price_day)).values  # return on margin
    pct=(pnl_day/price_day).values
    s=dict(name=name,days=len(r),ntr=len(trades),
      sharpe=sharpe(pct),nwt=nw_t(pct),ann_rom=r.mean()*252,mdd_rom=maxdd(r),tot_pts=pnl_day.sum(),
      pts_day=pnl_day.mean(),skew=st.skew(r),kurt=st.kurtosis(r,fisher=False))
    if len(trades):
        p=trades.pnl_pts.values; w=p[p>0]; l=p[p<=0]
        s.update(win=len(w)/len(p),avgw=w.mean() if len(w) else 0,avgl=l.mean() if len(l) else 0,exp_pts=p.mean(),exp_vnd=p.mean()*MULT,
                 pf=w.sum()/-l.sum() if l.sum()<0 else np.inf)
    if boots and pct.std()>0:
        ci,_=boot(pct); s['sr_lo'],s['sr_hi']=ci
    return s
