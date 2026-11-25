import pickle,warnings;warnings.filterwarnings('ignore')
from strats import *
day,O,H,L,C=build(); price=day.open; days=day.index
out=open('extra2_out.txt','w')
def P(*a): print(*a); print(*a,file=out)
rows=[]
for N,stp in[(15,'opp'),(30,'opp')]:
    t=s2(day,O,H,L,C,N,stp,1); t.to_csv(f'trades_ORB{N}_{stp}_slip1.csv',index=False)
    s=t.groupby('date').pnl_pts.sum().reindex(days).fillna(0); p=(s/price).values
    tt=t.sort_values('pnl_pts'); trim=t.drop(tt.tail(10).index)  # drop top-10 winners
    st_=trim.groupby('date').pnl_pts.sum().reindex(days).fillna(0)
    rec=s[s.index>='2023-01-01']; rp=(rec/price[rec.index]).values
    cum=s.cumsum(); dd=(cum-cum.cummax()).min()
    P(N,stp,'trim top10 winners: sharpe',sharpe((st_/price).values),'exp',trim.pnl_pts.mean(),'| 2023+ sharpe',sharpe(rp),'nwt',nw_t(rp),'ci',boot(rp)[0],'exp',t[pd.to_datetime(t.date)>='2023-01-01'].pnl_pts.mean(),
      '| maxDD pts',dd,'VND',dd*MULT,'| daily pnl pts sd',s.std(),'p1',s.quantile(.01),'| total pts',s.sum(),'| avg hold trade n/day',len(t)/len(days), 'top10 share of total',tt.tail(10).pnl_pts.sum()/t.pnl_pts.sum())
    P(' 2018-22 sharpe',sharpe((s[s.index<'2023-01-01']/price[s.index<'2023-01-01']).values),'2023+ ',sharpe(rp))
# long-only version & a short-only
