import sys,warnings,json;warnings.filterwarnings('ignore')
from strats import *
day,O,H,L,C=build(); price=day.open; days=day.index
day.to_csv('data/vn30f/daily_built.csv')
B=basis_panel(day,C)
def intraday_series(tr):
    s=pd.Series(0.0,index=days)
    if len(tr): s=s.add(tr.groupby('date').pnl_pts.sum(),fill_value=0)
    return s
FAM={}  # family -> {variant: fn(slip)->(series,trades)}
def reg(fam,name,fn): FAM.setdefault(fam,{})[name]=fn
for v,lab in [('A','S1A_first30_rest(open-based)'),('B','S1B_first30incl_overnight_rest'),('C','S1C_first30_last30'),('D','S1D_first30incl_overnight_last30')]:
    reg('S1',lab,lambda sl,v=v:(lambda t:(intraday_series(t),t))(s1(day,O,C,v,sl)))
for N in(15,30):
    for stp in('mid','opp'):
        reg('S2',f'S2_ORB{N}_{stp}',lambda sl,N=N,stp=stp:(lambda t:(intraday_series(t),t))(s2(day,O,H,L,C,N,stp,sl)))
for k in(0.5,1.0):
    for m in('fade','cont'):
        reg('S3',f'S3_gap{m}_k{k}',lambda sl,k=k,m=m:(lambda t:(intraday_series(t),t))(s3(day,O,C,k,m,sl)))
for z in(2.0,2.5):
    reg('S4',f'S4_basisOU_z{z}',lambda sl,z=z:(lambda t:(intraday_series(t),t))(s4_intraday(day,O,C,B,z,sl)))
def s4c(sl):
    pos=s4_conv(day,B,1.5,sl); return daily_engine(day,pos,sl),trades_daily(day,pos,sl)
reg('S4','S4_basis_convergence',s4c)
for kind,L_ in [('MA',0),('TS',21),('TS',63)]:
    for vt in(False,True):
        nm=f"S5_{kind}{L_ if kind=='TS' else '20_60'}_{'volT' if vt else 'unit'}"
        def f(sl,kind=kind,L_=L_,vt=vt):
            pos=s5_pos(day,kind,L_,vt); return daily_engine(day,pos,sl),trades_daily(day,pos,sl)
        reg('S5',nm,f)
# benchmark long-only
bpos=pd.Series(1.0,index=days); bench=daily_engine(day,bpos,1)
RES={}
for fam,vs in FAM.items():
    for nm,fn in vs.items():
        for sl in(0,1,2):
            s,t=fn(sl); RES[(nm,sl)]=(s,t)
        print(nm,flush=True)
import pickle;pickle.dump((RES,bench,{f:list(v) for f,v in FAM.items()}),open('data/res.pkl','wb'))
