// ---- Scene (Reading 1, Fig. 1): The Pile's 22 components as columns of their raw size, the hand weights drawing one training stream,
// the passes each weight implies stacked as layers, a close-up on Wikipedia, and natural shares for comparison. Every number is The Pile's Table 1 (window.MX2.pile). ----
(function(){
  if(!document.getElementById('stg-pile'))return;const {at,off,lerp,mix}=S3;
  const D=window.MX2,P0=D.pile,B=D.pile_totals.eff,TOT=D.pile_totals.raw;
  const bySize=P0.map((p,i)=>i).sort((a,b)=>P0[b].raw_gib-P0[a].raw_gib);
  const HS=2.5/P0[bySize[0]].raw_gib,XS=.95,FP=.64;
  const pos={};bySize.forEach((i,r)=>{const row=r<11?0:1,c=r%11;pos[i]=[(c-5)*XS,row?.55:-1.05]});
  const WI=P0.findIndex(p=>/^Wikipedia/.test(p.name)),PC=P0.findIndex(p=>p.name==='Pile-CC');
  const NAT=TOT?B/TOT:1;
  // the stream in front: one segment per pile, in Table 1 order, its length its share (hand weights, or natural shares at the last step)
  const SX0=-5.3,SX1=5.3,SZ=2.05;
  function segs(t){const w=P0.map(p=>lerp(p.weight_pct/100,p.raw_gib/TOT,t)),z=w.reduce((a,b)=>a+b,0);let x=SX0;return w.map(v=>{const L=(SX1-SX0)*v/z,s=[x,x+L];x+=L;return s})}
  const nm=p=>p.name.replace(' (en)','').replace(' (PG-19)','');
  function draw(R,k,e){const P=R.P;R.grid(-6,6,-2.2,3,.5);
    const natT=k===4?e:0,sg=segs(natT),focus=k===3;
    const colOf=i=>i===PC?P.c1:i===WI?P.c2:P.paper;
    P0.forEach((p,i)=>{const [x,z]=pos[i],h=p.raw_gib*HS,ep=k>=4?lerp(p.epochs,NAT,natT):p.epochs,la=at(k,e,2);
      const a=focus?(i===WI?1:.13):1,hl=i===PC||i===WI;
      // the pile itself (one pass)
      R.box([x,0,z],[FP,Math.max(.012,h),FP],{fill:hl&&k>=1?mix(P.paper,colOf(i),.35):P.paper,a,shadow:a>.5});
      // further passes stacked as layers, each the pile's own height (a fraction for the last partial pass)
      if(k>=2){let y=h,left=ep-1;while(left>1e-6){const f=Math.min(1,left),hh=Math.max(.008,h*f);R.box([x,y,z],[FP*.94,hh,FP*.94],{fill:mix(P.paper,colOf(i)===P.paper?P.c1:colOf(i),.45),a:a*la,shadow:false,lw:.7});y+=hh;left-=f}
        if(!focus&&R.W>=520)R.label([x,y,z],'×'+(Math.round(ep*100)/100).toString(),{mono:true,fs:12,dy:-9,c:hl?colOf(i):P.mute,a:la*(i===PC||i===WI||(p.raw_gib>40&&k<4)?1:0)})}
      // flows from the pile into its segment of the stream
      if(k>=1){const s=sg[i],to=[(s[0]+s[1])/2,.09,SZ],fa=(k===1?Math.min(1,e*1.6):1)*(focus?(i===WI?1:.12):.75);
        R.flowArc([x,Math.max(.05,h)*.6,z+FP/2],to,.25+.04*Math.abs(to[0]-x),{c:i===WI?P.c2:P.c1,a:fa,r:.035+.09*Math.sqrt(p.weight_pct/100),n:Math.max(2,Math.round(1+p.weight_pct*.35)),speed:1.1})}});
    // the stream
    if(k>=1){const a=k===1?e:1;sg.forEach((s,i)=>{const L=s[1]-s[0];if(L<.004)return;R.box([(s[0]+s[1])/2,0,SZ],[Math.max(.006,L-.02),.09,.5],{fill:i===PC?P.c1:i===WI?P.c2:mix(P.paper,P.c1,i%2?.12:.22),a:a*(focus&&i!==WI?.3:1),shadow:false,lw:.6})});
      if(!focus)R.label([(SX0+SX1)/2,0,SZ+.3],(k===4?'the same stream at natural shares · ':'training stream · ')+B.toLocaleString('en-GB',{minimumFractionDigits:2})+' GiB',{mono:true,fs:12,dy:16,c:P.mute})}
    // labels: the two piles the steps follow, and the row notes
    const [xp,zp]=pos[PC],[xw,zw]=pos[WI],hp=P0[PC].raw_gib*HS,hw=P0[WI].raw_gib*HS;
    R.label([xp,hp*(k>=4?lerp(1,NAT,natT):1)+.05,zp],'Pile-CC '+P0[PC].raw_gib+' GiB',{fs:12.5,b:1,dy:k>=2?-26:-12,c:P.c1,a:focus?.3:1});
    R.label([xw,hw*(k>=2?(k===4?lerp(P0[WI].epochs,NAT,natT):P0[WI].epochs):1),zw],'Wikipedia '+P0[WI].raw_gib+' GiB',{fs:12.5,b:1,dy:k>=2&&!focus?-28:-14,c:P.c2,a:focus?0:1});
    if(!focus){R.label([pos[bySize[0]][0]-.55,.3,-1.05],'11 largest',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,grp:'side'});
      R.label([pos[bySize[11]][0]-.55,.08,.55],'11 smallest',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,grp:'side'})}
    if(k===1||k===2){const s=sg[PC];R.label([(s[0]+s[1])/2,.1,SZ+.25],P0[PC].weight_pct.toFixed(2)+'%',{mono:true,fs:12,dy:12,c:P.c1})}
    if(k===4){const s=sg[PC];R.label([(s[0]+s[1])/2,.1,SZ+.25],(100*P0[PC].raw_gib/TOT).toFixed(1)+'%',{mono:true,fs:12,dy:12,c:P.c1,a:e})}
    if(focus){const s=sg[WI],top=hw*P0[WI].epochs;
      R.label([xw+FP/2,top,zw],P0[WI].weight_pct.toFixed(2)+'% × '+B.toLocaleString('en-GB',{minimumFractionDigits:2})+' = '+(P0[WI].weight_pct/100*B).toFixed(2)+' GiB',{al:'left',dx:10,dy:-10,mono:true,fs:12.5,c:P.ink,a:e});
      R.label([xw+FP/2,top,zw],'read ×'+P0[WI].epochs.toFixed(1),{al:'left',dx:10,dy:10,mono:true,fs:12.5,b:1,c:P.c2,a:e});
      R.label([xw+FP/2,top,zw],P0[WI].weight_pct.toFixed(2)+'% of the stream, from a '+P0[WI].raw_gib+' GiB pile',{al:'left',dx:10,dy:-30,mono:true,fs:12.5,c:P.c2,a:e})}
  }
  const full={cam:[.14,.5],bounds:[[-5.4,0,-1.4],[5.4,2.6,2.4]]};
  S3.stage({id:'stg-pile',list:'sx-pile',fig:'Fig. 1 · The Pile, Table 1',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:4600,draw,
    margin:w=>w<520?[16,10,14,10]:[18,14,16,120],
    view:k=>{if(k===4)return {cam:full.cam,bounds:[[-5.4,0,-1.4],[5.4,3.9,2.4]]};if(k!==3)return full;const [x,z]=pos[WI];return {cam:[.3,.45],bounds:[[x-2.2,0,z-1.7],[x+3.8,.7,z+1.5]]}}});
})();
