import numpy as np, pandas as pd
from lib import *
EX='14:25'
def T(date,d,en,ex,slip,tag=''):
    g=d*(ex-en); return dict(date=date,dir=d,entry=en,exit=ex,gross=g,pnl_pts=g-2*(COMM+slip*TICK),tag=tag)
def s1(day,O,C,variant,slip):
    out=[]
    for dte in day.index:
        o=O.loc[dte];c=C.loc[dte]
        if np.isnan(c['09:25']) or day.ref[dte]!=day.ref[dte]: continue
        r=c['09:25']-(o['09:00'] if variant in('A','C') else day.ref[dte])
        if r==0: continue
        d=np.sign(r)
        if variant in('A','B'): out.append(T(dte,d,o['09:30'],c[EX],slip))
        else: out.append(T(dte,d,o['14:00'],c[EX],slip))
    return pd.DataFrame(out)
def s2(day,O,H,L,C,N,stop,slip,lat=0):
    nb=3 if N==15 else 6; out=[]
    labs=LAB
    for dte in day.index:
        h=H.loc[dte];l=L.loc[dte];c=C.loc[dte];o=O.loc[dte]
        hi=h[labs[:nb]].max(); lo=l[labs[:nb]].min(); mid=(hi+lo)/2; pos=0
        for k in range(nb,len(labs)-1):
            lab=labs[k]; nxt=labs[k+1]
            if pos==0:
                if lab>'14:15': break
                if c[lab]>hi: pos=1
                elif c[lab]<lo: pos=-1
                if pos: en=o[labs[min(k+1+lat,len(labs)-1)]]
            else:
                lvl=mid if stop=='mid' else (lo if pos==1 else hi)
                if (pos==1 and c[lab]<lvl) or (pos==-1 and c[lab]>lvl):
                    out.append(T(dte,pos,en,o[labs[min(k+1+lat,len(labs)-1)]],slip)); pos=-2; break
        if pos in(1,-1): out.append(T(dte,pos,en,c[EX],slip))
    return pd.DataFrame(out)
def s3(day,O,C,k,mode,slip):
    sd=day.ret.rolling(20).std().shift(1); out=[]
    for dte in day.index:
        g=day.gap[dte]
        if not(sd[dte]==sd[dte]) or g!=g or abs(g)<k*sd[dte]: continue
        d=-np.sign(g) if mode=='fade' else np.sign(g)
        out.append(T(dte,d,O.loc[dte,'09:05'],C.loc[dte,EX],slip))
    return pd.DataFrame(out)
def daily_engine(day,pos,slip,extra_roll=True):
    """pos[t]: held from close t to close t+1. returns daily pnl pts"""
    pos=pos.reindex(day.index).fillna(0); p1=pos.shift().fillna(0)
    c=COMM+slip*TICK
    pnl=p1*day.ret.fillna(0)                    # earn today's return with yesterday's decision
    pnl-= (pos-p1).abs()*c                       # trade at today's close
    pnl-= p1.abs()*HOLD*day.nights                # overnight holding fee for night just held
    if extra_roll: pnl-= p1.abs()*day.roll*2*c   # roll cost: close expiring, open next
    # fix: fee/cost timing – fine at daily frequency
    return pnl
def s5_pos(day,kind,L,vt):
    x=day.adjC.copy(); x[:]=day.adjC.values; x_s=x.copy(); x_s=pd.Series(day.sigp.values,index=day.index)
    if kind=='MA':
        s=np.sign(day.adjC.rolling(19).sum().shift().add(x_s).div(20)-day.adjC.rolling(59).sum().shift().add(x_s).div(60))
    else:
        s=np.sign(x_s-day.adjC.shift(L))
    s=s.fillna(0)
    if not vt: return s
    r=(day.ret/day.ref).fillna(0); v=np.sqrt((r**2).ewm(alpha=0.06).mean()*252)
    w=(0.20/v).clip(upper=2).shift(0)   # sigma known at close t
    return (s*w/0.25).round()*0.25
def trades_daily(day,pos,slip):
    """per-episode trades: gross on roll-adjusted close, net of costs/fees/roll cost; pts per 1 unit"""
    sgn=np.sign(pos.reindex(day.index).fillna(0)); ep=(sgn!=sgn.shift()).cumsum(); out=[]
    c=COMM+slip*TICK; adj=day.adjC.values; n=len(day)
    for e,g in sgn.groupby(ep):
        s=g.iloc[0]
        if s==0: continue
        i0=day.index.get_loc(g.index[0]); i1=min(day.index.get_loc(g.index[-1])+1,n-1)
        gross=s*(adj[i1]-adj[i0]); fee=HOLD*day.nights.iloc[i0+1:i1+1].sum(); rl=day.roll.iloc[i0+1:i1+1].sum()*2*c
        out.append(dict(date=day.index[i0],dir=s,gross=gross,pnl_pts=gross-2*c-fee-rl,days=i1-i0))
    return pd.DataFrame(out)
def basis_panel(day,C):
    i=load5('idx'); i=i[i.lab.isin(LAB)]
    IC=i.pivot_table(index='date',columns='lab',values='c',aggfunc='last').reindex(index=day.index,columns=LAB)
    return C-IC
def s4_intraday(day,O,C,B,zin,slip,W=120):
    stk=B.stack(future_stack=True) if hasattr(B,'stack') else None
    b=B.values.flatten(); n=len(b); s=pd.Series(b)
    m=s.ewm(span=W,min_periods=W//2).mean(); v=np.sqrt(((s-m)**2).ewm(span=W,min_periods=W//2).mean())
    Z=((s-m)/v).values.reshape(B.shape); Z=pd.DataFrame(Z,index=B.index,columns=B.columns)
    out=[]; days=list(day.index); 
    bad=day.roll|day.roll.shift().fillna(False)
    for dte in days:
        if bad[dte]: continue
        z=Z.loc[dte]; o=O.loc[dte]; c=C.loc[dte]; pos=0
        for k in range(6,len(LAB)-1):
            lab=LAB[k]; nxt=LAB[k+1]; zz=z[lab]
            if zz!=zz: continue
            if pos==0:
                if lab>'14:00': break
                if zz>zin: pos=-1; en=o[nxt]
                elif zz<-zin: pos=1; en=o[nxt]
            else:
                if (pos==-1 and zz<=0) or (pos==1 and zz>=0):
                    out.append(T(dte,pos,en,o[nxt],slip)); pos=2; break
        if pos in(1,-1): out.append(T(dte,pos,en,c[EX],slip))
    return pd.DataFrame(out)
def s4_conv(day,B,thr,slip,lead=5):
    pos=pd.Series(0.0,index=day.index); idx=list(day.index)
    ex=[i for i,d in enumerate(idx) if day.expiry[d]]
    for e in ex:
        d0=e-lead
        if d0<0: continue
        b=B.loc[idx[d0],LAB[-6:]].mean()
        if b!=b or abs(b)<thr: continue
        for j in range(d0,e): pos.iloc[j]=-np.sign(b)
    return pos
