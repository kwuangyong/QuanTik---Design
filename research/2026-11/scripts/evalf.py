import pickle,numpy as np,pandas as pd,itertools,json,sys
from scipy import stats
import os; B=os.environ.get('QUANTIK_RESEARCH_DIR', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'work')) + '/'
P=pickle.load(open(B+'data/panel.pkl','rb'))
FS=P['FS'];fwd1=P['fwd1'];fwd4=P['fwd4'];adv=P['adv'];sd=pd.DatetimeIndex(P['sd']);cols=P['cols']
ELIG1=P['elig']
ELIG5=ELIG1&(adv>=5e9)
SPLIT=pd.Timestamp('2020-12-31')
IS=sd<=SPLIT;OS=sd>SPLIT
ORDER=list(FS)
TR={}   # trial name -> weekly net return series
NTR={'ic_tests':0}
vni_ret=(P['vni_e'].shift(-1)/P['vni_e']-1)
def nw_t(x,lags=4):
    x=pd.Series(x).dropna().values;n=len(x)
    if n<20:return np.nan
    e=x-x.mean();g=e@e/n;v=g
    for l in range(1,lags+1):
        w=1-l/(lags+1);v+=2*w*(e[l:]@e[:-l])/n
    return x.mean()/np.sqrt(v/n)
def ic_series(f,fw,mask):
    a=f.where(mask);b=fw.where(mask)
    ok=a.notna()&b.notna()
    a=a.where(ok);b=b.where(ok)
    ra=a.rank(axis=1);rb=b.rank(axis=1)
    ra=ra.sub(ra.mean(1),axis=0);rb=rb.sub(rb.mean(1),axis=0)
    num=(ra*rb).sum(1);den=np.sqrt((ra**2).sum(1)*(rb**2).sum(1))
    ic=num/den;ic[ok.sum(1)<30]=np.nan
    return ic
def icstats(ic):
    ic=ic.dropna()
    if len(ic)<20:return dict(n=len(ic),IC=np.nan,ICIR=np.nan,t=np.nan,hit=np.nan)
    return dict(n=len(ic),IC=ic.mean(),ICIR=ic.mean()/ic.std()*np.sqrt(52),t=nw_t(ic),hit=(ic>0).mean())
def terc(mask):
    r=adv.where(mask).rank(axis=1,pct=True)
    return [mask&(r<=1/3),mask&(r>1/3)&(r<=2/3),mask&(r>2/3)]
# ---------- IC tables
rows=[]
for fl,mask in (('1bn',ELIG1),('5bn',ELIG5)):
    for f in ORDER:
        for hn,fw in (('1w',fwd1),('4w',fwd4)):
            ic=ic_series(FS[f],fw,mask);NTR['ic_tests']+=1
            for per,pm in (('ALL',np.ones(len(sd),bool)),('IS',IS),('OOS',OS)):
                s=icstats(ic[pm]);rows.append(dict(adv_floor=fl,factor=f,h=hn,period=per,**s))
ICT=pd.DataFrame(rows);ICT.to_csv(B+'results_ic.csv',index=False)
rows=[]
for ti,m in enumerate(terc(ELIG1)):
    for f in ORDER:
        ic=ic_series(FS[f],fwd1,m)
        for per,pm in (('ALL',np.ones(len(sd),bool)),('IS',IS),('OOS',OS)):
            rows.append(dict(tercile=['small','mid','large'][ti],factor=f,period=per,**icstats(ic[pm])))
ICTT=pd.DataFrame(rows);ICTT.to_csv(B+'results_ic_tercile.csv',index=False)
# direction from IS 1w IC (1bn)
isn=ICT[(ICT.adv_floor=='1bn')&(ICT.h=='1w')&(ICT.period=='IS')].set_index('factor')
sign={f:(1 if isn.loc[f,'IC']>=0 else -1) for f in ORDER}
# ---------- engine
SLIP=lambda a:np.where(a<5e9,0.003,0.001)
def zr(f,mask):
    r=f.where(mask).rank(axis=1,pct=True)
    n=r.notna().sum(1)
    z=stats.norm.ppf((r.sub(0.5/n,axis=0)).clip(1e-4,1-1e-4))
    return pd.DataFrame(z,index=f.index,columns=f.columns)
