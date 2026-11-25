import pickle,warnings;warnings.filterwarnings('ignore')
from strats import *
from scipy import stats as st
day,O,H,L,C=build(); price=day.open; days=day.index
RES,bench,FAMV=pickle.load(open('data/res.pkl','rb'))
out=open('extra_out.txt','w')
def P(*a): print(*a); print(*a,file=out)
# --- ORB latency / robustness
P('== ORB latency (extra 5-min bars delay), slip=1')
rows=[]
for N,stp in [(15,'opp'),(30,'opp'),(15,'mid'),(30,'mid')]:
    for lat in(0,1,2):
        t=s2(day,O,H,L,C,N,stp,1,lat); s=t.groupby('date').pnl_pts.sum().reindex(days).fillna(0); p=(s/price).values
        rows.append(dict(N=N,stop=stp,lat_min=lat*5,n=len(t),sharpe=sharpe(p),nwt=nw_t(p),exp=t.pnl_pts.mean(),ann_rom=(s/(MARG*price)).mean()*252))
L1=pd.DataFrame(rows); P(L1.round(3).to_string()); L1.to_csv('results_orb_latency.csv',index=False)
# --- ORB decomposition
t=s2(day,O,H,L,C,30,'opp',1); t['year']=pd.to_datetime(t.date).dt.year
P('== ORB30_opp long/short'); P(t.groupby('dir').agg(n=('pnl_pts','size'),win=('pnl_pts',lambda x:(x>0).mean()),exp=('pnl_pts','mean'),tot=('pnl_pts','sum')).round(3))
P(t.groupby('year').agg(n=('pnl_pts','size'),win=('pnl_pts',lambda x:(x>0).mean()),exp=('pnl_pts','mean'),pf=('pnl_pts',lambda x:x[x>0].sum()/-x[x<=0].sum())).round(3))
s=t.groupby('date').pnl_pts.sum().reindex(days).fillna(0); pc=(s/price)
bh=(day.ret/day.ref).fillna(0)
import numpy.linalg as la
X=np.c_[np.ones(len(bh)),bh.values]; b=la.lstsq(X,pc.values,rcond=None)[0]; res=pc.values-X@b
P('alpha daily %',b[0]*100,'beta',b[1],'alpha t (NW-ish naive)',b[0]/(res.std()/np.sqrt(len(res))))
P('corr ORB30opp vs S1A',np.corrcoef(pc,RES[('S1A_first30_rest(open-based)',1)][0]/price)[0,1])
# worst trade, MAE
wt=t.sort_values('pnl_pts').head(5)[['date','dir','entry','exit','pnl_pts']]; P(wt)
P('ORB worst trade pts',t.pnl_pts.min(),'as % of entry',(t.pnl_pts/t.entry).min()*100, 'p1',t.pnl_pts.quantile(.01))
# MAE intraday of ORB: compute adverse excursion using 5m H/L after entry
# limit days
big=day[(day.ret/day.ref).abs()>=0.06]; P('days |ret|>=6% :',len(big),big.index.strftime('%y%m%d').tolist())
r=(day.ret/day.ref); P('worst day',r.min(),'best',r.max(),'days<-5%',(r<-.05).sum(),'days>5%',(r>.05).sum())
# overnight vs intraday decomposition
ov=(day.gap/day.ref).dropna(); it=(day.intra/day.open).dropna()
P('overnight mean bp/day',ov.mean()*1e4,'t',st.ttest_1samp(ov,0).statistic,' intraday(open->14:30) mean bp',it.mean()*1e4,'t',st.ttest_1samp(it,0).statistic)
# --- S6 seasonality
P('== time-of-day: mean bar return (c/o-1 per 5m bar), bp, t, BH-adjusted p')
rows=[]
for lab in LAB:
    x=(C[lab]/O[lab]-1).dropna()*1e4; tt=st.ttest_1samp(x,0); rows.append(dict(bar=lab,n=len(x),mean_bp=x.mean(),t=tt.statistic,p=tt.pvalue,var_bp=x.std()))
