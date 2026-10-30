// Screen geometry only; keeps score callouts apart even when several values are zero.
export function factorRadarLabels(scores: (number|null)[], cx:number,cy:number,radius:number) {
  const labels=scores.flatMap((score,index)=>{
    if(score==null)return [];
    const angle=-Math.PI/2+2*Math.PI*index/scores.length;
    const r=radius*score/100, labelRadius=Math.max(radius*.52,r+(score>=80?-18:18));
    return [{index,pointX:cx+Math.cos(angle)*r,pointY:cy+Math.sin(angle)*r,x:cx+Math.cos(angle)*labelRadius,y:cy+Math.sin(angle)*labelRadius}];
  });
  for(let pass=0;pass<36;pass++) {
    let moved=false;
    for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++) {
      const a=labels[i],b=labels[j],dx=Math.abs(a.x-b.x),dy=Math.abs(a.y-b.y);
      if(dx<58&&dy<27){const direction=a.y<b.y?-1:1,push=(27-dy)/2+.1;a.y+=direction*push;b.y-=direction*push;moved=true;}
    }
    if(!moved)break;
  }
  return labels;
}
