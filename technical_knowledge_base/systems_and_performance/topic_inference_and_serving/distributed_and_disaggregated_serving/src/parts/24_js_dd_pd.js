// ---- Reading: one new prompt arriving at two busy H200s, colocated against disaggregated (window.DDC.pdanim, from the planner's step()) ----
(function(){
  const card=document.getElementById('dd-pdan-card');if(!card||!window.DDC)return;
  const A=window.DDC.pdanim,svgEl=document.getElementById('dd-pdan-svg'),cap=document.getElementById('dd-pdan-cap'),cnt=document.getElementById('dd-pdan-cnt');
  let mode='co';const ARR=100,TMAX=760,NS=20;
  const fmt=(x,d)=>(+x).toLocaleString('en-GB',{maximumFractionDigits:d==null?0:d});
  // build each GPU's list of blocks [t0,t1,kind] up to TMAX; kind: dec, mix, pre, xfer
  function build(){
    const g=[[],[]];let ttft=0,gap=0,tpot=0;
    const fill=(lane,t0,dt,kind)=>{let t=t0;while(t<TMAX){g[lane].push([t,t+dt,kind]);t+=dt}};
    if(mode==='pd'){
      g[0].push([ARR,ARR+A.pd_pre,'pre']);g[0].push([ARR+A.pd_pre,ARR+A.pd_pre+A.xfer_ms,'xfer']);
      fill(1,0,A.pd_dec,'dec');ttft=A.pd_pre;gap=A.pd_dec;tpot=A.pd_dec;
    }else{
      const mix=mode==='co'?A.co_mix:A.co_mix512,nmix=mode==='co'?1:4;
      let t=0;while(t+A.co_dec<=ARR){g[0].push([t,t+A.co_dec,'dec']);t+=A.co_dec}
      g[0].push([t,t+A.co_dec,'dec']);t+=A.co_dec;const start=t;
      for(let k=0;k<nmix;k++){g[0].push([t,t+mix,'mix']);t+=mix}
      ttft=t-ARR;while(t<TMAX){g[0].push([t,t+A.co_dec,'dec']);t+=A.co_dec}
      fill(1,0,A.co_dec,'dec');gap=mix;tpot=A.co_dec;void start;
    }
    return {g,ttft,gap,tpot};
  }
  const CAP={co:['Colocated, token budget 8,192 (vLLM’s default on an H200)','Each GPU decodes 32 users every '+fmt(A.co_dec,1)+' ms. At 100 ms a 2,000-token prompt arrives at GPU A. The whole prompt fits in one step’s token budget, so that step takes '+fmt(A.co_mix)+' ms: GPU A’s 32 users get no token for '+fmt(A.co_mix)+' ms.'],
    c512:['Colocated, token budget 512 (chunked prefill turned down)','The same prompt is cut into four chunks of 512 tokens, one per step. Each step now takes '+fmt(A.co_mix512)+' ms, so the 32 users see four shorter stalls instead of one long one, and the new request waits a little longer for its first token.'],
    pd:['Disaggregated: GPU A only prefills, GPU B only decodes','GPU B carries all 64 users at '+fmt(A.pd_dec,1)+' ms per token and never pauses. GPU A computes the prompt in '+fmt(A.pd_pre)+' ms, then sends 625 MiB of KV cache over a 400 Gb/s link in '+fmt(A.xfer_ms)+' ms. Between prompts GPU A has nothing to do.']};
  function draw(i){
    const b0=build(),W=RD.width(svgEl),lab=Math.min(58,W*0.15),H=2*34+40,now=TMAX*i/(NS-1);
    const x=t=>lab+(W-lab-6)*Math.min(t,TMAX)/TMAX;
    const col={dec:'var(--c1)',mix:'var(--c2)',pre:'var(--c2)',xfer:'var(--c4)'};
    let b='';
    ['GPU A','GPU B'].forEach((nm,l)=>{const y=8+l*34;b+=RD.t(2,y+16,nm,{fs:11,fill:'var(--mute)'});
      b+='<rect x="'+lab+'" y="'+y+'" width="'+(W-lab-6)+'" height="22" fill="var(--soft)" stroke="var(--line)"/>';
      b0.g[l].forEach((s,q)=>{const t1=Math.min(s[1],now);if(t1<=s[0])return;
        b+='<rect x="'+x(s[0])+'" y="'+(y+1)+'" width="'+Math.max(0.6,x(t1)-x(s[0])-(s[2]==='dec'?0.8:0))+'" height="20" fill="'+col[s[2]]+'" opacity="'+(s[2]==='dec'?(q%2?0.55:0.8):0.9)+'"/>'})});
    const ya=8+2*34+2;
    if(now>=ARR)b+='<path d="M'+x(ARR)+' 2 L'+x(ARR)+' '+ya+'" stroke="var(--bad)" stroke-width="1.5" stroke-dasharray="3 2"/>'+RD.t(x(ARR)+3,ya+12,'prompt arrives',{fs:10,fill:'var(--bad)'});
    if(mode==='pd'&&now>=ARR+A.pd_pre){const xx=x(ARR+A.pd_pre+A.xfer_ms/2);b+='<path d="M'+xx+' '+(8+22)+' L'+xx+' '+(8+34)+'" stroke="var(--c4)" stroke-width="2.5" marker-end="url(#dd-ar)"/>'}
    for(let t=0;t<=TMAX;t+=(W<560?200:100))b+=RD.t(x(t),H-2,t+' ms',{a:'middle',fs:10,fill:'var(--mute)'});
    b+='<line x1="'+x(now)+'" x2="'+x(now)+'" y1="4" y2="'+(ya-2)+'" stroke="var(--ink)" stroke-width="1"/>';
    svgEl.innerHTML=RD.svg(W,H,'<defs><marker id="dd-ar" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--c4)"/></marker></defs>'+b,'Two GPUs over time, with a new prompt arriving');
    cap.innerHTML='<div class="t">'+CAP[mode][0]+'</div><p>'+CAP[mode][1]+'</p><p class="small">'+(now<ARR?'Steady state: every user gets a token each step.':now<ARR+b0.ttft?'The new request is being prefilled.':'The new request has its first token; decoding continues.')+' Time '+fmt(now)+' ms.</p>';
    cnt.innerHTML=RD.stat('New request: time to first token',fmt(b0.ttft)+' ms',mode==='pd'?'prefill only; the cache then moves in '+fmt(A.xfer_ms)+' ms':'queued behind one decode step, then prefilled')+
      RD.stat('Longest pause for a running user',fmt(b0.gap)+' ms',mode==='pd'?'no pause: one decode step':'GPU A’s 32 users')+
      RD.stat('Normal time per token',fmt(b0.tpot,1)+' ms',mode==='pd'?'64 users on one GPU':'32 users per GPU')+
      RD.stat('Busy GPU-time in this window',fmt(100*b0.g.reduce((a,l)=>a+l.reduce((s,q)=>s+Math.max(0,Math.min(q[1],TMAX)-q[0]),0),0)/(2*TMAX))+'%','of the two GPUs');
  }
  const An=RD.anim({card:'dd-pdan-card',ctl:'dd-pdan-ctl',n:NS,draw,ms:550,label:'Time'});
  RD.seg(document.getElementById('dd-pdan-mode'),m=>{mode=m;An.reset(NS);An.play()});
  RD.onResize(()=>An.redraw());
})();
