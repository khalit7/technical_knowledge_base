// ---- Animation: one batch of 32 tokens through one layer: dense FFN, top-2 with fixed buffers, top-2 with bias balancing ----
// The model is a pure function (rtaModel) so it can be checked outside the page.
function rtaModel(cf){
  const T=32,N=8,K=2,ITER=60,G=0.01,rnd=mulberry32(20261001),pop=[1.1,0,0,0.75,0,0,0.2,0];
  const gs=()=>{let u=0,v=0;while(!u)u=rnd();while(!v)v=rnd();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
  const S=[];for(let t=0;t<T;t++){const r=[];for(let e=0;e<N;e++)r.push(0.9*gs()+pop[e]);S.push(r)}
  const sig=S.map(r=>r.map(v=>1/(1+Math.exp(-v))));
  const pick=(t,b)=>[...Array(N).keys()].sort((x,y)=>(sig[t][y]+(b?b[y]:0))-(sig[t][x]+(b?b[x]:0))).slice(0,K);
  const picks=S.map((r,t)=>pick(t,null));
  const load=ps=>{const c=new Array(N).fill(0);ps.forEach(p=>p.forEach(e=>c[e]++));return c};
  const C=Math.round(cf*K*T/N);
  // fixed buffers: first choices claim slots in token order, then second choices
  const slot=[];const fill=new Array(N).fill(0);const kept=picks.map(()=>[true,true]);
  for(let r=0;r<K;r++)for(let t=0;t<T;t++){const e=picks[t][r];if(fill[e]<C){slot.push({t,e,r,i:fill[e]});fill[e]++}else{kept[t][r]=false;slot.push({t,e,r,i:-1})}}
  const dropped=slot.filter(x=>x.i<0).length,skipped=kept.filter(k=>!k[0]&&!k[1]).length,pad=fill.reduce((a,f)=>a+(C-f),0);
  // bias balancing, DeepSeek-V3 rule b_i <- b_i - gamma * sign(c_i - mean), on this batch repeated
  let b=new Array(N).fill(0);const traj=[{b:b.slice(),c:load(picks),p:picks}];const mean=K*T/N;
  for(let it=0;it<ITER;it++){const p=S.map((r,t)=>pick(t,b)),c=load(p);b=b.map((v,e)=>v-G*Math.sign(c[e]-mean));traj.push({b:b.slice(),c:load(S.map((r,t)=>pick(t,b))),p:S.map((r,t)=>pick(t,b))})}
  const fin=traj[traj.length-1];const changed=fin.p.reduce((a,p,t)=>a+p.filter(e=>!picks[t].includes(e)).length,0);
  const gate=(t,p)=>{const z=p.reduce((a,e)=>a+sig[t][e],0);return p.map(e=>sig[t][e]/z)};
  return {T,N,K,C,ITER,G,S,sig,picks,load0:load(picks),slot,kept,dropped,skipped,pad,traj,fin,changed,gate,mean}
}
(function(){
  const card=$('rta');if(!card)return;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const STEPS={dense:4,cap:7,bias:7},DUR=2600;
  const st={m:'cap',cf:1.25,k:0,t:RM?1:0,play:!RM,spd:1,vis:false,raf:0,last:0,lk:'',mod:null};
  const cl=v=>v<0?0:v>1?1:v,ease=v=>v<.5?2*v*v:1-2*(1-v)*(1-v);
  function model(){if(!st.mod||st.mod.cf!==st.cf){st.mod=rtaModel(st.cf);st.mod.cf=st.cf}return st.mod}
  const TITLE={dense:['The batch','A dense FFN: no router','Every token through the same weights','Tally'],
    cap:['The batch','The router scores and picks two experts per token','First choices fill the buffers','Second choices: overflow is dropped','Experts compute, padding included','Combine: weighted outputs return','Tally'],
    bias:['The batch','The router scores and picks two experts per token','Dropless dispatch: every assignment kept','Bias update, step by step','Balanced selection, unchanged gates','Experts compute ragged groups','Tally']};
  function caption(m,k,M){const hot=M.load0.indexOf(Math.max(...M.load0)),mx=Math.max(...M.load0);
    const c={dense:['32 tokens arrive at one layer, each a hidden state of width d<sub>model</sub>. The same 32 tokens and logits are used in all three runs.',
      'The block MoE replaced: one FFN, drawn here twice as wide as one expert so that each token costs the same FLOPs as top-2 over experts (an iso-FLOP comparison). Nothing to score, balance or drop.',
      'All 32 tokens multiply through the same weights: each weight byte read from memory serves all 32 tokens. Stored FFN weights: 2 expert-widths.',
      'Same compute per token as top-2 MoE, a quarter of the stored FFN capacity of the 8-expert layer, and no load-balance problem. What it lacks is the idle capacity that makes MoE better per FLOP.'],
     cap:['32 tokens arrive. The layer has 8 experts and keeps the top 2 per token, so the average expert receives 2 × 32 / 8 = 8 assignments. With capacity factor '+st.cf+', each expert gets a buffer of C = '+st.cf+' × 8 = '+M.C+' slots, fixed before routing.',
      'The router scores every expert for every token and keeps the two highest. Two experts are popular (the logits are illustrative): E'+(hot+1)+' is chosen '+mx+' times against an average of 8.',
      'Each token\'s first choice claims a slot in its expert\'s buffer, in token order. Hot experts are already filling up.',
      M.dropped?M.dropped+' assignments arrive at a full buffer and are dropped (orange). '+(M.skipped?M.skipped+' token'+(M.skipped>1?'s lose':' loses')+' both experts and will skip the FFN entirely.':'No token loses both of its experts at this capacity.'):'No buffer overflows at this capacity factor: every assignment fits.',
      'Each expert multiplies its whole buffer, filled or not: '+M.pad+' empty slots (hatched) are padding computed for nothing. Raising CF trades drops for padding.',
      'Outputs are weighted by the gates and summed back on each token. A dropped assignment contributes nothing; a token with both dropped passes through on the residual connection, a silently weaker forward pass.',
      'At CF '+st.cf+': '+M.dropped+' of 64 assignments dropped, '+M.pad+' padded slots. Switch the capacity factor to compare: 1.0 drops more, 2.0 drops less and pads more.'],
     bias:['The same 32 tokens and logits. No buffers this time: DeepSeek-V3 drops no tokens in training or inference.',
      'The same scores and picks as before: E'+(hot+1)+' gets '+mx+' assignments, the average is 8.',
      'Every assignment is kept, so hot experts simply receive more tokens. Nothing is dropped, but the busiest expert sets the layer\'s time, and on a GPU per expert it is the straggler everyone waits for.',
      'After each step every expert\'s bias moves by γ against its load: b<sub>i</sub> ← b<sub>i</sub> − γ · sign(c<sub>i</sub> − c̄). Overloaded experts\' biases fall, underloaded ones rise. The bars under the experts are the biases; the batch is replayed '+M.ITER+' times with γ = '+M.G+'.',
      'Selection now uses σ<sub>i</sub> + b<sub>i</sub>: '+M.changed+' assignments moved from a hot expert to a cooler one (green). The gate weight still uses σ<sub>i</sub> alone, so the bias never enters the gradient and adds no competing loss.',
      'Experts compute ragged token groups (grouped GEMM): no padding, no drops. The busiest expert now has '+Math.max(...M.fin.c)+' tokens instead of '+mx+'.',
      'Dropless and close to balanced, with no auxiliary loss. The price is the bias update in the training loop; V3 kept a tiny sequence-wise loss (α = 0.0001) only against extreme imbalance.']};
    return c[m][k]}
  function draw(){const M=model(),m=st.m,k=st.k,e=RM?1:ease(cl(st.t)),nS=STEPS[m];
    const W=Math.max(330,Math.min(760,card.clientWidth-28)),nar=W<560,cols=nar?16:32,tp=nar?(W-20)/16:(W-20)/32,ts=Math.min(14,tp-3);
    const rowsT=32/cols,yT=26,yR=yT+rowsT*tp+18,yE0=yR+44,sl=nar?9:11,colW=(W-20)/8,maxH=Math.max(16,...M.load0)+1,yB=yE0+maxH*sl,H=yB+(m==='bias'?90:34);
    let s='';const col={f:'var(--c1)',s:'var(--c4)',drop:'var(--bad)',chg:'var(--good)',pad:'var(--dim)'};
    s+='<text x="10" y="16" font-size="11" fill="var(--mute)">'+(nar?'32 tokens, 8 experts, top-2':'One batch: 32 tokens, 8 experts, top-2, drawn to scale (one square = one token-expert assignment)')+'</text>';
    // tokens
    const tx=t=>10+(t%cols)*tp,ty=t=>yT+Math.floor(t/cols)*tp;
    const skipped=t=>m==='cap'&&k>=3&&!M.kept[t][0]&&!M.kept[t][1];
    for(let t=0;t<32;t++){const x=tx(t),y=ty(t);let f='var(--ink)',op=.55;if(m==='cap'&&k>=5){op=skipped(t)?.15:.85}if(m==='dense'&&k>=2)op=.85;if(m==='bias'&&k>=5)op=.85;
      s+='<rect x="'+x+'" y="'+y+'" width="'+ts+'" height="'+ts+'" rx="2" fill="'+f+'" fill-opacity="'+op+'"'+(skipped(t)?' stroke="var(--bad)" stroke-width="1.5"':'')+'/>'}
    if(m==='dense'){const fx=W*0.25,fw=W*0.5,fy=yE0,fh=Math.min(maxH*sl,140);
      if(k>=1){s+=bx(fx,fy,fw,fh,'boxa',['one dense FFN','width = 2 experts'],12);
        if(k>=2){const n=Math.round(32*(k>2?1:e));for(let t=0;t<n;t++)s+='<line x1="'+(tx(t)+ts/2)+'" y1="'+(ty(t)+ts)+'" x2="'+(fx+fw*(t+0.5)/32)+'" y2="'+fy+'" stroke="var(--c1)" stroke-opacity=".35"/>'}}
    } else {
      // expert columns
      const bias=m==='bias',it=bias?(k<3?0:k===3?Math.round(M.ITER*e):M.ITER):0,tr=M.traj[it],sel=bias&&k>=4?M.fin.p:M.picks;
      const C=M.C;
      for(let x=0;x<8;x++){const cx=10+x*colW,w=colW-8;
        s+='<text x="'+(cx+w/2)+'" y="'+(yB+14)+'" font-size="11" text-anchor="middle" fill="var(--mute)">E'+(x+1)+'</text>';
        if(!bias&&k>=2){s+='<rect x="'+cx+'" y="'+(yB-C*sl)+'" width="'+w+'" height="'+(C*sl)+'" fill="none" stroke="var(--mute)" stroke-dasharray="3 2"/>'}
        if(!bias&&k>=4){const f=M.slot.filter(q=>q.e===x&&q.i>=0).length;for(let i=f;i<C;i++)s+='<rect x="'+(cx+1)+'" y="'+(yB-(i+1)*sl+1)+'" width="'+(w-2)+'" height="'+(sl-2)+'" fill="var(--dim)" fill-opacity=".35"/><path d="M'+(cx+2)+' '+(yB-i*sl-2)+'l'+(sl-4)+' -'+(sl-4)+'" stroke="var(--mute)" stroke-width=".8"/>'}
        if(bias&&k>=3){const bv=tr.b[x],bh=Math.max(-1,Math.min(1,bv/0.15))*14,y0=yB+40;s+='<rect x="'+(cx+w/2-6)+'" y="'+(bh>0?y0-bh:y0)+'" width="12" height="'+Math.max(0.5,Math.abs(bh))+'" fill="'+(bv<0?'var(--bad)':'var(--good)')+'"><title>b = '+bv.toFixed(2)+'</title></rect>';
          if(x===0)s+='<line x1="10" x2="'+(W-10)+'" y1="'+y0+'" y2="'+y0+'" stroke="var(--line)"/><text x="'+(W-10)+'" y="'+(yB+68)+'" font-size="10" text-anchor="end" fill="var(--mute)">bias b<tspan baseline-shift="sub" font-size="8">i</tspan> after '+it+' updates (green raised, red lowered)</text>'}}
      // assignments
      if(k>=1&&k<2){for(let t=0;t<32;t++)sel[t].forEach((x,r)=>{if(e>t/32)s+='<line x1="'+(tx(t)+ts/2)+'" y1="'+(ty(t)+ts)+'" x2="'+(10+x*colW+(colW-8)/2)+'" y2="'+(yE0-4)+'" stroke="'+(r?col.s:col.f)+'" stroke-opacity=".45"/>'})}
      if(!bias){const cnt=new Array(8).fill(0),over=new Array(8).fill(0);
        M.slot.forEach((q,j)=>{const ph=q.r===0?2:3;if(k<ph)return;if(k===ph&&e<=((j%32)/32))return;const cx=10+q.e*colW,w=colW-8;
          if(q.i>=0){s+='<rect x="'+(cx+1)+'" y="'+(yB-(q.i+1)*sl+1)+'" width="'+(w-2)+'" height="'+(sl-2)+'" rx="1.5" fill="'+(q.r?col.s:col.f)+'"'+(k>=5&&q.i>=0?'':'')+'/>';cnt[q.e]++}
          else{const o=over[q.e]++;s+='<rect x="'+(cx+1)+'" y="'+(yB-(C+o+1)*sl+1)+'" width="'+(w-2)+'" height="'+(sl-2)+'" rx="1.5" fill="'+col.drop+'" fill-opacity=".8"/>'}});
        if(k>=4)for(let x=0;x<8;x++)s+='<text x="'+(10+x*colW+(colW-8)/2)+'" y="'+(yB-C*sl-4-over[x]*sl)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+(over[x]?'−'+over[x]:'')+'</text>';
      } else if(k>=2){const cnt=new Array(8).fill(0);const P=k===3?tr.p:sel;
        for(let r=0;r<2;r++)for(let t=0;t<32;t++){const x=P[t][r];if(k===2&&e<=((r*32+t)/64))continue;const cx=10+x*colW,w=colW-8,i=cnt[x]++;
          const moved=k>=4&&!M.picks[t].includes(x);s+='<rect x="'+(cx+1)+'" y="'+(yB-(i+1)*sl+1)+'" width="'+(w-2)+'" height="'+(sl-2)+'" rx="1.5" fill="'+(moved?col.chg:(r?col.s:col.f))+'"/>'}
        s+='<line x1="10" x2="'+(W-10)+'" y1="'+(yB-M.mean*sl)+'" y2="'+(yB-M.mean*sl)+'" stroke="var(--ink)" stroke-dasharray="5 3" stroke-opacity=".6"/><text x="'+(W-10)+'" y="'+(yB-M.mean*sl-4)+'" font-size="10" text-anchor="end" fill="var(--mute)">mean load 8</text>'}
      if(k>=1)s+=bx(W*0.3,yR,W*0.4,26,'boxa',['router: top-2 of 8'+(bias&&k>=4?' on σ + b':'')],11.5);
    }
    // legend
    const leg=m==='dense'?[['var(--c1)','token to the FFN']]:m==='cap'?[[col.f,'first choice'],[col.s,'second choice'],[col.drop,'dropped'],['var(--dim)','padding']]:[[col.f,'first choice'],[col.s,'second choice'],[col.chg,'moved by the bias']];
    let lx=10;const ly=H-6;leg.forEach(([c,l])=>{s+='<rect x="'+lx+'" y="'+(ly-9)+'" width="10" height="10" rx="2" fill="'+c+'"/><text x="'+(lx+14)+'" y="'+ly+'" font-size="10.5" fill="var(--mute)">'+l+'</text>';lx+=l.length*5.8+28});
    $('rtaSvg').innerHTML=svgEl(W,H+4,s,'Routing animation, step '+(k+1)+' of '+nS);
    const key=m+k+st.cf;if(st.lk!==key){$('rtaStep').textContent='Step '+(k+1)+' of '+nS+': '+TITLE[m][k];$('rtaCap').innerHTML=caption(m,k,M);st.lk=key}
    // counters
    const done=e>=1;let c;
    if(m==='dense')c=[['Stored FFN weights','2 expert-widths','one FFN'],['FLOPs per token','2 units','same as top-2'],['Token passes',k>=2?'32':'0','all through one FFN'],['Dropped','0','nothing to drop']];
    else if(m==='cap'){const sh=k>=3?M.dropped:0;c=[['Stored FFN weights','8 expert-widths','4x the dense block'],['FLOPs per token','2 units','2 experts of 1'],['Buffer per expert',M.C+' slots','CF '+st.cf+' × 8'],['Dropped assignments',sh+' of 64',(k>=3?M.skipped:0)+' tokens skip the FFN'],['Padded slots',k>=4?String(M.pad):'0','computed for nothing'],['Busiest expert',k>=3?Math.min(M.C,Math.max(...M.load0))+' / '+M.C:'not yet','slots used, capped at C']]}
    else{const it=k<3?0:k===3?Math.round(M.ITER*e):M.ITER,cc=M.traj[it].c,mx=Math.max(...cc);c=[['Stored FFN weights','8 expert-widths','4x the dense block'],['FLOPs per token','2 units','2 experts of 1'],['Dropped','0','dropless'],['Bias updates',String(it),'γ = '+M.G],['Busiest expert',mx+' tokens',(mx/8).toFixed(2)+'x the mean of 8'],['Moved assignments',k>=4?String(M.changed):'0','σ + b reselected']]}
    $('rtaCnt').innerHTML=c.map(x=>stat(x[0],x[1],x[2])).join('');
    const sc=$('rtaScrub');sc.max=nS*100;sc.value=Math.round((k+cl(st.t))*100);
    const pb=$('rtaPlay'),end=k===nS-1&&st.t>=1;pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play');
    $('rtaCfL').style.visibility=m==='cap'?'visible':'hidden';
  }
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;const nS=STEPS[st.m];
    st.t+=dt*st.spd/(st.m==='bias'&&st.k===3?DUR*2:DUR);if(st.t>=1){if(st.k<nS-1){st.k++;st.t=0}else{st.t=1;st.play=false}}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  $('rtaPlay').addEventListener('click',()=>{const nS=STEPS[st.m];if(st.play){pause()}else{if(st.k===nS-1&&st.t>=1){st.k=0;st.t=0}else if(st.t>=1&&st.k<nS-1){st.k++;st.t=0}st.play=true;st.last=0;kick()}draw()});
  $('rtaFwd').addEventListener('click',()=>{pause();st.k=Math.min(STEPS[st.m]-1,st.k+(st.t>=1?1:0));st.t=1;draw()});
  $('rtaBack').addEventListener('click',()=>{pause();st.k=Math.max(0,st.k-1);st.t=1;draw()});
  $('rtaScrub').addEventListener('input',e=>{pause();const v=+e.target.value,nS=STEPS[st.m];st.k=Math.min(nS-1,Math.floor(v/100));st.t=v>=nS*100?1:cl(v/100-st.k);draw()});
  $('rtaSpd').addEventListener('change',e=>{st.spd=+e.target.value});
  $('rtaCf').addEventListener('change',e=>{st.cf=+e.target.value;st.lk='';draw()});
  const seg=$('rtaM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;st.k=0;st.t=RM?1:0;st.lk='';if(!RM)st.play=true;draw();kick()}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.15}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  let rw=card.clientWidth;addEventListener('resize',()=>{const w=card.clientWidth;if(Math.abs(w-rw)>30){rw=w;draw()}});
  onTab('t-read',()=>{draw();kick()});
  draw();
})();