def engine(W,adv_=adv):
    W=W.fillna(0).values;R=fwd1.fillna(0).values;a=adv_.fillna(0).values
    T=len(W);gross=np.zeros(T);cost=np.zeros(T);turn=np.zeros(T)
    wd=np.zeros(W.shape[1])
    for t in range(T):
        sl=SLIP(a[t])
        d=W[t]-wd
        buys=np.clip(d,0,None);sells=np.clip(-d,0,None)
        cost[t]=(buys*(0.0015+sl)).sum()+(sells*(0.0015+0.001+sl)).sum()
        turn[t]=buys.sum()
        g=(W[t]*R[t]).sum();gross[t]=g
        wd=W[t]*(1+R[t])/(1+g) if W[t].sum()>0 else np.zeros_like(wd)
    net=gross-cost
    valid=fwd1.notna().sum(1).values>0
    net=pd.Series(net,index=sd)[valid];gr=pd.Series(gross,index=sd)[valid];tn=pd.Series(turn,index=sd)[valid]
    return net,gr,tn
def mstats(r,tn=None,bench=None):
    r=r.dropna()
    if len(r)<10:return {}
    eq=(1+r).cumprod();dd=(eq/eq.cummax()-1).min()
    d=dict(n=len(r),ann=eq.iloc[-1]**(52/len(r))-1,vol=r.std()*np.sqrt(52),sharpe=r.mean()/r.std()*np.sqrt(52),maxdd=dd)
    if tn is not None:d['turn_yr']=tn.reindex(r.index).mean()*52
    return d
def excess(r,b):
    x=(r-b.reindex(r.index)).dropna()
    return dict(exc_ann=x.mean()*52,IR=x.mean()/x.std()*np.sqrt(52) if x.std()>0 else np.nan,exc_t=nw_t(x))
EW1=fwd1.where(ELIG1).mean(1)
NEVAL=[0]
def evalport(name,W,register=True,adv_=adv):
    NEVAL[0]+=1
    net,gr,tn=engine(W,adv_)
    if register:TR[name]=net
    out={}
    for per,pm in (('ALL',None),('IS',IS),('OOS',OS)):
        sel=net.index<=SPLIT if per=='IS' else (net.index>SPLIT if per=='OOS' else np.ones(len(net),bool))
        s=mstats(net[sel],tn)
        s['gross_ann']=mstats(gr[sel])['ann'] if len(gr[sel])>10 else np.nan
        s.update({'vsVNI_'+k:v for k,v in excess(net[sel],vni_ret).items()})
        s.update({'vsEW_'+k:v for k,v in excess(net[sel],EW1).items()})
        out[per]=s
    return out,net,tn
def qweights(f,mask,q,nq=5):
    r=f.where(mask).rank(axis=1,pct=True)
    g=np.ceil(r*nq).clip(1,nq)
    sel=(g==q)&r.notna()
    return sel.astype(float).div(sel.sum(1).replace(0,np.nan),axis=0)
# ---------- quintile tables
qrows=[];qgross=[]
for fl,mask in (('1bn',ELIG1),('5bn',ELIG5)):
    for f in ORDER:
        for q in range(1,6):
            W=qweights(FS[f],mask,q)
            out,net,tn=evalport(f'{f}|Q{q}|{fl}',W,register=(q in (1,5)))
            for per in ('ALL','IS','OOS'):
                qrows.append(dict(adv_floor=fl,factor=f,q=q,period=per,**out[per]))
