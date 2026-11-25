import json,numpy as np,pandas as pd
from scipy import stats
import os; B=os.environ.get('QUANTIK_RESEARCH_DIR', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'work')) + '/'
C=pd.read_pickle(B+'data/W_C.pkl');H=pd.read_pickle(B+'data/W_H.pkl');L=pd.read_pickle(B+'data/W_L.pkl')
V=pd.read_pickle(B+'data/W_V.pkl');VNI=pd.read_pickle(B+'data/VNI.pkl')
items=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'frontend', 'src', 'content', 'agr-equities.json')))['items']
ex={x[0]:x[2] for x in items}
cols=list(C.columns)
lim=pd.Series({s:{'HOSE':.07,'HNX':.10,'UPCOM':.15}[ex[s]] for s in cols})
real=C.notna()
Cf=C.ffill(limit=10)
Hf=H.where(real);Lf=L.where(real)
r=Cf.pct_change(fill_method=None)
# data-error flag: overnight jump > 15.75% (beyond any exchange limit) -> zeroed
flag=(r.abs()>0.1575)
nflag=int(flag.sum().sum())
r=r.mask(flag,0.0)
# rebuild clean price index from cleaned returns (so factor prices are continuous)
P=(1+r.fillna(0)).cumprod().where(Cf.notna())
Vz=V.fillna(0)
val=(Cf*Vz*1000)          # VND traded
adv20=val.rolling(20,min_periods=15).mean()
adv120=val.rolling(120,min_periods=60).mean()
nhist=Cf.notna().cumsum()
m=VNI.c.pct_change()
mk=m.values[:,None]
# lock flags
ceil=(r>=lim*0.97)&(Cf>=Hf-1e-9)&real
floor_=(r<=-lim*0.97)&(Cf<=Lf+1e-9)&real
def sdates():
    d=pd.Series(C.index,index=C.index)
    wk=d.groupby(d.index.to_period('W')).last()
    return list(wk.values)
def F():
    f={}
    lp=np.log(P)
    f['mom_12_1']=P.shift(21)/P.shift(252)-1
    f['mom_6_1']=P.shift(21)/P.shift(126)-1
    # residual momentum
    n=252
    rr=r.fillna(0)
    mm=pd.Series(m.fillna(0).values,index=C.index)
    mean_r=rr.rolling(n).mean(); mean_m=mm.rolling(n).mean()
    cov=(rr.mul(mm,axis=0)).rolling(n).mean()-mean_r.mul(mean_m,axis=0)
    varm=(mm**2).rolling(n).mean()-mean_m**2
    beta=cov.div(varm,axis=0)
    alpha=mean_r-beta.mul(mean_m,axis=0)
    # sum of residuals over [t-251,t-21]
    k=231
    sr=rr.rolling(k).sum().shift(21); sm=mm.rolling(k).sum().shift(21)
    eps=sr-beta.mul(sm,axis=0)-k*alpha
    var_r=(rr**2).rolling(n).mean()-mean_r**2
    var_e=(var_r).sub(beta.pow(2).mul(varm,axis=0)).clip(lower=1e-10)
    f['resid_mom']=eps/np.sqrt(var_e*k)
    f['high52']=P/P.rolling(252,min_periods=200).max()
    f['beta252']=beta
    f['dist_ma200']=P/P.rolling(200,min_periods=150).mean()-1
    # idio vol 63d
    n=63
    mr=rr.rolling(n).mean();mmn=mm.rolling(n).mean()
    cv=(rr.mul(mm,axis=0)).rolling(n).mean()-mr.mul(mmn,axis=0)
    vm=(mm**2).rolling(n).mean()-mmn**2
    vr=(rr**2).rolling(n).mean()-mr**2
    f['ivol63']=np.sqrt((vr-cv.pow(2).div(vm,axis=0)).clip(lower=0))
    f['rev5']=P/P.shift(5)-1
    f['rev21']=P/P.shift(21)-1
    am=(r.abs()/(val/1e9)).replace([np.inf,-np.inf],np.nan)
    f['amihud']=am.rolling(63,min_periods=40).mean()
    f['turn_chg']=adv20/adv120
    hl=(Hf-Lf).replace(0,np.nan)
    mfv=(((Cf-Lf)-(Hf-Cf))/hl*Vz).fillna(0)
    f['cmf20']=mfv.rolling(20).sum()/Vz.rolling(20).sum().replace(0,np.nan)
    # frog in pan: sign(mom)*(pct_pos-pct_neg) over days t-251..t-21
    pos=(r>0).astype(float).where(r.notna());neg=(r<0).astype(float).where(r.notna())
    pp=pos.rolling(231,min_periods=150).mean().shift(21);pn=neg.rolling(231,min_periods=150).mean().shift(21)
    f['fip']=np.sign(f['mom_12_1'])*(pp-pn)
    f['ceil_freq63']=ceil.astype(float).rolling(63).sum()
    return f
