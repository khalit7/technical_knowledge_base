// ---- Scene, Fig. 2 (section 1, 2026-11-12): one training step's calls into PyTorch, by who makes them. Layers are glass plates
// (your script on top, the library's modules below it, PyTorch at the bottom with one socket per kind of call); every flow is a key call
// recorded in LIB.tr (the What calls what traces, src/exp/calls_trace.py), dropping from its caller's plate to its socket.
// Three modes (plain loop, HF Trainer matched, Lightning), each with its own step list; a step selects calls with a filter on the trace. ----
(function(){
  if(!document.getElementById('stg-step')||!window.S3||!window.LIB)return;const {mix}=S3;
  const TR=window.LIB.tr;
  const SOCK=[['seed','manual_seed',/manual_seed/],['data','DataLoader()',/DataLoader\.__init__/],['bwd','backward()',/Tensor\.backward$/],['clip','clip_grad_norm_',/clip_grad_norm_$/],
    ['step','Adam.step',/Adam\.step$/],['sched','LRScheduler.step',/LRScheduler\.step$/],['zero','zero_grad',/zero_grad$/],['item','.item()',/^Tensor\.item$/]];
  const slot=c=>SOCK.findIndex(s=>s[2].test(c));
  const SX=i=>-5.95+1.7*i;
  // layers per mode: [name, caller prefix, colour key]
  const LAY={plain:[['your script','you','c3']],hf:[['your script','you','c3'],['Trainer (transformers)','transformers','c5'],['Accelerate','accelerate','c4']],
    pl:[['your script','you','c3'],['Lightning','lightning','c6']]};
  const RUN={plain:'plain',hf:'hf',pl:'lightning'};
  const has=(e,re)=>re.test(e[3]),L=e=>e[0]==='loop',S=e=>e[0]==='setup';
  // the calls each step shows (a filter on the trace's key calls); 'open': a socket that glows as an open call
  const STEPS={
    plain:[e=>L(e)&&has(e,/backward$/),e=>L(e)&&has(e,/Adam\.step$/),e=>L(e)&&has(e,/zero_grad$|^Tensor\.item$/),e=>L(e)],
    hf:[e=>S(e),e=>L(e)&&has(e,/backward$/),e=>L(e)&&has(e,/clip_grad_norm_$/),e=>L(e)&&has(e,/Adam\.step$/),e=>L(e)&&has(e,/LRScheduler|zero_grad$|^Tensor\.item$/),e=>L(e)],
    pl:[e=>S(e),e=>L(e)&&has(e,/^Tensor\.item$/),e=>L(e)&&has(e,/zero_grad$/),e=>L(e)&&has(e,/backward$/),e=>L(e)&&has(e,/Adam\.step$/),e=>L(e)]};
  const OPEN={pl:[0,1,2,3]}; // Lightning: optimizer.step(closure) is open while the closure runs
  let mode='hf';
  const keys=m=>TR[RUN[m]].key.filter(e=>slot(e[3])>=0);
  const per=m=>{const r=TR[RUN[m]],o=r.tot.loop||{};return Math.round(Object.values(o).reduce((a,b)=>a+b,0)/r.steps)};
  function draw(R,k,e){const P=R.P,lay=LAY[mode],nl=lay.length,K=keys(mode),last=STEPS[mode].length-1;
    R.grid(-8,8,-2.2,2.2,.5);
    const yL=j=>4.2-j*(nl>1?2.6/(nl-1):0); // layer heights: your script at 4.2, the lowest library plate at 1.6
    R.glass([-7,0,-1],[14,0,0],[0,0,2],{c:P.acc,nu:14,nv:3});
    R.label([-7,0,0],'PyTorch',{al:'right',dx:-8,fs:13,b:1,c:P.acc,grp:'lay'});
    lay.forEach(([nm,pre,ck],j)=>{const y=yL(j);R.glass([-7,y,-1],[14,0,0],[0,0,2],{c:P[ck],nu:14,nv:3,a:.9});
      R.label([-7,y,0],nm,{al:'right',dx:-8,fs:13,b:1,c:P[ck],grp:'lay'})});
    const cur=K.filter(STEPS[mode][Math.min(k,last)]),act=new Set(cur.map(x=>slot(x[3])));
    const open=(OPEN[mode]||[]).includes(k);
    SOCK.forEach(([id,nm],i)=>{const on=act.has(i),fill=on?mix(P.paper,P.c2,.35):P.paper;
      R.box([SX(i),0,0],[1.3,.32,.9],{fill,a:on||k===last?1:.55});
      if(open&&id==='step'){R.glow([SX(i),.3,0],.9,{c:P.c2,a:.8})}
      const zoom=k!==last&&!(mode!=='plain'&&k===0);
      if(on?!(R.W<520&&k===last):(R.W>=520&&!zoom))R.label([SX(i),0,.45],nm,{mono:true,fs:12,dy:i%2?34:16,c:on?P.ink:P.mute,b:on})});
    // calls of earlier steps stay as thin lines; this step's calls flow
    const prev=K.filter(x=>STEPS[mode].slice(0,k).some(f=>f(x))&&!STEPS[mode][k](x));
    const pos=(x,j)=>{const i=slot(x[3]);const lj=Math.max(0,lay.findIndex(l=>x[1].startsWith(l[1]+'/')));return [lj,[SX(i)+(j%3-1)*.28,yL(lj),(j%2?.25:-.25)]]};
    prev.forEach((x,j)=>{const [lj,a]=pos(x,j);R.line([a,[a[0],.32,a[2]]],{c:P[lay[lj][2]],w:1.2,a:k===last?0:.3})});
    cur.forEach((x,j)=>{const [lj,a]=pos(x,j),c=P[lay[lj][2]],n=Math.min(9,2+x[4]);
      R.line([a,[a[0],.32,a[2]]],{c,w:1.4,a:.45*e});
      R.flow([a,[a[0],.32,a[2]]],{c,r:.08,n,a:e,speed:1.3});
      if(k!==last)R.label([a[0],(a[1]+.32)/2,a[2]],'×'+x[4],{mono:true,fs:12,dx:16,c,a:e})});
    if(k===last)R.label([0,yL(0),-1],per(mode)+' calls into PyTorch per step',{fs:13.5,b:1,dy:-16,c:P.ink,a:e});
  }
  const st=S3.stage({id:'stg-step',list:'sx-step-hf',fig:'Fig. 2 · one step, recorded call by call',cam:[.32,.2],bounds:[[-7,0,-1],[7,4.4,1]],aspect:.5,dur:1300,hold:4800,draw,
    // a step about one or two sockets: the camera moves in on them; setup and the whole step show everything
    view:k=>{const f=STEPS[mode][k],last=STEPS[mode].length-1;if(!f||k===last||(mode!=='plain'&&k===0))return null;const xs=[...new Set(keys(mode).filter(f).map(x=>SX(slot(x[3]))))];if(!xs.length)return null;
      const x0=Math.min(...xs),x1=Math.max(...xs);return {cam:[.3,.24],bounds:[[x0-3.4,0,-1],[x1+3.4,4.4,1]]}},
    margin:w=>w<520?[22,10,46,10]:[26,14,52,150]});
  const seg=document.getElementById('lib-step-mode');
  seg.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;mode=b.dataset.m;
    seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    ['plain','hf','pl'].forEach(m=>document.getElementById('sx-step-'+m).hidden=m!==mode);
    st.list('sx-step-'+mode)});
})();