QT=pd.DataFrame(qrows);QT.to_csv(B+'results_quintiles.csv',index=False)
# ---------- composites
def composite(weights,mask):
    Z=0;
    for f,w in weights.items():
        z=zr(FS[f],mask).fillna(0)
        Z=Z+w*z
    return Z.where(mask)
sel=[f for f in ORDER if abs(isn.loc[f,'t'])>2]
fb=False
if not sel:
    fb=True;sel=list(isn['t'].abs().sort_values(ascending=False).index[:3])
wA={f:sign[f]/len(sel) for f in sel}
wB={f:isn.loc[f,'IC'] for f in ORDER}
s=sum(abs(v) for v in wB.values());wB={k:v/s for k,v in wB.items()}
def topn(Z,n):
    r=Z.rank(axis=1,ascending=False)
    s_=(r<=n);return s_.astype(float).div(s_.sum(1).replace(0,np.nan),axis=0)
def topfrac(Z,fr):
    r=Z.rank(axis=1,pct=True,ascending=False);s_=(r<=fr)
    return s_.astype(float).div(s_.sum(1).replace(0,np.nan),axis=0)
reg={'none':pd.Series(True,index=sd),'MA200':P['vni_s']>P['vni_ma200'],'MA100':P['vni_s']>P['vni_ma100']}
crow=[];CS={}
ZA=composite(wA,ELIG1);ZB=composite(wB,ELIG1)
t3=terc(ELIG1)
for cn,Z in (('A_EW_signif',ZA),('B_ICw_all',ZB)):
    ic=ic_series(Z,fwd1,ELIG1)
    for per,pm in (('IS',IS),('OOS',OS)):
        crow.append(dict(comp=cn,port='IC1w',regime='-',period=per,ic=ic[pm].mean(),ic_t=nw_t(ic[pm])))
    for pn,Wb in (('top_decile',topfrac(Z,0.1)),('top20',topn(Z,20))):
        for rn,rs in reg.items():
            W=Wb.mul(rs.astype(float),axis=0)
            out,net,tn=evalport(f'{cn}|{pn}|{rn}',W)
            CS[(cn,pn,rn)]=(net,tn)
            for per in ('IS','OOS'):crow.append(dict(comp=cn,port=pn,regime=rn,period=per,**out[per]))
# ---------- hidden gem: lower two ADV terciles
low=t3[0]|t3[1]
for cn,Z in (('A_EW_signif',ZA),('B_ICw_all',ZB)):
    Zl=Z.where(low)
    for pn,Wb in (('gem_top_decile',topfrac(Zl,0.1)),('gem_top20',topn(Zl,20)),('gem_top10',topn(Zl,10))):
        for rn,rs in (('none',reg['none']),('MA200',reg['MA200'])):
            W=Wb.mul(rs.astype(float),axis=0)
            out,net,tn=evalport(f'{cn}|{pn}|{rn}',W)
            CS[(cn,pn,rn)]=(net,tn)
            for per in ('IS','OOS'):crow.append(dict(comp=cn,port=pn,regime=rn,period=per,**out[per]))
    # per tercile top decile
    for ti,m in enumerate(t3):
        Wb=topfrac(Z.where(m),0.1)
        out,net,tn=evalport(f"{cn}|terc{['small','mid','large'][ti]}_top_decile|none",Wb)
        for per in ('IS','OOS'):crow.append(dict(comp=cn,port=f"terc_{['small','mid','large'][ti]}_top_decile",regime='none',period=per,**out[per]))
COMP=pd.DataFrame(crow);COMP.to_csv(B+'results_composite.csv',index=False)
# capacity for gem portfolios (OOS)
cap=[]
for cn,Z in (('A_EW_signif',ZA),('B_ICw_all',ZB)):
    Wb=topn(Z.where(low),20)
    a=adv.where(Wb>0)[OS]
    v=a.stack()/1e9*0.10
    cap.append(dict(comp=cn,median_per_name_bn=v.median(),p25_per_name_bn=v.quantile(.25),p10=v.quantile(.1),aum20_bn_median=v.median()*20,aum20_bn_p25=v.quantile(.25)*20))
