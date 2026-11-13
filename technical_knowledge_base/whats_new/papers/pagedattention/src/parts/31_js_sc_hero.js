// ---- Scene (top of the paper tab, 2026-11-13 layout rollout): the paper's measured waste, drawn to scale (renderer v2).
// The same 12 GB of KV cache (Table 1: OPT-13B on one A100-40GB, 15,728 slots of 800 KiB) four times, one floor per system of the
// paper's evaluation (Orca Max, Pow2, Oracle; vLLM), one row per 2,048 slots (OPT's longest sequence). What stands on each floor is one
// iteration of this page's simulator (SIM.run, ShareGPT lengths from Figure 11, seed 1, iteration 3,000, after the warm-up): raised
// slots hold a token, pale raised slots are reserved for tokens still to come, the red floor is reserved past the request's real end
// (internal fragmentation), grey is the buddy allocator's rounding. Each dot stream is one running sequence writing one token's keys and
// values in that iteration. The percentages in the step list are Figure 2's and the simulator's averages; the bars, Figure 13a's batch sizes. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.S3||typeof SIM==='undefined')return;const {at,lerp,mix}=S3;
  const TB=PAPER.tables,SC=PAPER.simchk,SL=15728,ROW=2048,NR=Math.ceil(SL/ROW),BLK=16,AT=3000;
  const SYS=[{k:'max',n:'Orca (Max)'},{k:'pow2',n:'Orca (Pow2)'},{k:'oracle',n:'Orca (Oracle)'},{k:'vllm',n:'vLLM'}];
  const XW=6,SX=XW/ROW,RP=.34,DEP=NR*RP,CXS=[-3.9,3.9],CZS=[-1.95,1.95];
  const cxOf=i=>CXS[i%2],czOf=i=>CZS[i>>1];
  const slotPos=(i,x,y)=>{const r=Math.floor(x/ROW),c=x%ROW;return [cxOf(i)-XW/2+(c+.5)*SX,y,czOf(i)-DEP/2+(r+.5)*RP]};
  const pow2=SIM.pow2;
  // one iteration of the simulator per system, classified slot by slot: 0 free, 1 token, 2 reserved, 3 internal, 4 rounding
  let D=null;
  function data(){if(D)return D;D=SYS.map((s,si)=>{const r=SIM.run({system:s.k,data:'sharegpt',steps:AT+1,snapAt:AT,seed:1}),S=r.snap;
    const kind=new Uint8Array(SL),hl=new Uint8Array(SL),heads=[];const pick=S.run.length?S.run[S.run.length>>1].id:-1;
    S.run.forEach(q=>q.outs.forEach((o,i)=>{if(q.done[i])return;const F=q.p+o,st=q.st[i];
      if(s.k==='vllm'){const L=q.sb.concat(q.pb[i]);L.forEach((b,j)=>{for(let u=0;u<BLK;u++){const pos=j*BLK+u,x=b*BLK+u;kind[x]=pos<st?1:pos<F?2:3;if(q.id===pick)hl[x]=1}});
        const pos=st-1;heads.push(L[Math.min(L.length-1,Math.floor(pos/BLK))]*BLK+pos%BLK)}
      else{const R=q.R[i],A=pow2(R),off=q.off[i];for(let u=0;u<A;u++){const x=off+u;kind[x]=u<st?1:u<Math.min(R,F)?2:u<R?3:4}heads.push(off+st-1)}}));
    // runs of one kind along each row, so a floor is a few dozen boxes, not 15,728
    const runs=[];for(let r=0;r<NR;r++){const a=r*ROW,b=Math.min(SL,a+ROW);let x=a;while(x<b){const k=kind[x],h=hl[x];let y=x+1;while(y<b&&kind[y]===k&&hl[y]===h)y++;if(k)runs.push({x,n:y-x,k,h});x=y}}
    const c=[0,0,0,0,0];kind.forEach(k=>c[k]++);
    return {runs,heads,run:S.run.length,pct:c.map(v=>100*v/SL),blocks:s.k==='vllm'?Math.floor(SL/BLK):0}});
    return D}
  window.__heroSnap=()=>data().map(d=>({run:d.run,pct:d.pct}));
  let CP=null,CC=null;
  function cols(P){if(CP===P)return CC;const s=getComputedStyle(document.body),v=n=>S3.rgb(s.getPropertyValue(n).trim()||'#888');CP=P;
    return CC={tok:mix(P.paper,P.good,.62),res:P.c5,frag:v('--frag'),round:mix(P.mute,P.paper,.35)}}
  const H=.16,HF=.025;
  function floor(R,i,d,a,show,P,C){const cx=cxOf(i),cz=czOf(i);
    for(let r=0;r<NR;r++){const n=Math.min(ROW,SL-r*ROW);R.box([cx-XW/2+n*SX/2,0,cz-DEP/2+(r+.5)*RP],[n*SX,.012,RP*.82],{a:a*.9,shadow:false,lw:.5,ea:.45})}
    if(!show||!d)return;
    d.runs.forEach(u=>{const p=slotPos(i,u.x,.012),w=u.n*SX,c=[p[0]-SX/2+w/2,.012,p[2]],sz=[w,u.k<=2?H:HF,RP*.72];
      if(u.h){R.box(c,[w,H+.04,RP*.72],{fill:P.acc,a:a*show,shadow:false,lw:.5});return}
      if(u.k===1)R.box(c,sz,{fill:C.tok,a:a*show,shadow:false,lw:.5});
      else if(u.k===2)R.box(c,sz,{fill:mix(P.paper,C.res,.35),fa:.45,ec:C.res,a:a*show,shadow:false,lw:.6});
      else if(u.k===3)R.box(c,sz,{fill:C.frag,a:a*show,shadow:false,lw:.4,ea:.3});
      else R.box(c,sz,{fill:C.round,a:a*show,shadow:false,lw:.4,ea:.3})})}
  const f1=v=>v.toFixed(1)+'%';
  function draw(R,k,e){const P=R.P,C=cols(P),DD=data();R.grid(-7.4,7.4,-4,4,.5);
    SYS.forEach((s,i)=>{const d=DD[i],cx=cxOf(i),cz=czOf(i),foc=k===i+1,seen=k>i+1||k===5;
      const a=k===0?1:foc||k===5?1:.3,show=foc?e:seen?1:0;
      floor(R,i,d,a,show,P,C);
      // names only where they help: every floor in the overview and the bill, the one in focus in a close view
      if(k===0||k===5||foc)R.label([cx-XW/2,0,cz-DEP/2-.08],s.n,{fs:13.5,b:1,al:'left',dy:-8,c:foc?P.acc:P.ink});
      if(foc){
        // one dot stream per running sequence: this iteration's new token, from the model to the slot it fills
        const src=[cx,1.15,cz-DEP/2-.45];R.glass([cx-1.1,.85,cz-DEP/2-.45],[2.2,0,0],[0,.5,0],{c:P.c1,a:e,nu:6,nv:3});
        R.label([cx+1.15,1.1,cz-DEP/2-.45],'OPT-13B · one iteration',{mono:true,fs:12,al:'left',dx:6,c:P.c1,a:e,wide:1});
        const step=Math.max(1,Math.ceil(d.heads.length/40));
        d.heads.forEach((x,j)=>{if(j%step)return;R.flowArc(src,slotPos(i,x,H+.02),.25,{c:P.good,a:e*.85,r:.045,n:4,speed:1.3})})}
      // the bill: requests per batch (Figure 13a) as a bar on a white plinth just right of each floor
      if(k===5){const v=TB.fig13.ShareGPT[s.n],h=v/30.42*1.9*e,bx=cx+XW/2+.5,bz=cz;
        R.box([bx,0,bz],[.7,.05,.5],{a:1,shadow:true});R.box([bx,.05,bz],[.42,Math.max(.01,h),.3],{fill:s.k==='vllm'?P.acc:mix(P.paper,P.c2,.55),shadow:false});
        R.label([bx,.05+h,bz],v.toFixed(2),{mono:true,fs:13,b:1,dy:-10,c:s.k==='vllm'?P.acc:P.ink,a:e})}});
    if(k===5)R.label([0,1.9,-3.9],'requests per batch, Figure 13a',{mono:true,fs:12,c:P.mute,a:e});
    if(k===0){R.label([cxOf(2)-XW/2,0,czOf(2)+DEP/2],'15,728 slots · 12 GB · a row is 2,048 slots',{mono:true,fs:12,al:'left',dy:16,c:P.mute,a:e})}}
  const full={cam:[.18,.92],bounds:[[-7.2,0,-3.9],[7.4,1.2,3.6]]};
  const close=i=>({cam:[.22,.78],bounds:[[cxOf(i)-XW/2-.2,0,czOf(i)-DEP/2-.7],[cxOf(i)+XW/2+.3,1.3,czOf(i)+DEP/2+.5]]});
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · the paper\'s KV cache waste, to scale',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1500,hold:5600,draw,
    margin:w=>w<520?[16,8,20,8]:[22,14,22,14],
    view:k=>k>=1&&k<=4?close(k-1):k===5?{cam:[.25,.8],bounds:[[-7.2,0,-4.2],[7.6,2.1,3.6]]}:full,
    // the selected floor's own shares in this iteration, as a live line under the step list
    onStep:k=>{const x=document.getElementById('heroLive');if(!x)return;if(k<1||k>4){x.textContent='';return}const s=SYS[k-1],q=data()[k-1];
      x.textContent=s.n+', the iteration drawn: '+q.run+' requests running; '+f1(q.pct[1])+' of slots hold tokens, '+f1(q.pct[2])+' reserved'+(s.k==='vllm'?'':', '+f1(q.pct[3])+' never used, '+f1(q.pct[4])+' buddy rounding')+'.'}});
})();
