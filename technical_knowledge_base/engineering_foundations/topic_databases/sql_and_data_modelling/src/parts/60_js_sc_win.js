// ---- Scene, Fig. 4 (section 4): a window function's frame sliding over the ordered rows of chat 11 (renderer v2) ----
// Back row: the 16 real messages of chat 11 in id order (height = tokens). The frame is a glass box over the rows the function sees for the
// current row; its result stands in the front row. Each function is one step, and during its step the current row sweeps from the first
// row to the last (under reduced motion the step shows its end state). Values computed here; src/check_page.mjs compares them with recompute.py.
(function(){
  if(!document.getElementById('stg-win')||!window.SM_DATA)return;const {at,off,lerp,mix,cl}=S3;
  const D=window.SM_DATA,R=D.msgs.filter(m=>m[1]===11).sort((a,b)=>a[0]-b[0]).map(m=>({id:m[0],role:m[2]?'assistant':'user',tok:m[4]}));
  const n=R.length,mx=Math.max(...R.map(r=>r.tok));
  const F={
    sum:{frame:i=>[0,i],val:i=>R.slice(0,i+1).reduce((s,r)=>s+r.tok,0)},
    avg3:{frame:i=>[Math.max(0,i-2),i],val:i=>{const s=R.slice(Math.max(0,i-2),i+1);return Math.round(s.reduce((a,r)=>a+r.tok,0)/s.length*10)/10}},
    lag:{frame:i=>i>0?[i-1,i-1]:null,val:i=>i>0?R[i-1].tok:null},
    rank:{frame:null,val:i=>1+R.filter(r=>r.tok>R[i].tok).length},
    last:{frame:i=>[0,i],val:i=>R[i].tok},
    lastall:{frame:()=>[0,n-1],val:()=>R[n-1].tok}};
  const KEYS=[null,'sum','avg3','lag','rank','last','lastall'];
  window.RD_WIN={ids:R.map(r=>r.id),vals:Object.fromEntries(Object.keys(F).map(k=>[k,R.map((r,i)=>F[k].val(i))]))}; // for src/check_page.mjs
  const x=i=>-3.75+i*.5,ZI=-.6,ZO=1.0,HI=1.0,sumMax=F.sum.val(n-1);
  const hv=(fk,v)=>v==null?0:fk==='sum'?v/sumMax*1.25:fk==='rank'?.08:v/mx*HI;
  function draw(Rr,k,e){const P=Rr.P,fk=KEYS[k],fn=fk&&F[fk];Rr.grid(-4.6,4.6,-1.6,2,.5);
    const cur=k===0?-1:Math.min(n-1,Math.floor(e*n)),fr=fn&&fn.frame&&cur>=0?fn.frame(cur):null;
    // the input rows; under RANK the rows that sort before the current one are lit
    R.forEach((r,i)=>{const inF=fr&&i>=fr[0]&&i<=fr[1],before=fk==='rank'&&cur>=0&&r.tok>R[cur].tok;
      Rr.box([x(i),0,ZI],[.32,Math.max(.02,r.tok/mx*HI),.32],{fill:inF||before?mix(P.paper,P.acc,.55):mix(P.paper,r.role==='user'?P.c1:P.c4,.3),shadow:false,lw:.6,a:k===0?cl(e*2.5,0,1):1});
      if(k===0&&i%2===0)Rr.label([x(i),r.tok/mx*HI,ZI],String(r.tok),{fs:12,dy:-9,c:P.mute,wide:1,a:cl(e*2.5,0,1)})});
    Rr.label([x(0)-.3,0,ZI],'chat 11 · ORDER BY id',{fs:12.5,b:1,al:'right',dx:-4,c:P.mute,wide:1});
    if(!fn)return;
    // the frame: a glass box over the rows the function sees for the current row
    if(fr){const x0=x(fr[0])-.24,x1=x(fr[1])+.24;Rr.glass([x0,0,ZI+.25],[x1-x0,0,0],[0,HI+.15,0],{c:P.acc,nu:Math.max(1,fr[1]-fr[0]+1),nv:1,a:.7})}
    // the results so far, in the front row; the current one is lit and fed by flows from its frame
    for(let i=0;i<=cur;i++){const v=fn.val(i),hh=hv(fk,v),on=i===cur;
      if(v==null){Rr.label([x(i),0,ZO],'NULL',{fs:12,mono:true,c:P.mute,a:on?1:.7,wide:!on});continue}
      Rr.box([x(i),0,ZO],[.32,Math.max(.03,hh),.32],{fill:on?mix(P.paper,P.c5,.75):mix(P.paper,P.c5,.35),lw:.6,shadow:false});
      if(on||i===0||fk==='rank')Rr.label([x(i),Math.max(.03,hh),ZO],String(v),{fs:on?13:12,mono:true,b:on,dy:-10,c:on?P.ink:P.mute,wide:!on})}
    if(cur>=0){Rr.glow([x(cur),.05,ZO],.35,{c:P.c5,a:.6});
      if(fr)for(let j=fr[0];j<=fr[1];j++)Rr.flowArc([x(j),R[j].tok/mx*HI,ZI],[x(cur),hv(fk,fn.val(cur))+.05,ZO],.3,{c:P.acc,a:.75,r:.04,n:4,speed:1.6});
      if(fk==='rank')R.forEach((r,j)=>{if(r.tok>R[cur].tok)Rr.flowArc([x(j),r.tok/mx*HI,ZI],[x(cur),.1,ZO],.3,{c:P.acc,a:.55,r:.035,n:3,speed:1.6})})}
    Rr.label([x(n-1)+.3,0,ZO],'result',{fs:12.5,b:1,al:'left',dx:4,c:P.c5,wide:1})}
  S3.stage({id:'stg-win',list:'sx-win',fig:'Fig. 4 · the frame slides over chat 11',cam:[.12,.68],bounds:[[-4.3,0,-1],[4.3,1.1,1.4]],aspect:.42,dur:4200,hold:3200,draw,
    margin:w=>w<520?[16,8,12,8]:[20,70,14,120],
    view:null});
})();