pd.DataFrame(cap).to_csv(B+'results_capacity.csv',index=False)
# ---------- DSR
def dsr(r,names):
    r=r.dropna();T=len(r);sr=r.mean()/r.std()
    srs=np.array([TR[n][TR[n].index>SPLIT].pipe(lambda x:x.mean()/x.std()) for n in names if n in TR])
    N=len(srs);V=np.nanvar(srs)
    g=0.5772156649
    sr0=np.sqrt(V)*((1-g)*stats.norm.ppf(1-1/N)+g*stats.norm.ppf(1-1/(N*np.e)))
    sk=stats.skew(r);ku=stats.kurtosis(r,fisher=False)
    den=np.sqrt(1-sk*sr+(ku-1)/4*sr**2)
    return dict(N=N,srW=sr,sr0W=sr0,DSR=stats.norm.cdf((sr-sr0)*np.sqrt(T-1)/den),PSR0=stats.norm.cdf(sr*np.sqrt(T-1)/den))
allnames=list(TR)
drow=[]
for k,(net,tn) in CS.items():
    o=net[net.index>SPLIT];d=dsr(o,allnames);d['strategy']='|'.join(k);d['ann_net_oos']=mstats(o)['ann'];d['sharpe_oos']=mstats(o)['sharpe']
    # sensitivity N
    d['DSR_if_N10']=None;drow.append(d)
DS=pd.DataFrame(drow);DS.to_csv(B+'results_dsr.csv',index=False)
# ---------- CSCV / PBO
M=pd.DataFrame({n:TR[n] for n in TR}).dropna()
Sb=16;T=len(M);bl=np.array_split(np.arange(T),Sb)
X=M.values
n_=np.array([len(b) for b in bl]);s1=np.array([X[b].sum(0) for b in bl]);s2=np.array([(X[b]**2).sum(0) for b in bl])
def shp(idx):
    n=n_[list(idx)].sum();m=s1[list(idx)].sum(0)/n;v=s2[list(idx)].sum(0)/n-m**2
    return m/np.sqrt(np.clip(v,1e-12,None))