TD=pd.DataFrame(rows)
def bh(p):
    p=np.asarray(p);o=np.argsort(p);q=np.empty(len(p));m=len(p);r=p[o]*m/(np.arange(m)+1);r=np.minimum.accumulate(r[::-1])[::-1];q[o]=np.minimum(r,1);return q
TD['q_bh']=bh(TD.p); TD.to_csv('results_seasonality_tod.csv',index=False)
P(TD.sort_values('p').head(8).round(3).to_string()); P('bars with q<0.1:',int((TD.q_bh<.1).sum()),'of',len(TD))
# 30-min block returns and autocorr of first30 vs later blocks
blocks={'09:00-09:30':('09:00','09:25'),'09:30-11:30':('09:30','11:25'),'13:00-14:00':('13:00','13:55'),'14:00-14:30':('14:00','14:25')}
rows=[]
for k,(a,b2) in blocks.items():
    x=(C[b2]/O[a]-1)*1e4; rows.append(dict(block=k,mean_bp=x.mean(),t=st.ttest_1samp(x.dropna(),0).statistic,sd_bp=x.std()))
P(pd.DataFrame(rows).round(2).to_string())
f30=(C['09:25']/O['09:00']-1); rest=(C[EX]/O['09:30']-1); l30=(C[EX]/O['14:00']-1)
P('corr first30 vs rest',f30.corr(rest),'vs last30',f30.corr(l30),' (spearman rest)',st.spearmanr(f30.dropna(),rest[f30.notna()].fillna(0))[0])
# DOW & expiry week
dd=pd.DataFrame({'ret':(day.ret/day.ref),'ov':day.gap/day.ref,'it':day.intra/day.open,'dow':day.dow}).dropna()
rows=[]
for d in range(5):
    for c in('ret','ov','it'):
        x=dd.loc[dd.dow==d,c]*1e4; tt=st.ttest_1samp(x,0); rows.append(dict(dow=['Mon','Tue','Wed','Thu','Fri'][d],comp=c,n=len(x),mean_bp=x.mean(),t=tt.statistic,p=tt.pvalue))
DW=pd.DataFrame(rows); DW['q_bh']=bh(DW.p); DW.to_csv('results_seasonality_dow.csv',index=False); P(DW.round(3).to_string())
# days to expiry
idx=list(days); ex=[i for i,d in enumerate(idx) if day.expiry[d]]
dte=pd.Series(np.nan,index=days)
for a,b in zip([-1]+ex[:-1],ex): 
    for j in range(a+1,b+1): dte.iloc[j]=b-j
dd['dte']=dte; rows=[]
for k in list(range(0,6)):
    x=dd.loc[dd.dte==k]; 
    for c in('ret','ov','it'):
        tt=st.ttest_1samp(x[c]*1e4,0); rows.append(dict(dte=k,comp=c,n=len(x),mean_bp=x[c].mean()*1e4,t=tt.statistic,p=tt.pvalue))
x=dd.loc[(dd.dte>5)]; 
for c in('ret','ov','it'): rows.append(dict(dte='>5',comp=c,n=len(x),mean_bp=x[c].mean()*1e4,t=st.ttest_1samp(x[c]*1e4,0).statistic,p=np.nan))
EW=pd.DataFrame(rows); EW.to_csv('results_seasonality_expiry.csv',index=False); P(EW.round(3).to_string())
# expiry-day abs return (vol)
P('abs ret bp: expiry day',(dd[dd.dte==0].ret.abs()*1e4).mean(),'other',(dd[dd.dte>0].ret.abs()*1e4).mean())
P('roll-day |gap| using F2 ref',day[day.roll].gap.abs().mean(),'(F1 prev would be',(day[day.roll].open-day[day.roll].pc).abs().mean(),') n roll',int(day.roll.sum()))