fac=F()
sd=sdates()
# signal-date-only factors (rolling sort / regression)
si=[C.index.get_loc(d) for d in sd]
Pv=P.values;rv=r.values
lpv=np.log(Pv)
def at_signal():
    out={'trend_q':[], 'max5':[]}
    t=np.arange(126.)
    for i in si:
        if i<126:
            out['trend_q'].append(np.full(len(cols),np.nan));out['max5'].append(np.full(len(cols),np.nan));continue
        y=lpv[i-125:i+1]
        ok=~np.isnan(y).any(0)
        yc=y-np.nanmean(y,0)
        tc=t-t.mean()
        sxy=(tc[:,None]*yc).sum(0);sxx=(tc**2).sum();syy=(yc**2).sum(0)
        with np.errstate(all='ignore'):
            r2=sxy**2/(sxx*syy);sl=np.sign(sxy)
        q=np.where(ok,r2*sl,np.nan);out['trend_q'].append(q)
        w=rv[i-20:i+1]
        w=np.where(np.isnan(w),-9,w)
        top=np.sort(w,0)[-5:]
        mx=np.where((w>-9).sum(0)>=15,top.mean(0),np.nan)
        out['max5'].append(mx)
    return {k:pd.DataFrame(v,index=sd,columns=cols) for k,v in out.items()}
sig=at_signal()
FS={k:v.loc[sd] for k,v in fac.items()}
FS.update(sig)
ORDER=['mom_12_1','mom_6_1','resid_mom','high52','trend_q','max5','ivol63','rev5','rev21','amihud','turn_chg','cmf20','fip','beta252','dist_ma200','ceil_freq63']
FS={k:FS[k] for k in ORDER}
# eligibility & forward prices
sdI=pd.DatetimeIndex(sd)
pf=(Cf>=5)|pd.DataFrame(np.repeat((Cf.index<pd.Timestamp('2025-06-01'))[:,None],Cf.shape[1],1),index=Cf.index,columns=Cf.columns)  # price floor only where adjusted~nominal
elig_base=pf.loc[sd]&(nhist.loc[sd]>=250)
adv_s=adv20.loc[sd]
last_real=real.rolling(5).max().loc[sd]>0   # traded within last 5 days
# entry = close of T+1
pos_idx=np.array(si)
entry_i=np.minimum(pos_idx+1,len(C)-1)
dts=C.index
# for each signal k: entry day index e_k; exit for 1w = e_{k+1}; 4w = e_{k+4}
E_=entry_i
def px_at(ix): return P.values[ix]
Pe=pd.DataFrame(P.values[E_],index=sd,columns=cols)
# floor-locked exit handling: if floor-locked at exit day, push exit forward up to 5 days
def exit_prices(shift):
    out=np.full((len(sd),len(cols)),np.nan)
    fl=floor_.values
    for k in range(len(sd)-shift):
        ix=np.full(len(cols),E_[k+shift]);
        ix=ix.copy()
        for _ in range(5):
            lock=fl[np.minimum(ix,len(C)-1),np.arange(len(cols))]&(ix<len(C)-1)
            if not lock.any():break
            ix=np.where(lock,ix+1,ix)
        out[k]=Pv[ix,np.arange(len(cols))]
    return pd.DataFrame(out,index=sd,columns=cols)
X1=exit_prices(1);X4=exit_prices(4)
fwd1=(X1/Pe-1);fwd4=(X4/Pe-1)
# last (open) interval has no exit
buy_locked=pd.DataFrame(ceil.values[E_],index=sd,columns=cols)
elig=elig_base&(adv_s>=1e9)&last_real&Pe.notna()&(~buy_locked)
adv_next=adv_s
import pickle
vni_c=VNI.c.reindex(dts)
vni_e=pd.Series(vni_c.values[E_],index=sd)
vni_ma200=(vni_c.rolling(200).mean()).loc[sd];vni_ma100=(vni_c.rolling(100).mean()).loc[sd];vni_s=vni_c.loc[sd]
pickle.dump(dict(FS=FS,fwd1=fwd1,fwd4=fwd4,elig=elig,adv=adv_s,sd=sd,Pe=Pe,vni_e=vni_e,vni_s=vni_s,vni_ma200=vni_ma200,vni_ma100=vni_ma100,
  nflag=nflag,lim=lim,exch=ex,cols=cols,last_date=dts[-1],last_price=Cf.iloc[-1],ceil_last=ceil.iloc[-1],ret_last=r.iloc[-1],adv_last=adv20.iloc[-1],nhist_last=nhist.iloc[-1],real_last=real.iloc[-5:].any()),open(B+'data/panel.pkl','wb'))
print('flagged jumps',nflag,'sd',len(sd),'elig mean/week',elig.sum(1).mean())
