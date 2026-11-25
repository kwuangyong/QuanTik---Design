import pickle,warnings;warnings.filterwarnings('ignore')
from lib import *
RES,bench,FAMV=pickle.load(open('data/res.pkl','rb'))
day=pd.read_csv('data/vn30f/daily_built.csv',index_col=0,parse_dates=True); days=day.index; price=day.open
N=sum(len(v) for v in FAMV.values()); print('N trials',N)
pct=lambda s:(s/price)
# SR variance across trials (daily SR), slip=1
srs=np.array([ (pct(RES[(n,1)][0]).mean()/pct(RES[(n,1)][0]).std()) for v in FAMV.values() for n in v]); srvar=srs.var(ddof=1)
print('srvar',srvar,'annual SR0 approx',)
rows=[]
for fam,vs in FAMV.items():
    for n in vs:
        for sl in(0,1,2):
            s,t=RES[(n,sl)]
            d=summarize(s,t,price,n,boots=(sl==1))
            p=pct(s).values
            d['dsr'],d['sr0_ann']=dsr(p,N,srvar); d['fam']=fam; d['slip']=sl
            # year stability (slip1)
            if sl==1:
                ys=pct(s).groupby(days.year).apply(lambda x:sharpe(x) if len(x)>20 else np.nan)
                d['yrs_pos']=int((ys>0).sum()); d['yrs']=int(ys.notna().sum()); d['yr_sh']=' '.join(f"{int(y)%100}:{v:+.1f}" for y,v in ys.items())
            rows.append(d)
R=pd.DataFrame(rows); R.to_csv('results_fullsample.csv',index=False)
pd.set_option('display.width',250); pd.set_option('display.max_columns',40)
print(R[R.slip==1][['name','ntr','win','exp_pts','pf','sharpe','nwt','sr_lo','sr_hi','ann_rom','mdd_rom','dsr','yrs_pos','yrs']].round(3).to_string())
print(R[R.slip!=1].pivot(index='name',columns='slip',values='sharpe').round(2))
print(R[R.slip==1][['name','yr_sh']].to_string())
# benchmark
pb=pct(bench); print('BH sharpe',sharpe(pb),nw_t(pb), 'ann rom',(bench/(MARG*price)).mean()*252)
# ---------- walk-forward
def wf(fam,slip=1,min_train=24,block=6,cands=None):
    vs=cands or FAMV[fam]
    X=pd.DataFrame({n:pct(RES[(n,slip)][0]) for n in vs}); 
    first=X.index[0]+pd.DateOffset(months=min_train)
    starts=pd.date_range(first,days[-1],freq=f'{block}MS')
    out=pd.Series(0.0,index=days); chosen=[]; trs=[]
    # first valid for basis starts later
    for i,s in enumerate(starts):
        e=starts[i+1] if i+1<len(starts) else days[-1]+pd.Timedelta(days=1)
        tr=X[(X.index<s)]
        if fam=='S4': tr=tr[tr.index>='2020-05-11']
        sh={n:sharpe(tr[n]) for n in vs}; best=max(sh,key=sh.get)
        if sh[best]<=0: chosen.append((s,'FLAT',sh[best])); continue
        m=(X.index>=s)&(X.index<e); out[m]=X.loc[m,best]; chosen.append((s,best,sh[best]))
        t=RES[(best,slip)][1]
        if len(t): trs.append(t[(t.date>=s)&(t.date<e)])
    oos_start=starts[0]
    return out[out.index>=oos_start],pd.concat(trs) if trs else pd.DataFrame(columns=['pnl_pts']),chosen
WF=[]
allp={}
for fam in FAMV:
    for sl in (1,2):
        o,t,ch=wf(fam,sl)
        if fam=='S4': o=o[o.index>='2022-05-01']
        pr=price.loc[o.index]
        p=o.values
        d=dict(fam=fam,slip=sl,days=len(o),ntr=len(t),oos_from=str(o.index[0].date()),sharpe=sharpe(p),nwt=nw_t(p),mdd_rom=maxdd(p/MARG),ann_rom=p.mean()*252/MARG)
        if len(t): 
            w=t.pnl_pts; d.update(win=(w>0).mean(),exp_pts=w.mean(),exp_vnd=w.mean()*MULT,pf=w[w>0].sum()/-w[w<=0].sum())
        d['dsr'],d['sr0']=dsr(p,N,srvar)
        if sl==1: ci,_=boot(p); d['sr_lo'],d['sr_hi']=ci; allp[fam]=o
        d['choices']=';'.join(f"{s.strftime('%y%m')}:{n.split('_',1)[-1] if n!='FLAT' else 'FLAT'}" for s,n,_ in ch)
        WF.append(d)
W=pd.DataFrame(WF); W.to_csv('results_walkforward.csv',index=False)
print(W.drop(columns='choices').round(3).to_string())
for f in FAMV: print(f,W[(W.fam==f)&(W.slip==1)].choices.values[0])
# OOS yearly
for f,o in allp.items(): print(f,' '.join(f"{y}:{sharpe(g):+.1f}" for y,g in o.groupby(o.index.year) if len(g)>20))
pickle.dump(allp,open('data/wf_series.pkl','wb'))
