// ---- Optimiser race tab: exact update rules on five 2-D surfaces, animated ----
(function(){
  const card=document.getElementById('rc-card');if(!card)return;
  const E=OPTE,LR=window.RACE_LR;
  const COL={gd:'#8a8a8a',mom:'#3f7f56',nes:'#2aa198',adagrad:'#b8983a',rmsprop:'#d4801f',adam:'#2f6fb5',adamw:'#5b8ff0',lion:'#c0392b',shampoo:'#8a5cb8',soap:'#d55ca8',muon:'#e8915c',sfsgd:'#6b8e23',sfadamw:'#20a3c9'};
  const DEF={ravine:['gd','mom','nes','adam','rmsprop'],rotated:['nes','adagrad','rmsprop','adam','shampoo'],rosen:['gd','mom','adam','lion'],saddle:['gd','mom','adam','rmsprop'],noisy:['gd','adam','sfsgd','sfadamw']};
  const TRY={ravine:'Plain SGD crawls along the valley floor because a rate small enough for the steep direction is tiny for the shallow one. Momentum and Nesterov build speed along the floor; AdaGrad and RMSProp rescale each axis and reach 10⁻³ in 15 steps. Then switch to the rotated ravine.',
    rotated:'The same valley turned 45°. Per-coordinate methods (AdaGrad, RMSProp) lose their advantage, because the steep direction is no longer a coordinate; Shampoo, which keeps a full 2 × 2 preconditioner, is unaffected and lands in the same 24 steps as before. Plain SGD, momentum and Nesterov do not care about rotation at all.',
    rosen:'A curved valley: the direction to the minimum changes all the way along it. Momentum (tuned) gets to 10⁻³ in 174 steps, Adam in 406; plain SGD is still far away after 1,200. Lion\'s fixed-size sign steps zig-zag; give it a cosine schedule.',
    saddle:'The start sits 0.001 off a ridge where the gradient across it is almost zero. Plain SGD needs 15 steps to leave (the offset grows by (1 + lr) per step); Adam, AdaGrad and RMSProp leave on the first step, because they divide that tiny gradient by its own size.',
    noisy:'With noisy gradients a constant rate stalls at a noise floor whose height grows with the rate. Switch the schedule to cosine or WSD and watch the loss fall below the floor at the end; the schedule-free optimisers get there without a schedule by averaging their iterates.'};
  let sk='ravine',sel=new Set(DEF.ravine),mul=1,sch='const',seed=1,runs={},F=100;
  const cv=document.getElementById('rc-cv'),lp=document.getElementById('rc-loss'),leg=document.getElementById('rc-leg'),note=document.getElementById('rc-note'),cap=document.getElementById('rc-cap');
  function css(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim()||'#888'}
  function hex(c){c=c.replace('#','');if(c.length===3)c=c.split('').map(x=>x+x).join('');return[parseInt(c.slice(0,2),16),parseInt(c.slice(2,4),16),parseInt(c.slice(4,6),16)]}
  function compute(){runs={};const sf=E.S[sk];for(const ok of sel){runs[ok]=E.run(sk,ok,LR[sk][ok]*mul,{sched:sch,seed})}}
  let bg=null,bgKey='';
  function geom(){const sf=E.S[sk],b=sf.box,ar=(b[3]-b[2])/(b[1]-b[0]);const avail=RD.width(cv.parentNode);let W=avail,H=W*ar;if(H>440){H=440;W=H/ar}return{W:Math.round(W),H:Math.round(H),b}}
  function background(g){const key=sk+g.W+'x'+g.H+matchMedia('(prefers-color-scheme: dark)').matches;if(key===bgKey)return bg;
    const sf=E.S[sk],b=g.b,c0=hex(css('--bg')),c1=hex(css('--acc2')),c2=hex(css('--dim'));const img=new ImageData(g.W,g.H);
    let lo=Infinity,hi=-Infinity;const val=new Float32Array(g.W*g.H);
    for(let j=0;j<g.H;j++)for(let i=0;i<g.W;i++){const x=b[0]+(i+0.5)/g.W*(b[1]-b[0]),y=b[3]-(j+0.5)/g.H*(b[3]-b[2]);const v=Math.log10(Math.max(sf.f(x,y),1e-6));val[j*g.W+i]=v;lo=Math.min(lo,v);hi=Math.max(hi,v)}
    for(let k=0;k<val.length;k++){const u=(val[k]-lo)/(hi-lo);const band=Math.floor(val[k]*2);const odd=band%2===0?0:0.18;const t=Math.min(1,u*0.85+odd*0.5);
      const c=[0,1,2].map(q=>Math.round(c0[q]+(c1[q]-c0[q])*t));img.data[4*k]=c[0];img.data[4*k+1]=c[1];img.data[4*k+2]=c[2];img.data[4*k+3]=255}
    // contour lines every half decade
    for(let j=1;j<g.H;j++)for(let i=1;i<g.W;i++){const k=j*g.W+i;const a=Math.floor(val[k]*2),l=Math.floor(val[k-1]*2),u=Math.floor(val[k-g.W]*2);if(a!==l||a!==u){img.data[4*k]=c2[0];img.data[4*k+1]=c2[1];img.data[4*k+2]=c2[2]}}
    bg=img;bgKey=key;return img}
  function draw(i){const g=geom();if(cv.width!==g.W||cv.height!==g.H){cv.width=g.W;cv.height=g.H}cv.style.width=g.W+'px';cv.style.height=g.H+'px';
    const ctx=cv.getContext('2d');ctx.putImageData(background(g),0,0);const b=g.b,sf=E.S[sk];
    const X=x=>(x-b[0])/(b[1]-b[0])*g.W,Y=y=>(b[3]-y)/(b[3]-b[2])*g.H;
    const T=sf.steps,t=Math.round(T*i/(F-1));
    // minima and start
    const mins={ravine:[[1,0.6]],rotated:[[1,0.6]],rosen:[[1,1]],saddle:[[0,1],[0,-1]],noisy:[[1,0.6]]}[sk];
    ctx.fillStyle=css('--ink');mins.forEach(m=>{ctx.beginPath();ctx.moveTo(X(m[0]),Y(m[1])-6);ctx.lineTo(X(m[0])+5,Y(m[1])+4);ctx.lineTo(X(m[0])-5,Y(m[1])+4);ctx.closePath();ctx.fill()});
    ctx.beginPath();ctx.arc(X(sf.start[0]),Y(sf.start[1]),4,0,7);ctx.strokeStyle=css('--ink');ctx.lineWidth=1.5;ctx.stroke();
    for(const ok of sel){const r=runs[ok];if(!r)continue;ctx.strokeStyle=COL[ok];ctx.lineWidth=2;ctx.beginPath();let last=null;
      for(let s=0;s<=t;s++){const x=r.xs[s],y=r.ys[s];if(!isFinite(x))break;const px=Math.max(-50,Math.min(g.W+50,X(x))),py=Math.max(-50,Math.min(g.H+50,Y(y)));s?ctx.lineTo(px,py):ctx.moveTo(px,py);last=[px,py]}
      ctx.stroke();if(last){ctx.fillStyle=COL[ok];ctx.beginPath();ctx.arc(last[0],last[1],4.5,0,7);ctx.fill()}}
    lossPlot(t);legend(t);
    cap.innerHTML='<div class="t">Step '+t+' of '+T+'</div><p>'+sf.note+(sch!=='const'?' Schedule: '+(sch==='cosine'?'cosine to zero':'WSD, 1−sqrt cooldown over the last 20%')+' (schedule-free optimisers ignore it).':'')+'</p>'}
  function lossPlot(t){const sf=E.S[sk],T=sf.steps,W=RD.width(lp.parentNode),H=190,ml=44,mr=18,mt=8,mb=24;let lo=Infinity,hi=-Infinity;
    for(const ok of sel){const r=runs[ok];for(let s=0;s<=T;s++){const v=r.ls[s];if(isFinite(v)&&v>0){lo=Math.min(lo,Math.log10(v));hi=Math.max(hi,Math.log10(v))}}}
    lo=Math.max(Math.floor(lo),-12);hi=Math.ceil(hi);if(hi<=lo)hi=lo+1;const x=s=>ml+s/T*(W-ml-mr),y=v=>mt+(hi-Math.max(lo,Math.log10(Math.max(v,1e-300))))/(hi-lo)*(H-mt-mb);
    let s='';const step=Math.max(1,Math.ceil((hi-lo)/6));for(let e=lo;e<=hi;e+=step){s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y(Math.pow(10,e))+'" y2="'+y(Math.pow(10,e))+'" stroke="var(--line)"/><text x="'+(ml-4)+'" y="'+(y(Math.pow(10,e))+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">1e'+e+'</text>'}
    [0,0.25,0.5,0.75,1].forEach(f=>{s+='<text x="'+x(f*T)+'" y="'+(H-7)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+Math.round(f*T)+'</text>'});
    for(const ok of sel){const r=runs[ok];let d='';for(let q=0;q<=t;q++){const v=r.ls[q];if(!isFinite(v))break;d+=(q?'L':'M')+x(q).toFixed(1)+','+y(v).toFixed(1)}s+='<path d="'+d+'" fill="none" stroke="'+COL[ok]+'" stroke-width="1.8"/>'}
    s+='<text x="'+(ml+4)+'" y="'+(mt+10)+'" font-size="10.5" fill="var(--mute)">loss (log scale)</text>';
    lp.setAttribute('viewBox','0 0 '+W+' '+H);lp.setAttribute('width',W);lp.setAttribute('height',H);lp.innerHTML=s}
  function legend(t){let h='<table><thead><tr><th>Optimiser</th><th class="num">rate</th><th class="num">loss now</th><th class="num">first step below 10⁻³</th><th>state per parameter</th></tr></thead><tbody>';
    for(const ok of sel){const r=runs[ok],o=E.O[ok];const lr=LR[sk][ok]*mul;let fst=null;for(let s=0;s<=r.T;s++)if(r.ls[s]<1e-3){fst=s;break}
      const v=r.ls[Math.min(t,r.T)];h+='<tr><td><i style="display:inline-block;width:12px;height:3px;background:'+COL[ok]+';vertical-align:middle;margin-right:5px"></i>'+o.name+'<br><span class="mute small">'+o.src+'</span></td><td class="num">'+lr.toPrecision(3)+'</td><td class="num">'+(isFinite(v)?v.toExponential(2):'diverged')+'</td><td class="num">'+(r.diverged?'diverged':fst===null?'not reached':fst)+'</td><td class="small">'+o.state+'</td></tr>'}
    leg.innerHTML=h+'</tbody></table>'}
  // controls
  const sseg=document.getElementById('rc-surf');sseg.innerHTML=Object.keys(E.S).map(k=>'<button data-v="'+k+'"'+(k===sk?' class="on"':'')+'>'+E.S[k].name+'</button>').join('');
  const pick=document.getElementById('rc-pick');
  function drawPick(){pick.innerHTML=Object.keys(E.O).map(k=>'<label class="'+(sel.has(k)?'on':'')+'"><input type="checkbox" data-k="'+k+'"'+(sel.has(k)?' checked':'')+'><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:'+COL[k]+'"></i>'+E.O[k].name+'</label>').join('');
    pick.querySelectorAll('input').forEach(c=>c.addEventListener('change',()=>{c.checked?sel.add(c.dataset.k):sel.delete(c.dataset.k);c.parentNode.classList.toggle('on',c.checked);restart()}))}
  const mr=document.getElementById('rc-mul'),mo=document.getElementById('rc-mulv'),sd=document.getElementById('rc-seed'),sdl=document.getElementById('rc-seedl');
  let an;
  function restart(){compute();note.innerHTML=TRY[sk];sdl.style.display=E.S[sk].noise?'':'none';an.reset(F);an.go(F-1);an.play()}
  sseg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{sk=b.dataset.v;sel=new Set(DEF[sk]);sseg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));drawPick();restart()}));
  document.querySelectorAll('#rc-sch button').forEach(b=>b.addEventListener('click',()=>{sch=b.dataset.v;document.querySelectorAll('#rc-sch button').forEach(x=>x.classList.toggle('on',x===b));restart()}));
  mr.addEventListener('input',()=>{mul=Math.pow(10,+mr.value/8);mo.textContent='× '+(mul>=1?mul.toPrecision(3):mul.toPrecision(2));restart()});
  sd.addEventListener('change',()=>{seed=+sd.value;restart()});
  compute();drawPick();note.innerHTML=TRY[sk];sdl.style.display='none';
  an=RD.anim({card:'rc-card',ctl:'rc-ctl',n:F,ms:70,draw,label:'Step'});
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-race']=window.TAB_RENDER['t-race']||[]).push(()=>{bgKey='';an.redraw()});
  addEventListener('resize',()=>{if(!card.offsetParent)return;bgKey='';an.redraw()});
})();