lam=[];lastbest=[]
for comb in itertools.combinations(range(Sb),Sb//2):
    oth=[i for i in range(Sb) if i not in comb]
    a=shp(comb);b=shp(oth);j=np.nanargmax(a)
    rk=(b<b[j]).sum()+0.5*((b==b[j]).sum()-1)
    w=(rk+1)/(len(b)+1);lam.append(np.log(w/(1-w)))
lam=np.array(lam);PBO=(lam<=0).mean()
json.dump(dict(PBO=PBO,n_strats=X.shape[1],T=T,blocks=Sb,combos=len(lam),sel=sel,fallback=fb,wA=wA,wB=wB,sign=sign,ntr=NTR,nstrat_trials=len(TR),nflag=P['nflag']),open(B+'results_meta.json','w'),indent=1,default=float)
M.to_csv(B+'results_trial_returns.csv')
# ---------- current lists
last=sd[-1]
elig_now=ELIG1.loc[last]
def current(Z,mask_low,n):
    z=Z.loc[last].where(elig_now&mask_low.loc[last]) if mask_low is not None else Z.loc[last].where(elig_now)
    top=z.dropna().sort_values(ascending=False).head(n).index
    d=pd.DataFrame({'exch':[P['exch'][s] for s in top],'price_k':P['last_price'][top].round(2),'ADV20_bn':(adv.loc[last][top]/1e9).round(2),'comp':z[top].round(2)},index=top)
    zz=zr_now
    for f in ORDER:d['z_'+f]=zz[f].loc[top].round(2)
    d['mom12_1']=FS['mom_12_1'].loc[last][top].round(3);d['high52']=FS['high52'].loc[last][top].round(3);d['ceil63']=FS['ceil_freq63'].loc[last][top]
    return d
zr_now={f:zr(FS[f],ELIG1).loc[last] for f in ORDER}
cur20=current(ZA,None,20);gem10=current(ZA,low,10)
curB=current(ZB,None,20);gemB=current(ZB,low,10)
cur20.to_csv(B+'current_top20_A.csv');gem10.to_csv(B+'current_gem10_A.csv');curB.to_csv(B+'current_top20_B.csv');gemB.to_csv(B+'current_gem10_B.csv')
print('done',last,sel,PBO,len(TR))

# ---------- extras: benchmarks, composite quintiles, DSR sensitivity
rows=[]
def bstat(name,r,tn=None):
    for per,sel in (('IS',r.index<=SPLIT),('OOS',r.index>SPLIT),('ALL',np.ones(len(r),bool))):
        d=mstats(r[sel],tn);d.update(bench=name,period=per);rows.append(d)
vr=vni_ret.dropna()
bstat('VNINDEX_buyhold',vr)
bstat('EW_universe_gross',EW1.dropna())
Wew=ELIG1.astype(float).div(ELIG1.sum(1).replace(0,np.nan),axis=0)
o,net,tn=evalport('EW_universe_net',Wew,register=False)
bstat('EW_universe_net',net,tn)
BM=pd.DataFrame(rows);BM.to_csv(B+'results_benchmarks.csv',index=False)
rows=[]
for cn,Z in (('A_EW_signif',ZA),('B_ICw_all',ZB)):
    for q in range(1,6):
        o,net,tn=evalport(f'{cn}|Q{q}',qweights(Z,ELIG1,q),register=False)
        for per in ('IS','OOS'):rows.append(dict(comp=cn,q=q,period=per,**o[per]))
pd.DataFrame(rows).to_csv(B+'results_composite_quintiles.csv',index=False)
# DSR sensitivity for headline strategies
def dsrN(r,Nn):
    r=r.dropna();T=len(r);sr=r.mean()/r.std()
    srs=np.array([TR[n][TR[n].index>SPLIT].pipe(lambda x:x.mean()/x.std()) for n in TR]);V=np.nanvar(srs)
    g=0.5772156649;sr0=np.sqrt(V)*((1-g)*stats.norm.ppf(1-1/Nn)+g*stats.norm.ppf(1-1/(Nn*np.e)))
    sk=stats.skew(r);ku=stats.kurtosis(r,fisher=False);den=np.sqrt(1-sk*sr+(ku-1)/4*sr**2)
    return stats.norm.cdf((sr-sr0)*np.sqrt(T-1)/den),sr0*np.sqrt(52)
rows=[]
for k in [('B_ICw_all','gem_top10','none'),('B_ICw_all','gem_top20','MA200'),('B_ICw_all','top_decile','none'),('A_EW_signif','top20','none')]:
    net=CS[k][0];o=net[net.index>SPLIT]
    for Nn in (5,10,30,94,NEVAL[0]):
        d,s0=dsrN(o,Nn);rows.append(dict(strategy='|'.join(k),N=Nn,DSR=d,SR0_annual=s0,SR_annual=o.mean()/o.std()*np.sqrt(52)))
pd.DataFrame(rows).to_csv(B+'results_dsr_sens.csv',index=False)
# trial-SR variance reported
json.dump(dict(neval=NEVAL[0],ntr=len(TR),var_sr_w=float(np.nanvar([TR[n][TR[n].index>SPLIT].pipe(lambda x:x.mean()/x.std()) for n in TR]))),open(B+'results_counts.json','w'))
# eligible count by year
ec=ELIG1.sum(1);ec.groupby(ec.index.year).mean().to_csv(B+'results_elig_by_year.csv')
print('extras done',NEVAL[0])
